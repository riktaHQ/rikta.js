/**
 * QueueProvider - Main provider for queue lifecycle management
 * 
 * Implements OnProviderInit and OnProviderDestroy for Rikta lifecycle integration.
 * Not @Injectable - use createQueueProvider() factory function.
 */

import type { OnProviderInit, OnProviderDestroy } from '@riktajs/core';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { 
  QUEUE_PROVIDER, 
  QUEUE_SERVICE,
  getQueueToken, 
  getWorkerToken 
} from '../constants.js';
import type { 
  QueueProviderOptions, 
  QueueConfig, 
  ProcessorOptions,
  EventHandlerMeta,
} from '../types.js';
import { loadQueueConfig } from '../config/queue.config.js';
import { RedisConnectionManager, QueueConnectionError } from '../utils/connection.js';
import { getProcessorOptions, isProcessor } from '../decorators/processor.decorator.js';
import { getJobHandlers } from '../decorators/process.decorator.js';
import { getEventHandlers } from '../decorators/events.decorator.js';
import { publishQueueEvent, QueueEventName } from '../events/queue-events.js';
import { QueueService } from '../services/queue.service.js';

/** Registered queue info */
interface RegisteredQueue {
  name: string;
  queue: Queue;
  queueEvents?: QueueEvents;
}

/** Registered worker info */
interface RegisteredWorker {
  queueName: string;
  worker: Worker;
  processor: object;
  processorClass: Function;
}

/**
 * QueueProvider manages the lifecycle of all queues and workers.
 * 
 * @example
 * ```typescript
 * const provider = createQueueProvider({
 *   config: { redis: { host: 'localhost', port: 6379 } }
 * });
 * 
 * // In Rikta bootstrap:
 * await app.register(provider);
 * ```
 */
export class QueueProvider implements OnProviderInit, OnProviderDestroy {
  private connectionManager = new RedisConnectionManager();
  private config!: QueueConfig;
  private queues = new Map<string, RegisteredQueue>();
  private workers = new Map<string, RegisteredWorker>();
  private processorClasses: Function[] = [];
  private initialized = false;
  private eventBus: unknown = null;

  private options: QueueProviderOptions = {
    autoInitialize: true,
    retryAttempts: 0,
    retryDelay: 3000,
  };

  /**
   * Configure the provider with options
   */
  configure(options: QueueProviderOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Register processor classes for auto-discovery
   */
  registerProcessors(...processors: Function[]): this {
    this.processorClasses.push(...processors);
    return this;
  }

  /**
   * Set EventBus for event emission (optional)
   */
  setEventBus(eventBus: unknown): this {
    this.eventBus = eventBus;
    return this;
  }

  /**
   * Initialize all queues and workers (called by Rikta lifecycle)
   */
  async onProviderInit(): Promise<void> {
    console.log('🚀 Queue: Initializing queue system...');

    try {
      // Load configuration
      this.config = loadQueueConfig(this.options.config as Parameters<typeof loadQueueConfig>[0]);

      // Configure Redis connection
      this.connectionManager.configure(this.config.redis);

      // Test connection
      await this.testConnection();

      // Discover and register processors
      await this.discoverAndRegisterProcessors();

      // Register in container
      this.registerInContainer();

      this.initialized = true;
      console.log(`✅ Queue: Initialized ${this.queues.size} queue(s), ${this.workers.size} worker(s)`);
    } catch (error) {
      console.error('❌ Queue: Failed to initialize queue system');
      throw error;
    }
  }

  /**
   * Gracefully shutdown all workers and close connections
   */
  async onProviderDestroy(): Promise<void> {
    if (!this.initialized) return;

    console.log('🔌 Queue: Shutting down queue system...');

    try {
      const timeout = this.config.shutdownTimeout || 30000;

      // Close all workers gracefully
      const workerClosePromises = Array.from(this.workers.values()).map(
        async ({ worker, queueName }) => {
          console.log(`  ⏳ Closing worker for ${queueName}...`);
          await Promise.race([
            worker.close(),
            this.delay(timeout),
          ]);
        }
      );

      await Promise.all(workerClosePromises);

      // Close all queue event listeners
      for (const { queueEvents } of this.queues.values()) {
        if (queueEvents) {
          await queueEvents.close();
        }
      }

      // Close all queues
      for (const { queue } of this.queues.values()) {
        await queue.close();
      }

      // Close Redis connection
      await this.connectionManager.close();

      this.initialized = false;
      console.log('✅ Queue: Queue system shut down');
    } catch (error) {
      console.error('❌ Queue: Error during shutdown:', error);
    }
  }

  /**
   * Get a queue by name
   */
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name)?.queue;
  }

  /**
   * Get all registered queues
   */
  getAllQueues(): Queue[] {
    return Array.from(this.queues.values()).map(q => q.queue);
  }

  /**
   * Check if the provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get configuration
   */
  getConfig(): QueueConfig {
    return this.config;
  }

  // --- Private methods ---

  private async testConnection(): Promise<void> {
    const client = this.connectionManager.getClient();
    
    const { retryAttempts = 0, retryDelay = 3000 } = this.options;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        await client.ping();
        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryAttempts) {
          console.warn(`⚠️ Queue: Connection attempt ${attempt + 1}/${retryAttempts + 1} failed. Retrying in ${retryDelay}ms...`);
          await this.delay(retryDelay);
        }
      }
    }

    throw new QueueConnectionError(
      `Failed to connect to Redis: ${lastError?.message}`,
      this.config.redis.host,
      this.config.redis.port,
      lastError
    );
  }

  private async discoverAndRegisterProcessors(): Promise<void> {
    for (const processorClass of this.processorClasses) {
      if (!isProcessor(processorClass)) {
        console.warn(`⚠️ Queue: ${processorClass.name} is not decorated with @Processor, skipping`);
        continue;
      }

      const options = getProcessorOptions(processorClass);
      if (!options) continue;

      await this.registerProcessor(processorClass, options);
    }
  }

  private async registerProcessor(
    processorClass: Function,
    options: ProcessorOptions
  ): Promise<void> {
    const { queueName, concurrency, rateLimiter, workerOptions } = options;

    // Create queue if not exists
    if (!this.queues.has(queueName)) {
      await this.createQueue(queueName);
    }

    // Get job handlers
    const jobHandlers = getJobHandlers(processorClass);
    const eventHandlers = getEventHandlers(processorClass);

    // Create processor instance
    const processor = new (processorClass as new () => object)();

    // Create worker
    const worker = new Worker(
      queueName,
      async (job) => {
        // Find handler for this job
        const handler = jobHandlers.find(h => h.name === job.name);
        if (!handler) {
          throw new Error(`No handler found for job: ${job.name}`);
        }

        // Call handler method
        const method = (processor as Record<string, Function>)[handler.methodName];
        if (typeof method !== 'function') {
          throw new Error(`Handler method ${handler.methodName} not found`);
        }

        return method.call(processor, job);
      },
      {
        connection: this.connectionManager.getClient(),
        concurrency: concurrency || this.config.defaultConcurrency || 1,
        limiter: rateLimiter || this.config.defaultRateLimiter,
        ...workerOptions,
      }
    );

    // Attach event handlers
    this.attachWorkerEvents(worker, queueName, processor, eventHandlers);

    // Store worker
    this.workers.set(queueName, {
      queueName,
      worker,
      processor,
      processorClass,
    });

    console.log(`  📦 Registered processor for queue: ${queueName} (${jobHandlers.length} handlers)`);
  }

  private async createQueue(name: string): Promise<void> {
    const queue = new Queue(name, {
      connection: this.connectionManager.getClient(),
    });

    // Create queue events for monitoring
    const queueEvents = new QueueEvents(name, {
      connection: this.connectionManager.getClient(),
    });

    this.queues.set(name, { name, queue, queueEvents });
  }

  private attachWorkerEvents(
    worker: Worker,
    queueName: string,
    processor: object,
    eventHandlers: EventHandlerMeta[]
  ): void {
    worker.on('completed', async (job, result) => {
      await this.handleEvent('job:completed', queueName, processor, eventHandlers, job, result);
    });

    worker.on('failed', async (job, error) => {
      await this.handleEvent('job:failed', queueName, processor, eventHandlers, job, error);
    });

    worker.on('progress', async (job, progress) => {
      await this.handleEvent('job:progress', queueName, processor, eventHandlers, job, progress);
    });

    worker.on('stalled', async (jobId) => {
      await this.handleEvent('job:stalled', queueName, processor, eventHandlers, jobId);
    });

    worker.on('ready', async () => {
      await this.handleEvent('worker:ready', queueName, processor, eventHandlers);
    });

    worker.on('error', async (error) => {
      await this.handleEvent('worker:error', queueName, processor, eventHandlers, error);
    });
  }

  private async handleEvent(
    event: QueueEventName,
    queueName: string,
    processor: object,
    eventHandlers: EventHandlerMeta[],
    ...args: unknown[]
  ): Promise<void> {
    // Call processor event handlers
    const handlers = eventHandlers.filter(h => h.event === event);
    for (const handler of handlers) {
      const method = (processor as Record<string, Function>)[handler.methodName];
      if (typeof method === 'function') {
        try {
          await method.call(processor, ...args);
        } catch (error) {
          console.error(`Error in event handler ${handler.methodName}:`, error);
        }
      }
    }

    // Emit to EventBus if available
    if (this.eventBus) {
      try {
        await publishQueueEvent(this.eventBus, event, queueName, ...args);
      } catch {
        // Ignore EventBus errors
      }
    }
  }

  private registerInContainer(): void {
    try {
      // Dynamic import to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Container } = require('@riktajs/core');
      const container = Container.getInstance();

      // Register provider
      container.registerValue(QUEUE_PROVIDER, this);

      // Register queues
      for (const [name, { queue }] of this.queues) {
        container.registerValue(getQueueToken(name), queue);
      }

      // Register workers
      for (const [name, { worker }] of this.workers) {
        container.registerValue(getWorkerToken(name), worker);
      }

      // Create and register QueueService
      const queueService = new QueueService(this);
      container.registerValue(QUEUE_SERVICE, queueService);
    } catch {
      // Container not available, skip registration
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a QueueProvider
 */
export function createQueueProvider(options?: QueueProviderOptions): QueueProvider {
  const provider = new QueueProvider();
  if (options) {
    provider.configure(options);
  }
  return provider;
}

/**
 * Error thrown when queue initialization fails
 */
export class QueueInitializationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'QueueInitializationError';
  }
}

/**
 * Error thrown when a duplicate queue is detected
 */
export class DuplicateQueueError extends Error {
  constructor(queueName: string) {
    super(`Duplicate queue registration: ${queueName}`);
    this.name = 'DuplicateQueueError';
  }
}

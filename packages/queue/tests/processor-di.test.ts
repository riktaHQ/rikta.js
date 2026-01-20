/**
 * Tests for Dependency Injection in Processors
 * 
 * This test verifies that @Autowired dependencies are properly resolved
 * when creating processor instances.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container, Injectable, Autowired } from '@riktajs/core';
import { Processor } from '../src/decorators/processor.decorator.js';
import { Process } from '../src/decorators/process.decorator.js';
import { 
  QueueProvider,
  createQueueProvider,
} from '../src/providers/queue.provider.js';

// Mock BullMQ to avoid Redis connection
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name) => ({
    name,
    add: vi.fn().mockResolvedValue({ id: '1' }),
    addBulk: vi.fn().mockResolvedValue([{ id: '1' }]),
    close: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn().mockResolvedValue(undefined),
    getJobCounts: vi.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
    getRepeatableJobs: vi.fn().mockResolvedValue([]),
    removeRepeatableByKey: vi.fn().mockResolvedValue(true),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    clean: vi.fn().mockResolvedValue([]),
    drain: vi.fn().mockResolvedValue(undefined),
    obliterate: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation((queueName, processor, options) => {
    const worker = {
      name: queueName,
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
    // Emit ready event
    setTimeout(() => {
      const readyHandler = (worker.on as any).mock.calls.find((c: any[]) => c[0] === 'ready');
      if (readyHandler) readyHandler[1]();
    }, 10);
    return worker;
  }),
  QueueEvents: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Redis connection
vi.mock('../src/utils/connection.js', () => ({
  RedisConnectionManager: vi.fn().mockImplementation(() => ({
    configure: vi.fn(),
    getClient: vi.fn().mockReturnValue({
      ping: vi.fn().mockResolvedValue('PONG'),
      quit: vi.fn().mockResolvedValue(undefined),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  QueueConnectionError: class QueueConnectionError extends Error {
    constructor(message: string, public host?: string, public port?: number, public cause?: Error) {
      super(message);
      this.name = 'QueueConnectionError';
    }
  },
}));

// Test Service
const EXAMPLE_SERVICE_TOKEN = Symbol('ExampleService');

@Injectable()
class ExampleService {
  getMessage(): string {
    return 'Hello from ExampleService';
  }
}

// Processor with @Autowired dependency
@Processor('test-queue')
class ProcessorWithDI {
  @Autowired(EXAMPLE_SERVICE_TOKEN)
  private exampleService!: ExampleService;

  @Process('test-job')
  async handleTestJob(): Promise<string> {
    return this.exampleService.getMessage();
  }

  getService(): ExampleService | undefined {
    return this.exampleService;
  }
}

describe('Processor Dependency Injection', () => {
  let container: Container;
  let provider: QueueProvider;

  beforeEach(() => {
    // Reset container for each test
    Container.reset();
    container = Container.getInstance();
    
    // Register the example service in the container
    container.register(ExampleService);
    container.registerValue(EXAMPLE_SERVICE_TOKEN, container.resolve(ExampleService));
  });

  afterEach(async () => {
    if (provider?.isInitialized()) {
      await provider.onProviderDestroy();
    }
    vi.clearAllMocks();
  });

  it('should resolve @Autowired dependencies in processors', async () => {
    provider = createQueueProvider({
      config: { redis: { host: 'localhost', port: 6379 } },
    });
    
    provider.registerProcessors(ProcessorWithDI);
    await provider.onProviderInit();

    // Get the processor instance from the provider's workers
    // We need to access the internal processor to verify DI worked
    const workers = (provider as any).workers as Map<string, { processor: ProcessorWithDI }>;
    const workerInfo = workers.get('test-queue');
    
    expect(workerInfo).toBeDefined();
    expect(workerInfo?.processor).toBeDefined();
    
    // This is the key assertion - the service should be injected
    const service = workerInfo?.processor.getService();
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ExampleService);
    expect(service?.getMessage()).toBe('Hello from ExampleService');
  });

  it('should allow processor to use injected services in job handlers', async () => {
    provider = createQueueProvider({
      config: { redis: { host: 'localhost', port: 6379 } },
    });
    
    provider.registerProcessors(ProcessorWithDI);
    await provider.onProviderInit();

    const workers = (provider as any).workers as Map<string, { processor: ProcessorWithDI }>;
    const workerInfo = workers.get('test-queue');
    
    // Call the job handler and verify it can use the injected service
    const result = await workerInfo?.processor.handleTestJob();
    expect(result).toBe('Hello from ExampleService');
  });
});

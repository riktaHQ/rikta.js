/**
 * Type definitions for @riktajs/queue
 */

import type { 
  QueueOptions as BullMQQueueOptions,
  WorkerOptions as BullMQWorkerOptions,
  JobsOptions,
  RepeatOptions,
} from 'bullmq';

/** Redis connection configuration */
export interface RedisConnectionOptions {
  /** Redis host */
  host?: string;
  /** Redis port */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis username */
  username?: string;
  /** Redis database number */
  db?: number;
  /** Enable TLS */
  tls?: boolean;
  /** Cluster mode configuration */
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
  };
}

/** Options for @Queue decorator */
export interface QueueDecoratorOptions {
  /** Queue name (required) */
  name: string;
  /** BullMQ queue options */
  options?: Omit<BullMQQueueOptions, 'connection'>;
  /** Default job options */
  defaultJobOptions?: JobsOptions;
}

/** Options for @Processor decorator */
export interface ProcessorOptions {
  /** The queue name to process */
  queueName: string;
  /** Worker concurrency */
  concurrency?: number;
  /** Rate limiter configuration */
  rateLimiter?: {
    /** Maximum jobs per duration */
    max: number;
    /** Duration in milliseconds */
    duration: number;
  };
  /** Additional BullMQ worker options */
  workerOptions?: Omit<BullMQWorkerOptions, 'connection' | 'concurrency' | 'limiter'>;
}

/** Metadata for a job handler method */
export interface JobHandlerMeta {
  /** Job name */
  name: string;
  /** Method name on the processor class */
  methodName: string;
  /** Validation schema (Zod) */
  schema?: unknown;
}

/** Queue event names */
export type QueueEventName =
  | 'job:added'
  | 'job:completed'
  | 'job:failed'
  | 'job:progress'
  | 'job:stalled'
  | 'job:delayed'
  | 'job:removed'
  | 'worker:ready'
  | 'worker:closed'
  | 'worker:error';

/** Metadata for an event handler method */
export interface EventHandlerMeta {
  /** Event name */
  event: QueueEventName;
  /** Method name on the processor class */
  methodName: string;
}

/** Event payload for queue events */
export interface QueueEventPayload<TData = unknown, TResult = unknown> {
  /** Queue name */
  queueName: string;
  /** Job ID */
  jobId: string;
  /** Job name */
  jobName: string;
  /** Job data */
  data: TData;
  /** Job return value (for completed events) */
  returnValue?: TResult;
  /** Number of attempts made */
  attemptsMade?: number;
  /** Error message (for failed events) */
  error?: string;
  /** Progress value (for progress events) */
  progress?: number | object;
  /** Timestamp */
  timestamp: number;
}

/** Options for adding a job */
export interface AddJobOptions extends JobsOptions {
  /** Deduplicate by this key */
  deduplicationKey?: string;
}

/** Repeat options for scheduled jobs */
export interface ScheduleOptions extends RepeatOptions {
  /** Job ID for the repeatable job */
  jobId?: string;
}

/** Queue configuration from environment/config */
export interface QueueConfig {
  /** Redis connection options */
  redis: RedisConnectionOptions;
  /** Default worker concurrency */
  defaultConcurrency?: number;
  /** Default rate limiter */
  defaultRateLimiter?: {
    max: number;
    duration: number;
  };
  /** Bull Board dashboard path */
  dashboardPath?: string;
  /** Enable dashboard (default: false in production) */
  dashboardEnabled?: boolean;
  /** Graceful shutdown timeout in ms */
  shutdownTimeout?: number;
}

/** Provider options for creating QueueProvider */
export interface QueueProviderOptions {
  /** Queue configuration */
  config?: Partial<QueueConfig>;
  /** Auto-initialize on provider init */
  autoInitialize?: boolean;
  /** Retry connection attempts */
  retryAttempts?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
}

/** Re-export useful BullMQ types */
export type { Job, Queue as BullQueue, Worker, QueueEvents } from 'bullmq';
export type { Redis } from 'ioredis';

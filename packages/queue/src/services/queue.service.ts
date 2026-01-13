/**
 * QueueService - Injectable service for adding jobs to queues
 */

import type { Job, JobsOptions, RepeatOptions } from 'bullmq';
import type { QueueProvider } from '../providers/queue.provider.js';
import type { AddJobOptions, ScheduleOptions } from '../types.js';

/**
 * Service for adding jobs to queues from anywhere in the application.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class NotificationService {
 *   @Autowired()
 *   private queueService!: QueueService;
 * 
 *   async sendNotification(userId: string, message: string) {
 *     await this.queueService.addJob('notifications', 'send', {
 *       userId,
 *       message,
 *     });
 *   }
 * }
 * ```
 */
export class QueueService {
  constructor(private readonly provider: QueueProvider) {}

  /**
   * Add a job to a queue
   * 
   * @param queueName - Name of the queue
   * @param jobName - Name of the job (matches @Process decorator)
   * @param data - Job payload data
   * @param options - Optional job options
   * @returns The created job
   */
  async addJob<TData = unknown, TResult = unknown>(
    queueName: string,
    jobName: string,
    data: TData,
    options?: AddJobOptions
  ): Promise<Job<TData, TResult>> {
    const queue = this.getQueueOrThrow(queueName);

    // Handle deduplication
    const jobOptions: JobsOptions = { ...options };
    if (options?.deduplicationKey) {
      jobOptions.jobId = options.deduplicationKey;
    }

    return queue.add(jobName, data, jobOptions) as Promise<Job<TData, TResult>>;
  }

  /**
   * Add multiple jobs to a queue in bulk
   * 
   * @param queueName - Name of the queue
   * @param jobs - Array of jobs to add
   * @returns Array of created jobs
   */
  async addJobs<TData = unknown, TResult = unknown>(
    queueName: string,
    jobs: Array<{ name: string; data: TData; options?: JobsOptions }>
  ): Promise<Job<TData, TResult>[]> {
    const queue = this.getQueueOrThrow(queueName);

    const bulkJobs = jobs.map(j => ({
      name: j.name,
      data: j.data,
      opts: j.options,
    }));

    return queue.addBulk(bulkJobs) as Promise<Job<TData, TResult>[]>;
  }

  /**
   * Add a delayed job
   * 
   * @param queueName - Name of the queue
   * @param jobName - Name of the job
   * @param data - Job payload data
   * @param delay - Delay in milliseconds
   * @param options - Optional job options
   */
  async addDelayedJob<TData = unknown, TResult = unknown>(
    queueName: string,
    jobName: string,
    data: TData,
    delay: number,
    options?: JobsOptions
  ): Promise<Job<TData, TResult>> {
    return this.addJob(queueName, jobName, data, { ...options, delay });
  }

  /**
   * Add a repeatable job (scheduled)
   * 
   * @param queueName - Name of the queue
   * @param jobName - Name of the job
   * @param data - Job payload data
   * @param repeat - Repeat options (cron pattern, interval, etc.)
   * @param options - Optional schedule options
   */
  async addRepeatableJob<TData = unknown, TResult = unknown>(
    queueName: string,
    jobName: string,
    data: TData,
    repeat: RepeatOptions,
    options?: ScheduleOptions
  ): Promise<Job<TData, TResult>> {
    const queue = this.getQueueOrThrow(queueName);

    return queue.add(jobName, data, {
      ...options,
      repeat,
      jobId: options?.jobId,
    }) as Promise<Job<TData, TResult>>;
  }

  /**
   * Remove a repeatable job
   * 
   * @param queueName - Name of the queue
   * @param jobName - Name of the job
   * @param repeat - The repeat options used when creating the job
   */
  async removeRepeatableJob(
    queueName: string,
    jobName: string,
    repeat: RepeatOptions
  ): Promise<boolean> {
    const queue = this.getQueueOrThrow(queueName);
    return queue.removeRepeatableByKey(`${jobName}:${JSON.stringify(repeat)}`);
  }

  /**
   * Get a job by ID
   * 
   * @param queueName - Name of the queue
   * @param jobId - Job ID
   */
  async getJob<TData = unknown, TResult = unknown>(
    queueName: string,
    jobId: string
  ): Promise<Job<TData, TResult> | undefined> {
    const queue = this.getQueueOrThrow(queueName);
    return queue.getJob(jobId) as Promise<Job<TData, TResult> | undefined>;
  }

  /**
   * Get queue statistics
   * 
   * @param queueName - Name of the queue
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const queue = this.getQueueOrThrow(queueName);

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused().then(p => (p ? 1 : 0)),
    ]);

    return { waiting, active, completed, failed, delayed, paused };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueOrThrow(queueName);
    await queue.pause();
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueOrThrow(queueName);
    await queue.resume();
  }

  /**
   * Clear all jobs from a queue
   * 
   * @param queueName - Name of the queue
   * @param status - Which jobs to clear (default: all)
   */
  async clearQueue(
    queueName: string,
    status?: 'completed' | 'failed' | 'delayed' | 'wait' | 'active'
  ): Promise<void> {
    const queue = this.getQueueOrThrow(queueName);

    if (status) {
      await queue.clean(0, 0, status);
    } else {
      await queue.obliterate({ force: true });
    }
  }

  /**
   * Get all queue names
   */
  getQueueNames(): string[] {
    return this.provider.getAllQueues().map(q => q.name);
  }

  private getQueueOrThrow(queueName: string) {
    const queue = this.provider.getQueue(queueName);
    if (!queue) {
      throw new QueueNotFoundError(queueName);
    }
    return queue;
  }
}

/**
 * Error thrown when a queue is not found
 */
export class QueueNotFoundError extends Error {
  constructor(queueName: string) {
    super(`Queue not found: ${queueName}`);
    this.name = 'QueueNotFoundError';
  }
}

/**
 * Error thrown when job validation fails
 */
export class JobValidationError extends Error {
  constructor(message: string, public readonly errors: unknown[]) {
    super(message);
    this.name = 'JobValidationError';
  }
}

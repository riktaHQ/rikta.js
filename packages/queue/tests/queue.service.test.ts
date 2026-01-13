/**
 * Tests for QueueService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueueService, QueueNotFoundError } from '../src/services/queue.service.js';
import type { QueueProvider } from '../src/providers/queue.provider.js';

// Mock queue
const mockQueue = {
  name: 'test-queue',
  add: vi.fn().mockResolvedValue({ id: '1', name: 'test-job', data: {} }),
  addBulk: vi.fn().mockResolvedValue([
    { id: '1', name: 'job1', data: {} },
    { id: '2', name: 'job2', data: {} },
  ]),
  getJob: vi.fn().mockResolvedValue({ id: '1', name: 'test-job', data: {} }),
  getWaitingCount: vi.fn().mockResolvedValue(5),
  getActiveCount: vi.fn().mockResolvedValue(2),
  getCompletedCount: vi.fn().mockResolvedValue(100),
  getFailedCount: vi.fn().mockResolvedValue(3),
  getDelayedCount: vi.fn().mockResolvedValue(1),
  isPaused: vi.fn().mockResolvedValue(false),
  pause: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  clean: vi.fn().mockResolvedValue([]),
  obliterate: vi.fn().mockResolvedValue(undefined),
  removeRepeatableByKey: vi.fn().mockResolvedValue(true),
};

// Mock provider
const mockProvider = {
  getQueue: vi.fn((name: string) => name === 'test-queue' ? mockQueue : undefined),
  getAllQueues: vi.fn().mockReturnValue([mockQueue]),
  isInitialized: vi.fn().mockReturnValue(true),
} as unknown as QueueProvider;

describe('QueueService', () => {
  let service: QueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QueueService(mockProvider);
  });

  describe('addJob', () => {
    it('should add a job to the queue', async () => {
      const job = await service.addJob('test-queue', 'send-email', { to: 'test@example.com' });
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        { to: 'test@example.com' },
        {}
      );
      expect(job).toBeDefined();
      expect(job.id).toBe('1');
    });

    it('should add a job with options', async () => {
      await service.addJob('test-queue', 'send-email', { to: 'test@example.com' }, {
        attempts: 3,
        backoff: 1000,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        { to: 'test@example.com' },
        { attempts: 3, backoff: 1000 }
      );
    });

    it('should use deduplicationKey as jobId', async () => {
      await service.addJob('test-queue', 'send-email', { to: 'test@example.com' }, {
        deduplicationKey: 'unique-123',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        { to: 'test@example.com' },
        { deduplicationKey: 'unique-123', jobId: 'unique-123' }
      );
    });

    it('should throw QueueNotFoundError for unknown queue', async () => {
      await expect(
        service.addJob('unknown-queue', 'job', {})
      ).rejects.toThrow(QueueNotFoundError);
    });
  });

  describe('addJobs', () => {
    it('should add multiple jobs in bulk', async () => {
      const jobs = await service.addJobs('test-queue', [
        { name: 'job1', data: { id: 1 } },
        { name: 'job2', data: { id: 2 } },
      ]);

      expect(mockQueue.addBulk).toHaveBeenCalledWith([
        { name: 'job1', data: { id: 1 }, opts: undefined },
        { name: 'job2', data: { id: 2 }, opts: undefined },
      ]);
      expect(jobs).toHaveLength(2);
    });

    it('should throw QueueNotFoundError for unknown queue', async () => {
      await expect(
        service.addJobs('unknown-queue', [{ name: 'job', data: {} }])
      ).rejects.toThrow(QueueNotFoundError);
    });
  });

  describe('addDelayedJob', () => {
    it('should add a delayed job', async () => {
      await service.addDelayedJob('test-queue', 'delayed-job', { data: 'test' }, 5000);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'delayed-job',
        { data: 'test' },
        { delay: 5000 }
      );
    });

    it('should merge delay with other options', async () => {
      await service.addDelayedJob('test-queue', 'delayed-job', { data: 'test' }, 5000, {
        attempts: 3,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'delayed-job',
        { data: 'test' },
        { attempts: 3, delay: 5000 }
      );
    });
  });

  describe('addRepeatableJob', () => {
    it('should add a repeatable job with cron', async () => {
      await service.addRepeatableJob('test-queue', 'cron-job', { data: 'test' }, {
        pattern: '0 0 * * *',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'cron-job',
        { data: 'test' },
        { repeat: { pattern: '0 0 * * *' }, jobId: undefined }
      );
    });

    it('should add a repeatable job with interval', async () => {
      await service.addRepeatableJob('test-queue', 'interval-job', { data: 'test' }, {
        every: 60000,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'interval-job',
        { data: 'test' },
        { repeat: { every: 60000 }, jobId: undefined }
      );
    });
  });

  describe('getJob', () => {
    it('should get a job by ID', async () => {
      const job = await service.getJob('test-queue', '1');
      
      expect(mockQueue.getJob).toHaveBeenCalledWith('1');
      expect(job).toBeDefined();
      expect(job?.id).toBe('1');
    });

    it('should throw QueueNotFoundError for unknown queue', async () => {
      await expect(
        service.getJob('unknown-queue', '1')
      ).rejects.toThrow(QueueNotFoundError);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats('test-queue');

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: 0,
      });
    });

    it('should throw QueueNotFoundError for unknown queue', async () => {
      await expect(
        service.getQueueStats('unknown-queue')
      ).rejects.toThrow(QueueNotFoundError);
    });
  });

  describe('pauseQueue', () => {
    it('should pause the queue', async () => {
      await service.pauseQueue('test-queue');
      expect(mockQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume the queue', async () => {
      await service.resumeQueue('test-queue');
      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('should clear specific job status', async () => {
      await service.clearQueue('test-queue', 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(0, 0, 'completed');
    });

    it('should obliterate all jobs when no status specified', async () => {
      await service.clearQueue('test-queue');
      expect(mockQueue.obliterate).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('getQueueNames', () => {
    it('should return all queue names', () => {
      const names = service.getQueueNames();
      expect(names).toEqual(['test-queue']);
    });
  });
});

describe('QueueNotFoundError', () => {
  it('should have correct name and message', () => {
    const error = new QueueNotFoundError('my-queue');
    expect(error.name).toBe('QueueNotFoundError');
    expect(error.message).toBe('Queue not found: my-queue');
  });
});

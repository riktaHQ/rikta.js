/**
 * Tests for queue events
 */

import { describe, it, expect, vi } from 'vitest';
import {
  QUEUE_EVENTS,
  getEventBusEventName,
  publishQueueEvent,
} from '../src/events/queue-events.js';

describe('Queue Events', () => {
  describe('QUEUE_EVENTS', () => {
    it('should have all event constants', () => {
      expect(QUEUE_EVENTS.JOB_ADDED).toBe('queue:job:added');
      expect(QUEUE_EVENTS.JOB_COMPLETED).toBe('queue:job:completed');
      expect(QUEUE_EVENTS.JOB_FAILED).toBe('queue:job:failed');
      expect(QUEUE_EVENTS.JOB_PROGRESS).toBe('queue:job:progress');
      expect(QUEUE_EVENTS.JOB_STALLED).toBe('queue:job:stalled');
      expect(QUEUE_EVENTS.JOB_DELAYED).toBe('queue:job:delayed');
      expect(QUEUE_EVENTS.JOB_REMOVED).toBe('queue:job:removed');
      expect(QUEUE_EVENTS.WORKER_READY).toBe('queue:worker:ready');
      expect(QUEUE_EVENTS.WORKER_CLOSED).toBe('queue:worker:closed');
      expect(QUEUE_EVENTS.WORKER_ERROR).toBe('queue:worker:error');
    });
  });

  describe('getEventBusEventName', () => {
    it('should map job:added to queue:job:added', () => {
      expect(getEventBusEventName('job:added')).toBe('queue:job:added');
    });

    it('should map job:completed to queue:job:completed', () => {
      expect(getEventBusEventName('job:completed')).toBe('queue:job:completed');
    });

    it('should map job:failed to queue:job:failed', () => {
      expect(getEventBusEventName('job:failed')).toBe('queue:job:failed');
    });

    it('should map job:progress to queue:job:progress', () => {
      expect(getEventBusEventName('job:progress')).toBe('queue:job:progress');
    });

    it('should map job:stalled to queue:job:stalled', () => {
      expect(getEventBusEventName('job:stalled')).toBe('queue:job:stalled');
    });

    it('should map worker:ready to queue:worker:ready', () => {
      expect(getEventBusEventName('worker:ready')).toBe('queue:worker:ready');
    });

    it('should map worker:error to queue:worker:error', () => {
      expect(getEventBusEventName('worker:error')).toBe('queue:worker:error');
    });
  });

  describe('publishQueueEvent', () => {
    it('should call eventBus.emit with correct event name', async () => {
      const mockEventBus = { emit: vi.fn().mockResolvedValue(undefined) };

      await publishQueueEvent(mockEventBus, 'job:completed', 'test-queue', {
        id: '123',
        name: 'test-job',
        data: { foo: 'bar' },
      }, { result: 'success' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'queue:job:completed',
        expect.objectContaining({
          queueName: 'test-queue',
          jobId: '123',
          jobName: 'test-job',
        })
      );
    });

    it('should handle missing eventBus gracefully', async () => {
      await expect(
        publishQueueEvent(null, 'job:completed', 'test-queue')
      ).resolves.toBeUndefined();
    });

    it('should handle eventBus without emit method', async () => {
      await expect(
        publishQueueEvent({}, 'job:completed', 'test-queue')
      ).resolves.toBeUndefined();
    });

    it('should include error message for failed events', async () => {
      const mockEventBus = { emit: vi.fn().mockResolvedValue(undefined) };
      const error = new Error('Job failed');

      await publishQueueEvent(mockEventBus, 'job:failed', 'test-queue', {
        id: '123',
        name: 'test-job',
        data: {},
      }, error);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'queue:job:failed',
        expect.objectContaining({
          error: 'Job failed',
        })
      );
    });

    it('should include progress for progress events', async () => {
      const mockEventBus = { emit: vi.fn().mockResolvedValue(undefined) };

      await publishQueueEvent(mockEventBus, 'job:progress', 'test-queue', {
        id: '123',
        name: 'test-job',
        data: {},
      }, 50);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'queue:job:progress',
        expect.objectContaining({
          progress: 50,
        })
      );
    });

    it('should handle stalled events with jobId string', async () => {
      const mockEventBus = { emit: vi.fn().mockResolvedValue(undefined) };

      await publishQueueEvent(mockEventBus, 'job:stalled', 'test-queue', 'job-123');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'queue:job:stalled',
        expect.objectContaining({
          jobId: 'job-123',
        })
      );
    });
  });
});

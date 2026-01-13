/**
 * Tests for QueueProvider
 * 
 * Note: These tests focus on provider logic that can be tested without real Redis connections.
 * Tests that would require actual Redis are marked as skipped.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'reflect-metadata';
import { 
  QueueProvider, 
  createQueueProvider,
  QueueInitializationError,
  DuplicateQueueError,
} from '../src/providers/queue.provider.js';
import { Processor } from '../src/decorators/processor.decorator.js';
import { Process } from '../src/decorators/process.decorator.js';
import { OnJobComplete } from '../src/decorators/events.decorator.js';

// Mock @riktajs/core Container
vi.mock('@riktajs/core', () => ({
  Container: {
    getInstance: vi.fn().mockReturnValue({
      registerValue: vi.fn(),
      get: vi.fn(),
    }),
  },
}));

describe('QueueProvider', () => {
  let provider: QueueProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new QueueProvider();
  });

  describe('configure', () => {
    it('should allow configuration chaining', () => {
      const result = provider.configure({
        config: { redis: { host: 'localhost', port: 6379 } },
      });
      expect(result).toBe(provider);
    });

    it('should accept retry options', () => {
      provider.configure({
        retryAttempts: 3,
        retryDelay: 5000,
      });
      // No error means success
    });

    it('should accept multiple config options', () => {
      provider.configure({
        retryAttempts: 3,
        retryDelay: 5000,
        config: {
          redis: { host: 'redis.example.com', port: 6380, password: 'secret' },
          defaultConcurrency: 10,
          shutdownTimeout: 60000,
        },
      });
      // Verify no error occurs
      expect(provider).toBeDefined();
    });
  });

  describe('registerProcessors', () => {
    it('should register processor classes', () => {
      @Processor('test-queue')
      class TestProcessor {
        @Process('test')
        async handle() {}
      }

      const result = provider.registerProcessors(TestProcessor);
      expect(result).toBe(provider);
    });

    it('should accept multiple processors', () => {
      @Processor('queue-1')
      class Processor1 {
        @Process('job1')
        async handle() {}
      }

      @Processor('queue-2')
      class Processor2 {
        @Process('job2')
        async handle() {}
      }

      const result = provider.registerProcessors(Processor1, Processor2);
      expect(result).toBe(provider);
    });

    it('should handle processors with event handlers', () => {
      @Processor('email-queue', { concurrency: 3 })
      class EmailProcessor {
        @Process('send')
        async handleSend() {}

        @OnJobComplete()
        async onComplete() {}
      }

      provider.registerProcessors(EmailProcessor);
      // No error means success
    });
  });

  describe('setEventBus', () => {
    it('should set event bus for event emission', () => {
      const mockEventBus = { emit: vi.fn() };
      const result = provider.setEventBus(mockEventBus);
      expect(result).toBe(provider);
    });

    it('should accept undefined to clear event bus', () => {
      const mockEventBus = { emit: vi.fn() };
      provider.setEventBus(mockEventBus);
      const result = provider.setEventBus(undefined as any);
      expect(result).toBe(provider);
    });
  });

  describe('isInitialized', () => {
    it('should return false before init', () => {
      expect(provider.isInitialized()).toBe(false);
    });
  });

  describe('getQueue before init', () => {
    it('should return undefined when not initialized', () => {
      expect(provider.getQueue('any-queue')).toBeUndefined();
    });
  });

  describe('getAllQueues before init', () => {
    it('should return empty array when not initialized', () => {
      expect(provider.getAllQueues()).toEqual([]);
    });
  });
});

describe('createQueueProvider', () => {
  it('should create a new QueueProvider', () => {
    const provider = createQueueProvider();
    expect(provider).toBeInstanceOf(QueueProvider);
  });

  it('should apply options if provided', () => {
    const provider = createQueueProvider({
      retryAttempts: 5,
      config: { redis: { host: 'custom-host' } },
    });
    expect(provider).toBeInstanceOf(QueueProvider);
  });

  it('should create provider with all options', () => {
    const provider = createQueueProvider({
      retryAttempts: 3,
      retryDelay: 1000,
      config: {
        redis: { host: 'localhost', port: 6379 },
        defaultConcurrency: 5,
        shutdownTimeout: 30000,
      },
    });
    expect(provider).toBeInstanceOf(QueueProvider);
  });
});

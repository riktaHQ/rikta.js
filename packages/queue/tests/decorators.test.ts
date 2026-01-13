/**
 * Tests for decorators
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Queue, getQueueOptions, isQueue, QueueDecoratorError } from '../src/decorators/queue.decorator.js';
import { Processor, getProcessorOptions, isProcessor, ProcessorDecoratorError } from '../src/decorators/processor.decorator.js';
import { Process, getJobHandlers, isJobHandler } from '../src/decorators/process.decorator.js';
import { 
  OnJobComplete, 
  OnJobFailed, 
  OnJobProgress, 
  OnJobStalled,
  getEventHandlers,
  getEventHandlersFor,
} from '../src/decorators/events.decorator.js';

describe('Decorators', () => {
  describe('@Queue', () => {
    it('should store queue options metadata', () => {
      @Queue({ name: 'test-queue' })
      class TestQueue {}

      const options = getQueueOptions(TestQueue);
      expect(options).toEqual({ name: 'test-queue' });
    });

    it('should store additional options', () => {
      @Queue({ 
        name: 'advanced-queue',
        defaultJobOptions: { attempts: 3, backoff: 1000 },
      })
      class AdvancedQueue {}

      const options = getQueueOptions(AdvancedQueue);
      expect(options?.name).toBe('advanced-queue');
      expect(options?.defaultJobOptions?.attempts).toBe(3);
    });

    it('should throw error if name is missing', () => {
      expect(() => {
        @Queue({ name: '' })
        class InvalidQueue {}
      }).toThrow(QueueDecoratorError);
    });

    it('should identify decorated classes with isQueue', () => {
      @Queue({ name: 'my-queue' })
      class MyQueue {}

      class NotAQueue {}

      expect(isQueue(MyQueue)).toBe(true);
      expect(isQueue(NotAQueue)).toBe(false);
    });
  });

  describe('@Processor', () => {
    it('should store processor options metadata', () => {
      @Processor('email-queue')
      class EmailProcessor {}

      const options = getProcessorOptions(EmailProcessor);
      expect(options?.queueName).toBe('email-queue');
    });

    it('should store concurrency options', () => {
      @Processor('email-queue', { concurrency: 5 })
      class EmailProcessor {}

      const options = getProcessorOptions(EmailProcessor);
      expect(options?.concurrency).toBe(5);
    });

    it('should store rate limiter options', () => {
      @Processor('email-queue', { 
        rateLimiter: { max: 10, duration: 1000 } 
      })
      class EmailProcessor {}

      const options = getProcessorOptions(EmailProcessor);
      expect(options?.rateLimiter?.max).toBe(10);
      expect(options?.rateLimiter?.duration).toBe(1000);
    });

    it('should identify decorated classes with isProcessor', () => {
      @Processor('my-queue')
      class MyProcessor {}

      class NotAProcessor {}

      expect(isProcessor(MyProcessor)).toBe(true);
      expect(isProcessor(NotAProcessor)).toBe(false);
    });
  });

  describe('@Process', () => {
    it('should store job handler metadata', () => {
      @Processor('test-queue')
      class TestProcessor {
        @Process('send-email')
        async handleSendEmail() {}
      }

      const handlers = getJobHandlers(TestProcessor);
      expect(handlers).toHaveLength(1);
      expect(handlers[0].name).toBe('send-email');
      expect(handlers[0].methodName).toBe('handleSendEmail');
    });

    it('should use method name as default job name', () => {
      @Processor('test-queue')
      class TestProcessor {
        @Process()
        async sendNotification() {}
      }

      const handlers = getJobHandlers(TestProcessor);
      expect(handlers[0].name).toBe('sendNotification');
    });

    it('should support multiple handlers', () => {
      @Processor('test-queue')
      class TestProcessor {
        @Process('job-a')
        async handleA() {}

        @Process('job-b')
        async handleB() {}

        @Process()
        async handleC() {}
      }

      const handlers = getJobHandlers(TestProcessor);
      expect(handlers).toHaveLength(3);
      expect(handlers.map(h => h.name)).toEqual(['job-a', 'job-b', 'handleC']);
    });

    it('should identify handler methods with isJobHandler', () => {
      @Processor('test-queue')
      class TestProcessor {
        @Process('job-a')
        async handleA() {}

        async notAHandler() {}
      }

      expect(isJobHandler(TestProcessor, 'handleA')).toBe(true);
      expect(isJobHandler(TestProcessor, 'notAHandler')).toBe(false);
    });
  });

  describe('Event decorators', () => {
    it('should store OnJobComplete handler', () => {
      @Processor('test-queue')
      class TestProcessor {
        @OnJobComplete()
        async onComplete() {}
      }

      const handlers = getEventHandlers(TestProcessor);
      expect(handlers).toHaveLength(1);
      expect(handlers[0].event).toBe('job:completed');
      expect(handlers[0].methodName).toBe('onComplete');
    });

    it('should store OnJobFailed handler', () => {
      @Processor('test-queue')
      class TestProcessor {
        @OnJobFailed()
        async onFailed() {}
      }

      const handlers = getEventHandlers(TestProcessor);
      expect(handlers[0].event).toBe('job:failed');
    });

    it('should store OnJobProgress handler', () => {
      @Processor('test-queue')
      class TestProcessor {
        @OnJobProgress()
        async onProgress() {}
      }

      const handlers = getEventHandlers(TestProcessor);
      expect(handlers[0].event).toBe('job:progress');
    });

    it('should store OnJobStalled handler', () => {
      @Processor('test-queue')
      class TestProcessor {
        @OnJobStalled()
        async onStalled() {}
      }

      const handlers = getEventHandlers(TestProcessor);
      expect(handlers[0].event).toBe('job:stalled');
    });

    it('should support multiple event handlers', () => {
      @Processor('test-queue')
      class TestProcessor {
        @OnJobComplete()
        async onComplete() {}

        @OnJobFailed()
        async onFailed() {}

        @OnJobProgress()
        async onProgress() {}
      }

      const handlers = getEventHandlers(TestProcessor);
      expect(handlers).toHaveLength(3);
    });

    it('should filter handlers by event with getEventHandlersFor', () => {
      @Processor('test-queue')
      class TestProcessor {
        @OnJobComplete()
        async onComplete1() {}

        @OnJobComplete()
        async onComplete2() {}

        @OnJobFailed()
        async onFailed() {}
      }

      const completeHandlers = getEventHandlersFor(TestProcessor, 'job:completed');
      const failedHandlers = getEventHandlersFor(TestProcessor, 'job:failed');

      expect(completeHandlers).toHaveLength(2);
      expect(failedHandlers).toHaveLength(1);
    });
  });
});

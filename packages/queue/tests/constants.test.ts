/**
 * Tests for constants
 */

import { describe, it, expect } from 'vitest';
import { 
  METADATA_KEY, 
  QUEUE_PROVIDER, 
  QUEUE_SERVICE,
  QUEUE_REDIS_CONNECTION,
  QUEUE_CONFIG,
  getQueueToken,
  getWorkerToken,
} from '../src/constants.js';

describe('Constants', () => {
  describe('METADATA_KEY', () => {
    it('should have all required metadata keys', () => {
      expect(METADATA_KEY.QUEUE_OPTIONS).toBe('riktajs:queue:options');
      expect(METADATA_KEY.PROCESSOR_OPTIONS).toBe('riktajs:queue:processor:options');
      expect(METADATA_KEY.JOB_HANDLERS).toBe('riktajs:queue:job:handlers');
      expect(METADATA_KEY.EVENT_HANDLERS).toBe('riktajs:queue:event:handlers');
    });

    it('should have unique values', () => {
      const values = Object.values(METADATA_KEY);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('DI Tokens', () => {
    it('should define QUEUE_PROVIDER token', () => {
      expect(QUEUE_PROVIDER).toBeDefined();
      expect(typeof QUEUE_PROVIDER).toBe('symbol');
    });

    it('should define QUEUE_SERVICE token', () => {
      expect(QUEUE_SERVICE).toBeDefined();
      expect(typeof QUEUE_SERVICE).toBe('symbol');
    });

    it('should define QUEUE_REDIS_CONNECTION token', () => {
      expect(QUEUE_REDIS_CONNECTION).toBeDefined();
      expect(typeof QUEUE_REDIS_CONNECTION).toBe('symbol');
    });

    it('should define QUEUE_CONFIG token', () => {
      expect(QUEUE_CONFIG).toBeDefined();
      expect(typeof QUEUE_CONFIG).toBe('symbol');
    });
  });

  describe('getQueueToken', () => {
    it('should return a symbol for queue name', () => {
      const token = getQueueToken('test-queue');
      expect(typeof token).toBe('symbol');
    });

    it('should return consistent symbols for same name', () => {
      const token1 = getQueueToken('my-queue');
      const token2 = getQueueToken('my-queue');
      expect(token1).toBe(token2);
    });

    it('should return different symbols for different names', () => {
      const token1 = getQueueToken('queue-a');
      const token2 = getQueueToken('queue-b');
      expect(token1).not.toBe(token2);
    });
  });

  describe('getWorkerToken', () => {
    it('should return a symbol for worker name', () => {
      const token = getWorkerToken('test-queue');
      expect(typeof token).toBe('symbol');
    });

    it('should return consistent symbols for same name', () => {
      const token1 = getWorkerToken('my-queue');
      const token2 = getWorkerToken('my-queue');
      expect(token1).toBe(token2);
    });

    it('should return different tokens from getQueueToken', () => {
      const queueToken = getQueueToken('my-queue');
      const workerToken = getWorkerToken('my-queue');
      expect(queueToken).not.toBe(workerToken);
    });
  });
});

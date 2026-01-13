/**
 * Tests for Redis connection utilities
 * 
 * Note: These tests focus on logic that can be tested without actual Redis connections.
 * Integration tests with real Redis should be in a separate test suite.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  QueueConnectionError,
} from '../src/utils/connection.js';

// These tests avoid actual Redis connections by testing error paths and class behavior
describe('RedisConnectionManager', () => {
  describe('configure', () => {
    it('should allow configuration chaining', async () => {
      // Dynamically import to get fresh instance
      const { RedisConnectionManager } = await import('../src/utils/connection.js');
      const manager = new RedisConnectionManager();
      const result = manager.configure({ host: 'localhost', port: 6379 });
      expect(result).toBe(manager);
    });
  });

  describe('getClient', () => {
    it('should throw if not configured', async () => {
      const { RedisConnectionManager, QueueConnectionError } = await import('../src/utils/connection.js');
      const manager = new RedisConnectionManager();
      expect(() => manager.getClient()).toThrow(QueueConnectionError);
      expect(() => manager.getClient()).toThrow('Redis connection not configured');
    });
  });

  describe('isConnected', () => {
    it('should return false when no client exists', async () => {
      const { RedisConnectionManager } = await import('../src/utils/connection.js');
      const manager = new RedisConnectionManager();
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('close', () => {
    it('should do nothing if no client exists', async () => {
      const { RedisConnectionManager } = await import('../src/utils/connection.js');
      const manager = new RedisConnectionManager();
      await expect(manager.close()).resolves.toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('should do nothing if no client exists', async () => {
      const { RedisConnectionManager } = await import('../src/utils/connection.js');
      const manager = new RedisConnectionManager();
      // Should not throw
      expect(() => manager.disconnect()).not.toThrow();
    });
  });
});

describe('QueueConnectionError', () => {
  it('should include host and port in error', () => {
    const error = new QueueConnectionError(
      'Connection failed',
      'redis.example.com',
      6379
    );
    
    expect(error.message).toBe('Connection failed');
    expect(error.host).toBe('redis.example.com');
    expect(error.port).toBe(6379);
    expect(error.name).toBe('QueueConnectionError');
  });

  it('should include cause error', () => {
    const cause = new Error('Original error');
    const error = new QueueConnectionError(
      'Connection failed',
      'localhost',
      6379,
      cause
    );
    
    expect(error.cause).toBe(cause);
  });
});

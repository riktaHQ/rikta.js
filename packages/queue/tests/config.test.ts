/**
 * Tests for queue configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadQueueConfig, QueueConfigError } from '../src/config/queue.config.js';

describe('Queue Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadQueueConfig', () => {
    it('should load default configuration', () => {
      const config = loadQueueConfig();

      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
      expect(config.redis.db).toBe(0);
      expect(config.defaultConcurrency).toBe(1);
      expect(config.dashboardPath).toBe('/admin/queues');
      expect(config.dashboardEnabled).toBe(false);
      expect(config.shutdownTimeout).toBe(30000);
    });

    it('should load configuration from environment variables', () => {
      process.env['QUEUE_REDIS_HOST'] = 'redis.example.com';
      process.env['QUEUE_REDIS_PORT'] = '6380';
      process.env['QUEUE_REDIS_PASSWORD'] = 'secret';
      process.env['QUEUE_REDIS_DB'] = '1';
      process.env['QUEUE_DEFAULT_CONCURRENCY'] = '5';
      process.env['QUEUE_DASHBOARD_PATH'] = '/queues';
      process.env['QUEUE_DASHBOARD_ENABLED'] = 'true';
      process.env['QUEUE_SHUTDOWN_TIMEOUT'] = '60000';

      const config = loadQueueConfig();

      expect(config.redis.host).toBe('redis.example.com');
      expect(config.redis.port).toBe(6380);
      expect(config.redis.password).toBe('secret');
      expect(config.redis.db).toBe(1);
      expect(config.defaultConcurrency).toBe(5);
      expect(config.dashboardPath).toBe('/queues');
      expect(config.dashboardEnabled).toBe(true);
      expect(config.shutdownTimeout).toBe(60000);
    });

    it('should merge overrides with env config', () => {
      process.env['QUEUE_REDIS_HOST'] = 'env-host';

      const config = loadQueueConfig({
        redis: { host: 'override-host', port: 6381 },
        defaultConcurrency: 10,
      });

      expect(config.redis.host).toBe('override-host');
      expect(config.redis.port).toBe(6381);
      expect(config.defaultConcurrency).toBe(10);
    });

    it('should throw QueueConfigError for invalid port', () => {
      expect(() => {
        loadQueueConfig({
          redis: { host: 'localhost', port: -1 },
        });
      }).toThrow(QueueConfigError);
    });

    it('should throw QueueConfigError for invalid concurrency', () => {
      expect(() => {
        loadQueueConfig({
          defaultConcurrency: 0,
        });
      }).toThrow(QueueConfigError);
    });

    it('should accept rate limiter configuration', () => {
      const config = loadQueueConfig({
        defaultRateLimiter: { max: 100, duration: 10000 },
      });

      expect(config.defaultRateLimiter?.max).toBe(100);
      expect(config.defaultRateLimiter?.duration).toBe(10000);
    });
  });
});

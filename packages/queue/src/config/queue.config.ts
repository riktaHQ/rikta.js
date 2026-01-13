/**
 * Queue configuration schema and loader
 */

import { z } from 'zod';
import type { QueueConfig } from '../types.js';

/** Zod schema for Redis cluster node */
const RedisClusterNodeSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
});

/** Zod schema for Redis connection options */
const RedisConnectionSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(6379),
  password: z.string().optional(),
  db: z.number().int().min(0).default(0),
  username: z.string().optional(),
  tls: z.boolean().optional(),
  cluster: z.object({
    nodes: z.array(RedisClusterNodeSchema).min(1),
  }).optional(),
});

/** Zod schema for rate limiter */
const RateLimiterSchema = z.object({
  max: z.number().int().positive(),
  duration: z.number().int().positive(),
});

/** Zod schema for queue configuration */
export const QueueConfigSchema = z.object({
  redis: RedisConnectionSchema,
  defaultConcurrency: z.number().int().positive().default(1),
  defaultRateLimiter: RateLimiterSchema.optional(),
  dashboardPath: z.string().default('/admin/queues'),
  dashboardEnabled: z.boolean().default(false),
  shutdownTimeout: z.number().int().positive().default(30000),
});

export type QueueConfigInput = z.input<typeof QueueConfigSchema>;

/**
 * Load queue configuration from environment variables
 * @param overrides - Optional configuration overrides
 */
export function loadQueueConfig(overrides?: Partial<QueueConfigInput>): QueueConfig {
  const envConfig: QueueConfigInput = {
    redis: {
      host: process.env['QUEUE_REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['QUEUE_REDIS_PORT'] || '6379', 10),
      password: process.env['QUEUE_REDIS_PASSWORD'] || undefined,
      db: parseInt(process.env['QUEUE_REDIS_DB'] || '0', 10),
      username: process.env['QUEUE_REDIS_USERNAME'] || undefined,
    },
    defaultConcurrency: parseInt(process.env['QUEUE_DEFAULT_CONCURRENCY'] || '1', 10),
    dashboardPath: process.env['QUEUE_DASHBOARD_PATH'] || '/admin/queues',
    dashboardEnabled: process.env['QUEUE_DASHBOARD_ENABLED'] === 'true',
    shutdownTimeout: parseInt(process.env['QUEUE_SHUTDOWN_TIMEOUT'] || '30000', 10),
  };

  // Merge with overrides
  const merged = {
    ...envConfig,
    ...overrides,
    redis: {
      ...envConfig.redis,
      ...overrides?.redis,
    },
  };

  // Validate and return
  const result = QueueConfigSchema.safeParse(merged);
  
  if (!result.success) {
    const errors = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new QueueConfigError(`Invalid queue configuration: ${errors}`);
  }

  return result.data as QueueConfig;
}

/**
 * Error thrown when queue configuration is invalid
 */
export class QueueConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueConfigError';
  }
}

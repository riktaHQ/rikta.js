/**
 * Redis connection utilities
 */

import type { RedisConnectionOptions } from '../types.js';
import type { Redis, Cluster } from 'ioredis';
import IORedis from 'ioredis';

/**
 * Create a Redis client based on configuration
 * @param config - Redis connection options
 */
export function createRedisClient(config: RedisConnectionOptions): Redis | Cluster {
  if (config.cluster?.nodes) {
    // Cluster mode
    return new IORedis.Cluster(config.cluster.nodes, {
      redisOptions: {
        password: config.password,
        username: config.username,
      },
    }) as Cluster;
  }

  // Single node mode
  return new (IORedis as unknown as new (options: object) => Redis)({
    host: config.host || 'localhost',
    port: config.port || 6379,
    password: config.password,
    username: config.username,
    db: config.db || 0,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });
}

/**
 * Error thrown when Redis connection fails
 */
export class QueueConnectionError extends Error {
  constructor(
    message: string,
    public readonly host?: string,
    public readonly port?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'QueueConnectionError';
  }
}

/**
 * Manages a shared Redis connection for all queues
 */
export class RedisConnectionManager {
  private client: Redis | Cluster | null = null;
  private config: RedisConnectionOptions | null = null;

  /**
   * Initialize the connection manager with configuration
   */
  configure(config: RedisConnectionOptions): this {
    this.config = config;
    return this;
  }

  /**
   * Get or create the Redis client
   */
  getClient(): Redis | Cluster {
    if (!this.client) {
      if (!this.config) {
        throw new QueueConnectionError('Redis connection not configured');
      }
      
      try {
        this.client = createRedisClient(this.config);
      } catch (error) {
        throw new QueueConnectionError(
          `Failed to create Redis connection: ${(error as Error).message}`,
          this.config.host,
          this.config.port,
          error as Error
        );
      }
    }
    
    return this.client;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    if (!this.client) return false;
    return this.client.status === 'ready';
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Disconnect immediately (force)
   */
  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }
}

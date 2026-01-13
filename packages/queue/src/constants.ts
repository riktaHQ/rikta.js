/**
 * Constants and DI tokens for @riktajs/queue
 */

/** Metadata keys for decorator reflection */
export const METADATA_KEY = {
  /** Queue class decorator options */
  QUEUE_OPTIONS: 'riktajs:queue:options',
  /** Processor class decorator options */
  PROCESSOR_OPTIONS: 'riktajs:queue:processor:options',
  /** Job handler method metadata */
  JOB_HANDLERS: 'riktajs:queue:job:handlers',
  /** Event handler method metadata */
  EVENT_HANDLERS: 'riktajs:queue:event:handlers',
} as const;

/** DI token for the QueueProvider */
export const QUEUE_PROVIDER = Symbol.for('QUEUE_PROVIDER');

/** DI token for the QueueService */
export const QUEUE_SERVICE = Symbol.for('QUEUE_SERVICE');

/** DI token for the Redis connection */
export const QUEUE_REDIS_CONNECTION = Symbol.for('QUEUE_REDIS_CONNECTION');

/** DI token for the queue configuration */
export const QUEUE_CONFIG = Symbol.for('QUEUE_CONFIG');

/**
 * Get the DI token for a named queue
 * @param name - The queue name
 */
export function getQueueToken(name: string): symbol {
  return Symbol.for(`QUEUE:${name}`);
}

/**
 * Get the DI token for a named worker
 * @param name - The queue name
 */
export function getWorkerToken(name: string): symbol {
  return Symbol.for(`WORKER:${name}`);
}

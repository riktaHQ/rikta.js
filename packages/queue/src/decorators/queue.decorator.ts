/**
 * @Queue decorator - marks a class as a queue definition
 */

import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';
import type { QueueDecoratorOptions } from '../types.js';

/**
 * Decorator to define a queue
 * 
 * @param options - Queue configuration options
 * @returns ClassDecorator
 * 
 * @example
 * ```typescript
 * @Queue({ name: 'email-queue' })
 * class EmailQueue {}
 * ```
 */
export function Queue(options: QueueDecoratorOptions): ClassDecorator {
  if (!options.name) {
    throw new QueueDecoratorError('Queue name is required');
  }

  return (target: Function) => {
    Reflect.defineMetadata(METADATA_KEY.QUEUE_OPTIONS, options, target);
  };
}

/**
 * Get queue options from a decorated class
 * @param target - The decorated class
 */
export function getQueueOptions(target: Function): QueueDecoratorOptions | undefined {
  return Reflect.getMetadata(METADATA_KEY.QUEUE_OPTIONS, target);
}

/**
 * Check if a class is decorated with @Queue
 * @param target - The class to check
 */
export function isQueue(target: Function): boolean {
  return Reflect.hasMetadata(METADATA_KEY.QUEUE_OPTIONS, target);
}

/**
 * Error thrown when @Queue decorator is used incorrectly
 */
export class QueueDecoratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueDecoratorError';
  }
}

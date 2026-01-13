/**
 * @Processor decorator - marks a class as a job processor
 */

import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';
import type { ProcessorOptions } from '../types.js';

/**
 * Decorator to define a job processor for a queue
 * 
 * @param queueName - The name of the queue to process
 * @param options - Optional processor configuration
 * @returns ClassDecorator
 * 
 * @example
 * ```typescript
 * @Processor('email-queue', { concurrency: 5 })
 * class EmailProcessor {
 *   @Process('send')
 *   async handleSendEmail(job: Job) {
 *     // process job
 *   }
 * }
 * ```
 */
export function Processor(
  queueName: string,
  options?: Omit<ProcessorOptions, 'queueName'>
): ClassDecorator {
  if (!queueName) {
    throw new ProcessorDecoratorError('Queue name is required for @Processor');
  }

  const processorOptions: ProcessorOptions = {
    queueName,
    ...options,
  };

  return (target: Function) => {
    Reflect.defineMetadata(METADATA_KEY.PROCESSOR_OPTIONS, processorOptions, target);
  };
}

/**
 * Get processor options from a decorated class
 * @param target - The decorated class
 */
export function getProcessorOptions(target: Function): ProcessorOptions | undefined {
  return Reflect.getMetadata(METADATA_KEY.PROCESSOR_OPTIONS, target);
}

/**
 * Check if a class is decorated with @Processor
 * @param target - The class to check
 */
export function isProcessor(target: Function): boolean {
  return Reflect.hasMetadata(METADATA_KEY.PROCESSOR_OPTIONS, target);
}

/**
 * Error thrown when @Processor decorator is used incorrectly
 */
export class ProcessorDecoratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessorDecoratorError';
  }
}

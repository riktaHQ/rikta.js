/**
 * @Process decorator - marks a method as a job handler
 */

import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';
import type { JobHandlerMeta } from '../types.js';

/**
 * Decorator to define a job handler method
 * 
 * @param jobName - The name of the job to handle (default: method name)
 * @returns MethodDecorator
 * 
 * @example
 * ```typescript
 * @Processor('email-queue')
 * class EmailProcessor {
 *   @Process('send')
 *   async handleSendEmail(job: Job<EmailData>) {
 *     await sendEmail(job.data);
 *     return { sent: true };
 *   }
 * 
 *   @Process() // Uses method name as job name
 *   async welcome(job: Job<WelcomeData>) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Process(jobName?: string): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ) => {
    const methodName = String(propertyKey);
    const name = jobName || methodName;

    // Get existing handlers or create new array
    const existingHandlers: JobHandlerMeta[] = 
      Reflect.getMetadata(METADATA_KEY.JOB_HANDLERS, target.constructor) || [];

    // Add this handler
    const handler: JobHandlerMeta = {
      name,
      methodName,
    };

    existingHandlers.push(handler);

    // Store updated handlers
    Reflect.defineMetadata(
      METADATA_KEY.JOB_HANDLERS,
      existingHandlers,
      target.constructor
    );
  };
}

/**
 * Get all job handlers from a processor class
 * @param target - The processor class
 */
export function getJobHandlers(target: Function): JobHandlerMeta[] {
  return Reflect.getMetadata(METADATA_KEY.JOB_HANDLERS, target) || [];
}

/**
 * Check if a method is decorated with @Process
 * @param target - The class
 * @param methodName - The method name
 */
export function isJobHandler(target: Function, methodName: string): boolean {
  const handlers = getJobHandlers(target);
  return handlers.some(h => h.methodName === methodName);
}

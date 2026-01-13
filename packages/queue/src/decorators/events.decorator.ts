/**
 * Event decorators for job lifecycle events
 */

import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';
import type { EventHandlerMeta, QueueEventName } from '../types.js';

/**
 * Factory function to create event decorators
 * @internal
 */
function createEventDecorator(event: QueueEventName): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ) => {
    const methodName = String(propertyKey);

    // Get existing handlers or create new array
    const existingHandlers: EventHandlerMeta[] =
      Reflect.getMetadata(METADATA_KEY.EVENT_HANDLERS, target.constructor) || [];

    // Add this handler
    const handler: EventHandlerMeta = {
      event,
      methodName,
    };

    existingHandlers.push(handler);

    // Store updated handlers
    Reflect.defineMetadata(
      METADATA_KEY.EVENT_HANDLERS,
      existingHandlers,
      target.constructor
    );
  };
}

/**
 * Decorator for handling job completion events
 * 
 * @example
 * ```typescript
 * @Processor('my-queue')
 * class MyProcessor {
 *   @OnJobComplete()
 *   async handleComplete(job: Job, result: unknown) {
 *     console.log(`Job ${job.id} completed with:`, result);
 *   }
 * }
 * ```
 */
export function OnJobComplete(): MethodDecorator {
  return createEventDecorator('job:completed');
}

/**
 * Decorator for handling job failure events
 * 
 * @example
 * ```typescript
 * @Processor('my-queue')
 * class MyProcessor {
 *   @OnJobFailed()
 *   async handleFailed(job: Job, error: Error) {
 *     console.error(`Job ${job.id} failed:`, error);
 *   }
 * }
 * ```
 */
export function OnJobFailed(): MethodDecorator {
  return createEventDecorator('job:failed');
}

/**
 * Decorator for handling job progress events
 * 
 * @example
 * ```typescript
 * @Processor('my-queue')
 * class MyProcessor {
 *   @OnJobProgress()
 *   async handleProgress(job: Job, progress: number | object) {
 *     console.log(`Job ${job.id} progress:`, progress);
 *   }
 * }
 * ```
 */
export function OnJobProgress(): MethodDecorator {
  return createEventDecorator('job:progress');
}

/**
 * Decorator for handling job stalled events
 * 
 * @example
 * ```typescript
 * @Processor('my-queue')
 * class MyProcessor {
 *   @OnJobStalled()
 *   async handleStalled(jobId: string) {
 *     console.warn(`Job ${jobId} stalled`);
 *   }
 * }
 * ```
 */
export function OnJobStalled(): MethodDecorator {
  return createEventDecorator('job:stalled');
}

/**
 * Decorator for handling worker ready events
 */
export function OnWorkerReady(): MethodDecorator {
  return createEventDecorator('worker:ready');
}

/**
 * Decorator for handling worker error events
 */
export function OnWorkerError(): MethodDecorator {
  return createEventDecorator('worker:error');
}

/**
 * Get all event handlers from a processor class
 * @param target - The processor class
 */
export function getEventHandlers(target: Function): EventHandlerMeta[] {
  return Reflect.getMetadata(METADATA_KEY.EVENT_HANDLERS, target) || [];
}

/**
 * Get event handlers for a specific event
 * @param target - The processor class
 * @param event - The event name
 */
export function getEventHandlersFor(
  target: Function,
  event: QueueEventName
): EventHandlerMeta[] {
  return getEventHandlers(target).filter(h => h.event === event);
}

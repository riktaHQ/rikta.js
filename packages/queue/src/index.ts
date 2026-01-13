/**
 * @riktajs/queue
 * 
 * BullMQ-based job queue integration for Rikta Framework.
 * 
 * @packageDocumentation
 */

// Constants and tokens
export * from './constants.js';

// Types
export * from './types.js';

// Configuration
export * from './config/queue.config.js';

// Decorators
export {
  Queue,
  getQueueOptions,
  isQueue,
  QueueDecoratorError,
} from './decorators/queue.decorator.js';
export {
  Processor,
  getProcessorOptions,
  isProcessor,
  ProcessorDecoratorError,
} from './decorators/processor.decorator.js';
export {
  Process,
  getJobHandlers,
  isJobHandler,
} from './decorators/process.decorator.js';
export {
  OnJobComplete,
  OnJobFailed,
  OnJobProgress,
  OnJobStalled,
  OnWorkerReady,
  OnWorkerError,
  getEventHandlers,
  getEventHandlersFor,
} from './decorators/events.decorator.js';

// Providers
export * from './providers/queue.provider.js';

// Services
export * from './services/queue.service.js';

// Events
export {
  QUEUE_EVENTS,
  getEventBusEventName,
  publishQueueEvent,
} from './events/queue-events.js';
export type { QueueEventName } from './events/queue-events.js';

// Monitoring (optional Bull Board integration)
export * from './monitoring/bull-board.js';

// Utils
export * from './utils/connection.js';
export * from './utils/validation.js';

/**
 * Queue events integration with Rikta's EventBus
 */

import type { QueueEventPayload } from '../types.js';

/** Event names for queue events */
export type QueueEventName =
  | 'job:added'
  | 'job:completed'
  | 'job:failed'
  | 'job:progress'
  | 'job:stalled'
  | 'job:delayed'
  | 'job:removed'
  | 'worker:ready'
  | 'worker:closed'
  | 'worker:error';

/** Event bus event names with prefix */
export const QUEUE_EVENTS = {
  JOB_ADDED: 'queue:job:added',
  JOB_COMPLETED: 'queue:job:completed',
  JOB_FAILED: 'queue:job:failed',
  JOB_PROGRESS: 'queue:job:progress',
  JOB_STALLED: 'queue:job:stalled',
  JOB_DELAYED: 'queue:job:delayed',
  JOB_REMOVED: 'queue:job:removed',
  WORKER_READY: 'queue:worker:ready',
  WORKER_CLOSED: 'queue:worker:closed',
  WORKER_ERROR: 'queue:worker:error',
} as const;

/**
 * Map internal event names to EventBus event names
 */
export function getEventBusEventName(event: QueueEventName): string {
  switch (event) {
    case 'job:added':
      return QUEUE_EVENTS.JOB_ADDED;
    case 'job:completed':
      return QUEUE_EVENTS.JOB_COMPLETED;
    case 'job:failed':
      return QUEUE_EVENTS.JOB_FAILED;
    case 'job:progress':
      return QUEUE_EVENTS.JOB_PROGRESS;
    case 'job:stalled':
      return QUEUE_EVENTS.JOB_STALLED;
    case 'job:delayed':
      return QUEUE_EVENTS.JOB_DELAYED;
    case 'job:removed':
      return QUEUE_EVENTS.JOB_REMOVED;
    case 'worker:ready':
      return QUEUE_EVENTS.WORKER_READY;
    case 'worker:closed':
      return QUEUE_EVENTS.WORKER_CLOSED;
    case 'worker:error':
      return QUEUE_EVENTS.WORKER_ERROR;
    default:
      return `queue:${event}`;
  }
}

/**
 * Publish a queue event to the EventBus
 * 
 * @param eventBus - Rikta's EventBus instance
 * @param event - The event name
 * @param queueName - The queue name
 * @param args - Event arguments (job, result, error, etc.)
 */
export async function publishQueueEvent(
  eventBus: unknown,
  event: QueueEventName,
  queueName: string,
  ...args: unknown[]
): Promise<void> {
  if (!eventBus || typeof (eventBus as { emit?: Function }).emit !== 'function') {
    return;
  }

  const eventName = getEventBusEventName(event);
  const payload = createEventPayload(event, queueName, args);

  await (eventBus as { emit: Function }).emit(eventName, payload);
}

/**
 * Create an event payload from event arguments
 */
function createEventPayload(
  event: QueueEventName,
  queueName: string,
  args: unknown[]
): QueueEventPayload {
  const base: QueueEventPayload = {
    queueName,
    jobId: '',
    jobName: '',
    data: null,
    timestamp: Date.now(),
  };

  const job = args[0] as { id?: string; name?: string; data?: unknown } | string | undefined;

  if (typeof job === 'object' && job !== null) {
    base.jobId = job.id || '';
    base.jobName = job.name || '';
    base.data = job.data;
  } else if (typeof job === 'string') {
    // For stalled events, first arg is jobId
    base.jobId = job;
  }

  switch (event) {
    case 'job:completed':
      base.returnValue = args[1];
      break;
    case 'job:failed':
      base.error = args[1] instanceof Error 
        ? args[1].message 
        : String(args[1]);
      break;
    case 'job:progress':
      base.progress = args[1] as number | object;
      break;
    case 'worker:error':
      base.error = args[0] instanceof Error 
        ? args[0].message 
        : String(args[0]);
      break;
  }

  return base;
}

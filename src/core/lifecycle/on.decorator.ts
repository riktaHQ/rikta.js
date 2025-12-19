import 'reflect-metadata';
import { LifecycleEvent } from './event-bus';

export const ON_EVENT_METADATA = Symbol('on:event:metadata');

/**
 * Metadata for @On() decorated methods
 */
export interface OnEventMetadata {
  event: string;
  methodName: string;
  priority: number;
}

/**
 * @On() decorator - Listen to lifecycle or custom events
 * 
 * Marks a method to be called when a specific event is emitted.
 * Can be used for built-in lifecycle events or custom events.
 * 
 * @param event - The event name to listen for
 * @param options - Optional configuration (priority)
 * 
 * @example Built-in lifecycle events:
 * ```typescript
 * @Injectable()
 * class MonitoringService {
 *   @On('app:listen')
 *   onServerStart({ address, port }: EventPayload['app:listen']) {
 *     console.log(`Server listening on ${address}:${port}`);
 *   }
 * 
 *   @On('app:shutdown')
 *   async onShutdown({ signal }: EventPayload['app:shutdown']) {
 *     await this.flushMetrics();
 *   }
 * }
 * ```
 * 
 * @example Custom events:
 * ```typescript
 * @Injectable()
 * class NotificationService {
 *   @On('user:created')
 *   async sendWelcome(user: User) {
 *     await this.email.send(user.email, 'Welcome!');
 *   }
 * }
 * ```
 * 
 * @example With priority (higher = called first):
 * ```typescript
 * @Injectable()
 * class CriticalService {
 *   @On('app:shutdown', { priority: 100 })
 *   async saveState() {
 *     // Called before other shutdown handlers
 *   }
 * }
 * ```
 */
export function On(
  event: LifecycleEvent | string, 
  options?: { priority?: number }
): MethodDecorator {
  return (target, propertyKey) => {
    const existing: OnEventMetadata[] = 
      Reflect.getMetadata(ON_EVENT_METADATA, target.constructor) ?? [];
    
    existing.push({
      event,
      methodName: String(propertyKey),
      priority: options?.priority ?? 0,
    });
    
    Reflect.defineMetadata(ON_EVENT_METADATA, existing, target.constructor);
  };
}


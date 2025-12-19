import { Injectable } from '../decorators/injectable.decorator';
import { Constructor } from '../types';

/**
 * Event payload types for built-in lifecycle events
 */
export interface EventPayload {
  'app:discovery': { files: string[] };
  'app:providers': { count: number };
  'provider:init': { provider: Constructor; name: string; priority: number };
  'app:routes': { count: number };
  'app:bootstrap': { providerCount: number };
  'app:listen': { address: string; port: number };
  'app:shutdown': { signal?: string };
  'provider:destroy': { provider: Constructor; name: string };
  'app:destroy': { uptime: number };
}

export type LifecycleEvent = keyof EventPayload;

type Listener<E extends LifecycleEvent> = (payload: EventPayload[E]) => void | Promise<void>;

/**
 * EventBus - Central event system for lifecycle and custom events
 * 
 * Provides a flexible pub/sub mechanism that works alongside
 * the interface-based lifecycle hooks.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class MonitoringService {
 *   constructor(private events: EventBus) {
 *     events.on('app:listen', ({ address }) => {
 *       console.log(`Server started at ${address}`);
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class EventBus {
  private listeners = new Map<string, Set<Listener<any>>>();
  private onceListeners = new Map<string, Set<Listener<any>>>();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<E extends LifecycleEvent>(event: E, listener: Listener<E>): () => void;
  on<T = unknown>(event: string, listener: (payload: T) => void | Promise<void>): () => void;
  on(event: string, listener: (payload: unknown) => void | Promise<void>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    
    return () => this.listeners.get(event)?.delete(listener);
  }

  /**
   * Subscribe to an event once
   */
  once<E extends LifecycleEvent>(event: E, listener: Listener<E>): void;
  once<T = unknown>(event: string, listener: (payload: T) => void | Promise<void>): void;
  once(event: string, listener: (payload: unknown) => void | Promise<void>): void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(listener);
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<E extends LifecycleEvent>(event: E, payload: EventPayload[E]): Promise<void>;
  async emit<T = unknown>(event: string, payload: T): Promise<void>;
  async emit(event: string, payload: unknown): Promise<void> {
    // Call regular listeners
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        await listener(payload);
      }
    }

    // Call and remove once listeners
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      for (const listener of onceListeners) {
        await listener(payload);
      }
      this.onceListeners.delete(event);
    }
  }

  /**
   * Wait for an event (Promise-based)
   */
  waitFor<E extends LifecycleEvent>(event: E): Promise<EventPayload[E]>;
  waitFor<T = unknown>(event: string): Promise<T>;
  waitFor(event: string): Promise<unknown> {
    return new Promise(resolve => this.once(event, resolve as any));
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.listeners.delete(event);
    this.onceListeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return (this.listeners.get(event)?.size ?? 0) + 
           (this.onceListeners.get(event)?.size ?? 0);
  }
}


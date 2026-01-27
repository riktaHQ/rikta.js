import { Injectable } from '../decorators/injectable.decorator.js';
import { Constructor } from '../types.js';

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
 * Represents a tracked listener with its owner for cleanup
 */
interface TrackedListener {
  listener: (payload: unknown) => void | Promise<void>;
  owner?: string; // Provider class name for tracking
}

/**
 * EventBus - Central event system for lifecycle and custom events
 * 
 * Provides a flexible pub/sub mechanism that works alongside
 * the interface-based lifecycle hooks.
 * 
 * Features:
 * - Subscribe/unsubscribe to events
 * - One-time listeners
 * - Promise-based waitFor
 * - Listener tracking by owner for cleanup
 * - Memory leak prevention with automatic cleanup
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
  private listeners = new Map<string, Set<TrackedListener>>();
  private onceListeners = new Map<string, Set<TrackedListener>>();
  
  /** Track unsubscribe functions by owner for cleanup */
  private ownerUnsubscribers = new Map<string, Set<() => void>>();

  /**
   * Subscribe to an event
   * @param event - Event name to subscribe to
   * @param listener - Callback function
   * @param owner - Optional owner identifier for cleanup tracking
   * @returns Unsubscribe function
   */
  on<E extends LifecycleEvent>(event: E, listener: Listener<E>, owner?: string): () => void;
  on<T = unknown>(event: string, listener: (payload: T) => void | Promise<void>, owner?: string): () => void;
  on(event: string, listener: (payload: unknown) => void | Promise<void>, owner?: string): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const tracked: TrackedListener = { listener, owner };
    this.listeners.get(event)!.add(tracked);
    
    const unsubscribe = () => {
      this.listeners.get(event)?.delete(tracked);
      if (owner) {
        this.ownerUnsubscribers.get(owner)?.delete(unsubscribe);
      }
    };
    
    // Track unsubscribe by owner for bulk cleanup
    if (owner) {
      if (!this.ownerUnsubscribers.has(owner)) {
        this.ownerUnsubscribers.set(owner, new Set());
      }
      this.ownerUnsubscribers.get(owner)!.add(unsubscribe);
    }
    
    return unsubscribe;
  }

  /**
   * Subscribe to an event once
   * @param event - Event name to subscribe to
   * @param listener - Callback function
   * @param owner - Optional owner identifier for cleanup tracking
   */
  once<E extends LifecycleEvent>(event: E, listener: Listener<E>, owner?: string): void;
  once<T = unknown>(event: string, listener: (payload: T) => void | Promise<void>, owner?: string): void;
  once(event: string, listener: (payload: unknown) => void | Promise<void>, owner?: string): void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    
    const tracked: TrackedListener = { listener, owner };
    this.onceListeners.get(event)!.add(tracked);
    
    // Track for owner cleanup
    if (owner) {
      if (!this.ownerUnsubscribers.has(owner)) {
        this.ownerUnsubscribers.set(owner, new Set());
      }
      const unsubscribe = () => {
        this.onceListeners.get(event)?.delete(tracked);
      };
      this.ownerUnsubscribers.get(owner)!.add(unsubscribe);
    }
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
      for (const { listener } of listeners) {
        await listener(payload);
      }
    }

    // Call and remove once listeners
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      for (const { listener } of onceListeners) {
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
   * Remove all listeners registered by a specific owner
   * Useful for cleaning up when a provider is destroyed
   * 
   * @param owner - The owner identifier (usually class name)
   */
  removeByOwner(owner: string): void {
    const unsubscribers = this.ownerUnsubscribers.get(owner);
    if (unsubscribers) {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      this.ownerUnsubscribers.delete(owner);
    }
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
    this.ownerUnsubscribers.clear();
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return (this.listeners.get(event)?.size ?? 0) + 
           (this.onceListeners.get(event)?.size ?? 0);
  }

  /**
   * Get total listener count across all events
   * Useful for debugging memory leaks
   */
  totalListenerCount(): number {
    let count = 0;
    for (const listeners of this.listeners.values()) {
      count += listeners.size;
    }
    for (const listeners of this.onceListeners.values()) {
      count += listeners.size;
    }
    return count;
  }

  /**
   * Get listener count by owner
   * Useful for debugging which providers have the most listeners
   */
  listenerCountByOwner(owner: string): number {
    return this.ownerUnsubscribers.get(owner)?.size ?? 0;
  }

  /**
   * Get all registered owners
   */
  getOwners(): string[] {
    return [...this.ownerUnsubscribers.keys()];
  }
}


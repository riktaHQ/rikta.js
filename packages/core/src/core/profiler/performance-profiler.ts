import { EventBus } from '../lifecycle/event-bus.js';

/**
 * Performance metrics for a single operation
 */
export interface PerformanceMetric {
  /** Name of the operation */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Timestamp when the operation started */
  startTime: number;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Route performance metrics
 */
export interface RouteMetric extends PerformanceMetric {
  /** HTTP method */
  method: string;
  /** Route path */
  path: string;
  /** HTTP status code */
  statusCode: number;
}

/**
 * Bootstrap performance metrics
 */
export interface BootstrapMetrics {
  /** Total bootstrap time */
  total: number;
  /** Time for discovery phase */
  discovery: number;
  /** Time for container initialization */
  containerInit: number;
  /** Time for route registration */
  routeRegistration: number;
  /** Time for lifecycle hooks */
  lifecycleHooks: number;
}

/**
 * Performance profiler for measuring application performance
 * 
 * @example
 * ```typescript
 * const profiler = new PerformanceProfiler();
 * 
 * // Measure an operation
 * const end = profiler.startTimer('database-query');
 * await db.query('SELECT ...');
 * end({ table: 'users' });
 * 
 * // Listen for metrics
 * profiler.onMetric((metric) => {
 *   console.log(`${metric.name}: ${metric.duration}ms`);
 * });
 * ```
 */
export class PerformanceProfiler {
  private enabled: boolean = true;
  private eventBus?: EventBus;
  private listeners: ((metric: PerformanceMetric) => void)[] = [];
  private bootstrapMetrics: Partial<BootstrapMetrics> = {};

  constructor(options?: { enabled?: boolean; eventBus?: EventBus }) {
    this.enabled = options?.enabled ?? true;
    this.eventBus = options?.eventBus;
  }

  /**
   * Enable or disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if profiling is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Start a timer for measuring an operation
   * 
   * @param name - Name of the operation
   * @returns A function to call when the operation completes
   */
  startTimer(name: string): (metadata?: Record<string, unknown>) => PerformanceMetric | null {
    if (!this.enabled) {
      return () => null;
    }

    const startTime = performance.now();
    const startTimestamp = Date.now();

    return (metadata?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        name,
        duration,
        startTime: startTimestamp,
        metadata,
      };

      this.emitMetric(metric);
      return metric;
    };
  }

  /**
   * Measure the execution time of a function
   * 
   * @param name - Name of the operation
   * @param fn - Function to measure
   * @returns The result of the function
   */
  async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const end = this.startTimer(name);
    try {
      const result = await fn();
      end();
      return result;
    } catch (error) {
      end({ error: true });
      throw error;
    }
  }

  /**
   * Record a route request metric
   */
  recordRouteMetric(metric: RouteMetric): void {
    if (!this.enabled) return;
    
    this.emitMetric(metric);
    this.eventBus?.emit('profiler:route', metric);
  }

  /**
   * Record bootstrap phase timing
   */
  recordBootstrapPhase(phase: keyof BootstrapMetrics, duration: number): void {
    this.bootstrapMetrics[phase] = duration;
  }

  /**
   * Get bootstrap metrics
   */
  getBootstrapMetrics(): Partial<BootstrapMetrics> {
    return { ...this.bootstrapMetrics };
  }

  /**
   * Subscribe to metric events
   * 
   * @param listener - Callback for each metric
   * @returns Unsubscribe function
   */
  onMetric(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit a metric to all listeners
   */
  private emitMetric(metric: PerformanceMetric): void {
    for (const listener of this.listeners) {
      try {
        listener(metric);
      } catch {
        // Ignore listener errors
      }
    }
    
    this.eventBus?.emit('profiler:metric', metric);
  }

  /**
   * Create a timer that automatically logs to console
   */
  createConsoleTimer(prefix: string = '[Rikta]'): (name: string) => (metadata?: Record<string, unknown>) => void {
    return (name: string) => {
      const end = this.startTimer(name);
      return (metadata?: Record<string, unknown>) => {
        const metric = end(metadata);
        if (metric) {
          console.log(`${prefix} ${metric.name}: ${metric.duration.toFixed(2)}ms`);
        }
      };
    };
  }
}

/**
 * Global profiler instance
 * Can be replaced with a custom instance if needed
 */
export let profiler = new PerformanceProfiler();

/**
 * Replace the global profiler instance
 */
export function setGlobalProfiler(newProfiler: PerformanceProfiler): void {
  profiler = newProfiler;
}

/**
 * Get the global profiler instance
 */
export function getGlobalProfiler(): PerformanceProfiler {
  return profiler;
}

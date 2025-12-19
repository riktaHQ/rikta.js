/**
 * Lifecycle Hook Interfaces
 * 
 * These interfaces provide type-safe lifecycle hooks for providers.
 * Implement these interfaces to receive callbacks at specific points
 * in the application lifecycle.
 */

/**
 * Called when a provider is initialized
 * 
 * This is called after the provider is instantiated and all its
 * dependencies are injected. Use this for async initialization.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class DatabaseService implements OnProviderInit {
 *   async onProviderInit() {
 *     await this.connect();
 *     console.log('Database connected');
 *   }
 * }
 * ```
 */
export interface OnProviderInit {
  onProviderInit(): Promise<void> | void;
}

/**
 * Called when a provider is being destroyed
 * 
 * This is called during application shutdown, in reverse priority order.
 * Use this for cleanup operations.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class DatabaseService implements OnProviderDestroy {
 *   async onProviderDestroy() {
 *     await this.connection.close();
 *     console.log('Database disconnected');
 *   }
 * }
 * ```
 */
export interface OnProviderDestroy {
  onProviderDestroy(): Promise<void> | void;
}

/**
 * Called after all providers are initialized
 * 
 * This is called once after all providers have been initialized.
 * The application is fully bootstrapped at this point.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class AppService implements OnApplicationBootstrap {
 *   onApplicationBootstrap() {
 *     console.log('Application is ready');
 *   }
 * }
 * ```
 */
export interface OnApplicationBootstrap {
  onApplicationBootstrap(): Promise<void> | void;
}

/**
 * Called after the server starts listening
 * 
 * This is called after app.listen() completes successfully.
 * The address parameter contains the server URL.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class HealthService implements OnApplicationListen {
 *   onApplicationListen(address: string) {
 *     console.log(`Health checks active at ${address}/health`);
 *   }
 * }
 * ```
 */
export interface OnApplicationListen {
  onApplicationListen(address: string): Promise<void> | void;
}

/**
 * Called when the application is shutting down
 * 
 * This is called when app.close() is invoked.
 * Use this for graceful shutdown operations.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class MetricsService implements OnApplicationShutdown {
 *   async onApplicationShutdown(signal?: string) {
 *     console.log(`Shutting down due to ${signal}`);
 *     await this.flushMetrics();
 *   }
 * }
 * ```
 */
export interface OnApplicationShutdown {
  onApplicationShutdown(signal?: string): Promise<void> | void;
}


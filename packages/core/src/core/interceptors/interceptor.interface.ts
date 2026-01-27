import { ExecutionContext } from '../guards/execution-context.js';

/**
 * Interceptor interface for request/response manipulation
 * 
 * Interceptors have access to:
 * 1. The execution context before the route handler runs
 * 2. The response after the route handler completes
 * 3. The ability to transform the response
 * 4. The ability to extend the basic function logic
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class LoggingInterceptor implements Interceptor {
 *   async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
 *     const start = Date.now();
 *     const result = await next.handle();
 *     console.log(`Request took ${Date.now() - start}ms`);
 *     return result;
 *   }
 * }
 * ```
 */
export interface Interceptor {
  /**
   * Method to intercept the request/response cycle
   * 
   * @param context - The execution context with request/response info
   * @param next - Call handler to invoke the route handler
   * @returns The (potentially transformed) response
   */
  intercept(context: ExecutionContext, next: CallHandler): Promise<unknown>;
}

/**
 * Call handler interface
 * 
 * Used to invoke the route handler from within an interceptor
 */
export interface CallHandler {
  /**
   * Invokes the route handler and returns its result
   */
  handle(): Promise<unknown>;
}

import { AsyncLocalStorage } from 'node:async_hooks';
import { Token } from './injection-token.js';

/**
 * Request-scoped storage for dependency injection
 * 
 * Uses Node.js AsyncLocalStorage to maintain request-scoped instances
 * that are automatically cleaned up when the request ends.
 * 
 * @example
 * ```typescript
 * @Injectable({ scope: 'request' })
 * class RequestContext {
 *   readonly requestId = crypto.randomUUID();
 *   readonly startTime = Date.now();
 * }
 * ```
 */
export class RequestScopeStorage {
  private static instance: RequestScopeStorage;
  
  /** AsyncLocalStorage for request-scoped data */
  private readonly asyncLocalStorage = new AsyncLocalStorage<Map<Token, unknown>>();

  private constructor() {}

  /**
   * Get the global RequestScopeStorage instance
   */
  static getInstance(): RequestScopeStorage {
    if (!RequestScopeStorage.instance) {
      RequestScopeStorage.instance = new RequestScopeStorage();
    }
    return RequestScopeStorage.instance;
  }

  /**
   * Reset the storage (useful for testing)
   */
  static reset(): void {
    RequestScopeStorage.instance = new RequestScopeStorage();
  }

  /**
   * Run a function within a request scope
   * All request-scoped dependencies resolved within this function
   * will be isolated to this request.
   * 
   * @param fn - The function to run within the request scope
   * @returns The result of the function
   */
  run<T>(fn: () => T): T {
    const store = new Map<Token, unknown>();
    return this.asyncLocalStorage.run(store, fn);
  }

  /**
   * Run an async function within a request scope
   * 
   * @param fn - The async function to run within the request scope
   * @returns Promise resolving to the function result
   */
  async runAsync<T>(fn: () => Promise<T>): Promise<T> {
    const store = new Map<Token, unknown>();
    return this.asyncLocalStorage.run(store, fn);
  }

  /**
   * Check if we're currently inside a request scope
   */
  isInRequestScope(): boolean {
    return this.asyncLocalStorage.getStore() !== undefined;
  }

  /**
   * Get a request-scoped instance by token
   * 
   * @param token - The injection token
   * @returns The instance if found, undefined otherwise
   */
  get<T>(token: Token<T>): T | undefined {
    const store = this.asyncLocalStorage.getStore();
    if (!store) {
      return undefined;
    }
    return store.get(token) as T | undefined;
  }

  /**
   * Set a request-scoped instance
   * 
   * @param token - The injection token
   * @param instance - The instance to store
   * @throws Error if not in a request scope
   */
  set<T>(token: Token<T>, instance: T): void {
    const store = this.asyncLocalStorage.getStore();
    if (!store) {
      throw new Error(
        'Cannot set request-scoped instance outside of a request context. ' +
        'Make sure RequestScopeStorage.run() or runAsync() is being used.'
      );
    }
    store.set(token, instance);
  }

  /**
   * Check if a request-scoped instance exists
   * 
   * @param token - The injection token
   * @returns true if the instance exists in current request scope
   */
  has(token: Token): boolean {
    const store = this.asyncLocalStorage.getStore();
    return store?.has(token) ?? false;
  }

  /**
   * Get the current request store (for debugging/testing)
   * @internal
   */
  getStore(): Map<Token, unknown> | undefined {
    return this.asyncLocalStorage.getStore();
  }
}

/**
 * Global request scope storage instance
 */
export const requestScopeStorage = RequestScopeStorage.getInstance();

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Constructor type for class instantiation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * HTTP methods supported by the framework
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * Route handler context
 */
export interface RouteContext {
  request: FastifyRequest;
  reply: FastifyReply;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
}

/**
 * Route definition metadata
 */
export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handlerName: string | symbol;
  statusCode?: number;
}

/**
 * Controller metadata
 */
export interface ControllerMetadata {
  prefix: string;
  routes: RouteDefinition[];
}

/**
 * Provider scope for dependency injection
 */
export type ProviderScope = 'singleton' | 'transient' | 'request';

/**
 * Injectable options
 */
export interface InjectableOptions {
  /** Provider scope (default: 'singleton') */
  scope?: ProviderScope;
  
  /** 
   * Initialization priority (higher = initialized first)
   * Default: 0
   * 
   * @example
   * ```typescript
   * @Injectable({ priority: 100 })
   * class DatabaseService { }  // Initialized first
   * 
   * @Injectable({ priority: 50 })
   * class CacheService { }     // Initialized second
   * 
   * @Injectable()  // priority: 0
   * class UserService { }      // Initialized last
   * ```
   */
  priority?: number;
}

/**
 * Exception filter options
 */
export interface ExceptionFilterConfig {
  /** Include stack trace in error response (default: true in development) */
  includeStack?: boolean;
  
  /** Log errors to console (default: true) */
  logErrors?: boolean;
}

/**
 * Application configuration
 */
export interface RiktaConfig {
  /** Server port (default: 3000) */
  port?: number;
  
  /** Server host (default: '0.0.0.0') */
  host?: string;
  
  /** Enable Fastify logging (default: true) */
  logger?: boolean | object;
  
  /** Disable all framework console output (default: false) */
  silent?: boolean;
  
  /** Global route prefix (default: '') */
  prefix?: string;
  
  /**
   * Glob patterns for auto-discovery of controllers and services.
   * Files matching these patterns will be imported automatically.
   * 
   * @default ['./**'] (scans current directory recursively)
   * 
   * @example
   * ```typescript
   * // Scan specific directories
   * autowired: ['./src/controllers', './src/services']
   * 
   * // Scan with glob patterns
   * autowired: ['./src/**\/*.controller.ts', './src/**\/*.service.ts']
   * ```
   */
  autowired?: string[] | false;
  
  /**
   * Explicit list of controllers to register.
   * If not provided, all @Controller decorated classes are auto-discovered.
   */
  controllers?: Constructor[];
  
  /**
   * Additional providers to register.
   * Most providers are auto-discovered via @Injectable.
   * Use this for custom providers or manual registration.
   */
  providers?: Constructor[];
  
  /**
   * Exception filter configuration.
   * Controls how errors are handled and formatted.
   * 
   * @example
   * ```typescript
   * exceptionFilter: {
   *   includeStack: process.env.NODE_ENV !== 'production',
   *   logErrors: true
   * }
   * ```
   */
  exceptionFilter?: ExceptionFilterConfig;
  
  /**
   * Custom exception filters.
   * Filters are matched against exception types in order.
   * 
   * @example
   * ```typescript
   * exceptionFilters: [ValidationExceptionFilter, CustomErrorFilter]
   * ```
   */
  exceptionFilters?: Constructor[];
}

/**
 * Middleware function signature
 */
export type MiddlewareFunction = (
  request: FastifyRequest,
  reply: FastifyReply,
  next: () => Promise<void>
) => Promise<void> | void;

/**
 * Guard interface for route protection
 */
export interface Guard {
  canActivate(context: RouteContext): boolean | Promise<boolean>;
}

/**
 * Interceptor interface for request/response manipulation
 */
export interface Interceptor {
  intercept(context: RouteContext, next: () => Promise<unknown>): Promise<unknown>;
}

// Lifecycle interfaces are now in ./lifecycle/interfaces.ts
// Re-exported from ./lifecycle/index.ts for convenience

/**
 * Application instance interface
 */
export interface RiktaApplication {
  readonly server: FastifyInstance;
  listen(): Promise<string>;
  close(): Promise<void>;
  getUrl(): string;
}

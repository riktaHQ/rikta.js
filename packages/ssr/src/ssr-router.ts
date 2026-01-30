import 'reflect-metadata';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SsrService } from './ssr.service.js';
import type { SsrExtendedContext, Constructor, SsrOptions } from './types.js';
import {
  SSR_CONTROLLER_METADATA,
  SSR_ROUTE_METADATA,
} from './decorators/constants.js';
import type { SsrControllerMetadata } from './decorators/ssr-controller.decorator.js';
import type { SsrRouteMetadata, SsrRouteOptions } from './decorators/ssr.decorator.js';

// Use Symbol.for() for cross-package compatibility with @riktajs/core
const ROUTES_METADATA = Symbol.for('rikta:routes:metadata');
const PARAM_METADATA = Symbol.for('rikta:param:metadata');
const GUARDS_METADATA = Symbol.for('rikta:guards:metadata');
const MIDDLEWARE_METADATA = Symbol.for('rikta:middleware:metadata');
const INTERCEPTORS_METADATA = Symbol.for('rikta:interceptors:metadata');

/**
 * Container interface for dependency injection
 */
interface Container {
  resolve: <T>(token: Constructor<T>) => T;
}

/**
 * ExecutionContext interface for guards and interceptors
 */
interface ExecutionContext {
  switchToHttp(): HttpArgumentsHost;
  getRequest<T = FastifyRequest>(): T;
  getReply<T = FastifyReply>(): T;
  getClass(): Constructor;
  getHandler(): string | symbol;
  getMetadata<T = unknown>(key: string | symbol): T | undefined;
}

interface HttpArgumentsHost {
  getRequest<T = FastifyRequest>(): T;
  getResponse<T = FastifyReply>(): T;
}

/**
 * ExecutionContext implementation for SSR routes
 */
class SsrExecutionContext implements ExecutionContext {
  private readonly httpHost: HttpArgumentsHost;

  constructor(
    private readonly request: FastifyRequest,
    private readonly reply: FastifyReply,
    private readonly controllerClass: Constructor,
    private readonly handlerName: string | symbol,
  ) {
    this.httpHost = {
      getRequest: <T = FastifyRequest>() => this.request as T,
      getResponse: <T = FastifyReply>() => this.reply as T,
    };
  }

  switchToHttp(): HttpArgumentsHost {
    return this.httpHost;
  }

  getRequest<T = FastifyRequest>(): T {
    return this.request as T;
  }

  getReply<T = FastifyReply>(): T {
    return this.reply as T;
  }

  getClass(): Constructor {
    return this.controllerClass;
  }

  getHandler(): string | symbol {
    return this.handlerName;
  }

  getMetadata<T = unknown>(key: string | symbol): T | undefined {
    return Reflect.getMetadata(key, this.controllerClass, this.handlerName as string) as T | undefined;
  }
}

/**
 * CanActivate interface for guards
 */
interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/**
 * RiktaMiddleware interface
 */
interface RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void | Promise<void>): void | Promise<void>;
}

/**
 * CallHandler interface for interceptors
 */
interface CallHandler {
  handle(): Promise<unknown>;
}

/**
 * Interceptor interface
 */
interface Interceptor {
  intercept(context: ExecutionContext, next: CallHandler): Promise<unknown>;
}

type GuardClass = Constructor<CanActivate>;
type MiddlewareClass = Constructor<RiktaMiddleware>;
type InterceptorClass = Constructor<Interceptor>;

/**
 * Route definition from @riktajs/core
 */
interface RouteDefinition {
  method: string;
  path: string;
  handlerName: string | symbol;
}

/**
 * Parameter metadata from @riktajs/core
 */
interface ParamMetadata {
  type: string;
  index: number;
  key?: string;
  zodSchema?: { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } };
}

/**
 * Route context for parameter resolution
 */
interface RouteContext {
  request: FastifyRequest;
  reply: FastifyReply;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
}

/**
 * Merge controller defaults with route-specific options.
 * Route options take precedence over controller defaults.
 * For nested objects (og, twitter), properties are merged.
 * For arrays (head), they are concatenated (defaults first, then route-specific).
 */
function mergeRouteOptions(
  defaults: SsrRouteOptions,
  routeOptions: SsrRouteOptions | undefined
): SsrRouteOptions {
  if (!routeOptions) {
    return { ...defaults };
  }

  const merged: SsrRouteOptions = { ...defaults };

  // Simple properties - route takes precedence
  if (routeOptions.title !== undefined) merged.title = routeOptions.title;
  if (routeOptions.description !== undefined) merged.description = routeOptions.description;
  if (routeOptions.canonical !== undefined) merged.canonical = routeOptions.canonical;
  if (routeOptions.robots !== undefined) merged.robots = routeOptions.robots;

  // Nested objects - merge properties
  if (routeOptions.og !== undefined) {
    merged.og = { ...defaults.og, ...routeOptions.og };
  }
  if (routeOptions.twitter !== undefined) {
    merged.twitter = { ...defaults.twitter, ...routeOptions.twitter };
  }
  if (routeOptions.cache !== undefined) {
    merged.cache = { ...defaults.cache, ...routeOptions.cache };
  }

  // Arrays - concatenate (defaults first, then route-specific)
  if (routeOptions.head !== undefined) {
    merged.head = [...(defaults.head ?? []), ...routeOptions.head];
  }

  return merged;
}

/**
 * SSR Router
 *
 * Registers SSR controllers with Fastify and handles SSR rendering.
 * Integrates with @riktajs/core's decorator system including guards,
 * middleware, and interceptors.
 *
 * @example
 * ```typescript
 * const router = new SsrRouter(fastify, ssrService, globalOptions, container);
 * router.registerController(PageController);
 * ```
 */
export class SsrRouter {
  /** Cache for guard instances (singleton per guard class) */
  private readonly guardCache = new Map<GuardClass, CanActivate>();
  
  /** Cache for middleware instances (singleton per middleware class) */
  private readonly middlewareCache = new Map<MiddlewareClass, RiktaMiddleware>();

  /** Cache for interceptor instances (singleton per interceptor class) */
  private readonly interceptorCache = new Map<InterceptorClass, Interceptor>();

  constructor(
    private readonly server: FastifyInstance,
    private readonly ssrService: SsrService,
    private readonly globalOptions: SsrOptions,
    private readonly container?: Container
  ) {}

  /**
   * Register an SSR controller
   */
  registerController(controllerClass: Constructor, silent: boolean = false): void {
    // Get SSR controller metadata
    const ssrMeta = Reflect.getMetadata(
      SSR_CONTROLLER_METADATA,
      controllerClass
    ) as SsrControllerMetadata | undefined;

    if (!ssrMeta) {
      throw new Error(
        `${controllerClass.name} is not decorated with @SsrController(). ` +
          `Make sure to add the decorator.`
      );
    }

    // Resolve controller instance
    let controllerInstance: unknown;
    if (this.container) {
      controllerInstance = this.container.resolve(controllerClass);
    } else {
      // Fallback: create instance directly
      controllerInstance = new controllerClass();
    }

    // Get routes metadata
    const routes: RouteDefinition[] =
      Reflect.getMetadata(ROUTES_METADATA, controllerClass) ?? [];

    // Register each route
    for (const route of routes) {
      this.registerSsrRoute(
        controllerClass,
        controllerInstance,
        ssrMeta,
        route,
        silent
      );
    }
  }

  /**
   * Register a single SSR route
   */
  private registerSsrRoute(
    controllerClass: Constructor,
    controllerInstance: unknown,
    ssrMeta: SsrControllerMetadata,
    route: RouteDefinition,
    silent: boolean
  ): void {
    const fullPath = this.buildPath(ssrMeta.prefix, route.path);

    // Get the handler method
    const handler = (controllerInstance as Record<string | symbol, Function>)[
      route.handlerName
    ];
    if (typeof handler !== 'function') {
      throw new Error(
        `Handler ${String(route.handlerName)} not found on ${controllerClass.name}`
      );
    }

    // Get SSR route metadata (if @Ssr() decorator was used)
    const ssrRouteMeta = Reflect.getMetadata(
      SSR_ROUTE_METADATA,
      controllerClass,
      route.handlerName
    ) as SsrRouteMetadata | undefined;

    // Get parameter metadata
    const paramsMeta: ParamMetadata[] =
      Reflect.getMetadata(PARAM_METADATA, controllerClass, route.handlerName) ?? [];

    // Get guards for this route (controller-level + method-level)
    const guards = this.getGuardsMetadata(controllerClass, route.handlerName);
    
    // Get middleware for this route (controller-level + method-level)
    const middleware = this.getMiddlewareMetadata(controllerClass, route.handlerName);
    
    // Get interceptors for this route (controller-level + method-level)
    const interceptors = this.getInterceptorsMetadata(controllerClass, route.handlerName);

    // Pre-resolve guard instances
    const guardInstances = this.resolveGuardInstances(guards);
    const hasGuards = guardInstances.length > 0;

    // Pre-resolve middleware instances
    const middlewareInstances = this.resolveMiddlewareInstances(middleware);
    const hasMiddleware = middlewareInstances.length > 0;

    // Pre-resolve interceptor instances
    const interceptorInstances = this.resolveInterceptorInstances(interceptors);
    const hasInterceptors = interceptorInstances.length > 0;

    // Merge SSR options: global -> controller -> route
    const mergedSsrOptions = {
      ...this.globalOptions,
      ...ssrMeta.ssrOptions,
    };

    // Merge route options: controller defaults -> @Ssr() decorator options
    const mergedRouteOptions = mergeRouteOptions(
      ssrMeta.defaults,
      ssrRouteMeta?.options
    );

    // Create the route handler
    const ssrHandler = async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<unknown> => {
      try {
        // Create execution context for guards and interceptors
        const executionContext = new SsrExecutionContext(
          request,
          reply,
          controllerClass,
          route.handlerName
        );

        // 1. Execute guards (if any)
        if (hasGuards) {
          await this.executeGuards(guardInstances, executionContext);
        }

        // 2. Execute middleware (if any)
        if (hasMiddleware) {
          await this.executeMiddlewareChain(middlewareInstances, request, reply);
        }

        // 3. Prepare the core handler function
        const coreHandler = async (): Promise<unknown> => {
          // Resolve parameters
          const args = this.resolveParams(paramsMeta, request, reply);

          // Call the controller method to get context data
          return await handler.apply(controllerInstance, args);
        };

        // 4. Execute with interceptors or directly
        let contextData: unknown;
        if (hasInterceptors) {
          contextData = await this.executeInterceptorChain(
            interceptorInstances,
            executionContext,
            coreHandler
          );
        } else {
          contextData = await coreHandler();
        }

        // Check if client is requesting just the data (for client-side navigation)
        const wantsData = request.headers['x-rikta-data'] === '1';

        if (wantsData) {
          // Return just the data as JSON for client-side navigation
          const responseData: Record<string, unknown> = {
            data: contextData,
            url: request.url,
          };

          // Add metadata from merged options (controller defaults + @Ssr decorator)
          if (mergedRouteOptions.title !== undefined) {
            responseData.title = mergedRouteOptions.title;
          }
          if (mergedRouteOptions.description !== undefined) {
            responseData.description = mergedRouteOptions.description;
          }

          return reply.type('application/json').send(responseData);
        }

        // Build extended context for SSR
        // Decorator metadata takes precedence over contextData
        const context: SsrExtendedContext = {
          url: request.url,
          ...(contextData as Record<string, unknown> || {}),
          // Include data for hydration
          __SSR_DATA__: contextData as Record<string, unknown> | undefined,
        };

        // Apply merged route options (controller defaults + @Ssr decorator)
        if (mergedRouteOptions.title !== undefined) {
          context.title = mergedRouteOptions.title;
        }
        if (mergedRouteOptions.description !== undefined) {
          context.description = mergedRouteOptions.description;
        }
        if (mergedRouteOptions.og !== undefined) {
          context.og = mergedRouteOptions.og;
        }
        if (mergedRouteOptions.twitter !== undefined) {
          context.twitter = mergedRouteOptions.twitter;
        }
        if (mergedRouteOptions.canonical !== undefined) {
          context.canonical = mergedRouteOptions.canonical;
        }
        if (mergedRouteOptions.robots !== undefined) {
          context.robots = mergedRouteOptions.robots;
        }
        if (mergedRouteOptions.head !== undefined) {
          context.head = mergedRouteOptions.head;
        }

        // Render SSR
        const html = await this.ssrService.render(request.url, context);

        // Set cache headers if configured
        if (mergedRouteOptions.cache) {
          const { maxAge, staleWhileRevalidate } = mergedRouteOptions.cache;
          const cacheControl: string[] = [];

          if (maxAge !== undefined) {
            cacheControl.push(`max-age=${maxAge}`);
          }
          if (staleWhileRevalidate !== undefined) {
            cacheControl.push(`stale-while-revalidate=${staleWhileRevalidate}`);
          }

          if (cacheControl.length > 0) {
            reply.header('Cache-Control', cacheControl.join(', '));
          }
        }

        return reply.type('text/html').send(html);
      } catch (error) {
        // Check if this is an HTTP exception (like ForbiddenException)
        const httpError = error as { statusCode?: number; message?: string; getStatus?: () => number; getResponse?: () => unknown };
        
        // Get status code from various exception formats
        const statusCode = httpError.statusCode 
          ?? (typeof httpError.getStatus === 'function' ? httpError.getStatus() : undefined)
          ?? 500;
        
        // Log error (don't log 4xx client errors as server errors)
        if (statusCode >= 500) {
          this.server.log.error(error);
        }

        // Get error message
        const errorMessage = typeof httpError.getResponse === 'function'
          ? (typeof httpError.getResponse() === 'string' ? httpError.getResponse() : (httpError.getResponse() as { message?: string })?.message)
          : httpError.message ?? 'An error occurred';

        // Return appropriate error page based on status code
        if (statusCode === 403) {
          return reply.status(403).type('text/html').send(`
            <!DOCTYPE html>
            <html>
              <head><title>Access Denied</title></head>
              <body>
                <h1>403 - Access Denied</h1>
                <p>${errorMessage}</p>
              </body>
            </html>
          `);
        }

        if (statusCode === 401) {
          return reply.status(401).type('text/html').send(`
            <!DOCTYPE html>
            <html>
              <head><title>Unauthorized</title></head>
              <body>
                <h1>401 - Unauthorized</h1>
                <p>${errorMessage}</p>
              </body>
            </html>
          `);
        }

        if (statusCode === 404) {
          return reply.status(404).type('text/html').send(`
            <!DOCTYPE html>
            <html>
              <head><title>Not Found</title></head>
              <body>
                <h1>404 - Not Found</h1>
                <p>${errorMessage}</p>
              </body>
            </html>
          `);
        }

        // Default server error page
        return reply.status(statusCode).type('text/html').send(`
          <!DOCTYPE html>
          <html>
            <head><title>Server Error</title></head>
            <body>
              <h1>${statusCode} - Server Error</h1>
              <p>An error occurred while rendering this page.</p>
              ${mergedSsrOptions.dev ? `<pre>${error instanceof Error ? error.stack : String(error)}</pre>` : ''}
            </body>
          </html>
        `);
      }
    };

    // Register with Fastify
    const method = route.method.toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'delete'
      | 'patch';
    this.server[method](fullPath, ssrHandler);

    // Log route registration
    if (!silent) {
      console.log(`  → ${route.method.padEnd(7)} ${fullPath} (SSR)`);
    }
  }

  /**
   * Build full path from prefix and route path
   */
  private buildPath(prefix: string, routePath: string): string {
    // Normalize paths
    const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;

    // Combine
    const fullPath = normalizedPrefix + normalizedPath;

    // Ensure path starts with /
    return fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
  }

  /**
   * Resolve route parameters
   */
  private resolveParams(
    paramsMeta: ParamMetadata[],
    request: FastifyRequest,
    reply: FastifyReply
  ): unknown[] {
    if (paramsMeta.length === 0) return [];

    const context: RouteContext = {
      request,
      reply,
      params: request.params as Record<string, string>,
      query: request.query as Record<string, unknown>,
      body: request.body,
    };

    // Find max index
    const maxIndex = Math.max(...paramsMeta.map((p) => p.index));
    const args = new Array(maxIndex + 1);

    for (const param of paramsMeta) {
      let value: unknown;

      switch (param.type) {
        case 'body':
          value = param.key
            ? (context.body as Record<string, unknown>)?.[param.key]
            : context.body;
          break;
        case 'query':
          value = param.key ? context.query[param.key] : context.query;
          break;
        case 'param':
          value = param.key ? context.params[param.key] : context.params;
          break;
        case 'headers':
          const headerKey = param.key?.toLowerCase();
          value = headerKey
            ? context.request.headers[headerKey]
            : context.request.headers;
          break;
        case 'request':
          value = context.request;
          break;
        case 'reply':
          value = context.reply;
          break;
        case 'context':
          value = context;
          break;
        default:
          value = undefined;
      }

      // Validate with Zod if schema present
      if (param.zodSchema && value !== undefined) {
        const result = param.zodSchema.safeParse(value);
        if (result.success) {
          value = result.data;
        }
      }

      args[param.index] = value;
    }

    return args;
  }

  /**
   * Get guards metadata from a controller class and/or method
   */
  private getGuardsMetadata(
    target: Constructor, 
    propertyKey?: string | symbol
  ): GuardClass[] {
    // Get class-level guards
    const classGuards: GuardClass[] = 
      Reflect.getMetadata(GUARDS_METADATA, target) ?? [];
    
    if (!propertyKey) {
      return classGuards;
    }
    
    // Get method-level guards
    const methodGuards: GuardClass[] = 
      Reflect.getMetadata(GUARDS_METADATA, target, propertyKey) ?? [];
    
    // Combine: class guards run first, then method guards
    return [...classGuards, ...methodGuards];
  }

  /**
   * Get middleware metadata from a controller class and/or method
   */
  private getMiddlewareMetadata(
    target: Constructor, 
    propertyKey?: string | symbol
  ): MiddlewareClass[] {
    // Get class-level middleware
    const classMiddleware: MiddlewareClass[] = 
      Reflect.getMetadata(MIDDLEWARE_METADATA, target) ?? [];
    
    if (!propertyKey) {
      return classMiddleware;
    }
    
    // Get method-level middleware
    const methodMiddleware: MiddlewareClass[] = 
      Reflect.getMetadata(MIDDLEWARE_METADATA, target, propertyKey) ?? [];
    
    // Combine: class middleware runs first, then method middleware
    return [...classMiddleware, ...methodMiddleware];
  }

  /**
   * Get interceptors metadata from a controller class and/or method
   */
  private getInterceptorsMetadata(
    target: Constructor, 
    propertyKey?: string | symbol
  ): InterceptorClass[] {
    // Get class-level interceptors
    const classInterceptors: InterceptorClass[] = 
      Reflect.getMetadata(INTERCEPTORS_METADATA, target) ?? [];
    
    if (!propertyKey) {
      return classInterceptors;
    }
    
    // Get method-level interceptors
    const methodInterceptors: InterceptorClass[] = 
      Reflect.getMetadata(INTERCEPTORS_METADATA, target, propertyKey) ?? [];
    
    // Combine: class interceptors run first, then method interceptors
    return [...classInterceptors, ...methodInterceptors];
  }

  /**
   * Pre-resolve guard instances at route registration
   */
  private resolveGuardInstances(guards: GuardClass[]): CanActivate[] {
    return guards.map(guard => {
      // If it's already an instance (has canActivate method), return it directly
      if (typeof guard === 'object' && guard !== null && typeof (guard as any).canActivate === 'function') {
        return guard as unknown as CanActivate;
      }
      
      const GuardClass = guard as new (...args: any[]) => CanActivate;
      
      // Check cache first
      let instance = this.guardCache.get(GuardClass);
      if (instance) return instance;

      // Resolve from container or create directly
      if (this.container) {
        try {
          instance = this.container.resolve(GuardClass) as CanActivate;
        } catch (error) {
          throw new Error(
            `Failed to resolve guard ${GuardClass.name}. ` +
            `Make sure it is decorated with @Injectable(). ` +
            `Original error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        // Fallback: create instance directly
        instance = new GuardClass() as CanActivate;
      }

      // Verify interface
      if (typeof instance.canActivate !== 'function') {
        throw new Error(
          `${GuardClass.name} does not implement CanActivate interface. ` +
          `The guard must have a canActivate(context: ExecutionContext) method.`
        );
      }

      // Cache for future use
      this.guardCache.set(GuardClass, instance);
      return instance;
    });
  }

  /**
   * Pre-resolve middleware instances at route registration
   */
  private resolveMiddlewareInstances(middleware: MiddlewareClass[]): RiktaMiddleware[] {
    return middleware.map(mw => {
      // If it's already an instance (has use method), return it directly
      if (typeof mw === 'object' && mw !== null && typeof (mw as any).use === 'function') {
        return mw as unknown as RiktaMiddleware;
      }
      
      const MiddlewareClass = mw as new (...args: any[]) => RiktaMiddleware;
      
      // Check cache first
      let instance = this.middlewareCache.get(MiddlewareClass);
      if (instance) return instance;

      // Resolve from container or create directly
      if (this.container) {
        try {
          instance = this.container.resolve(MiddlewareClass) as RiktaMiddleware;
        } catch (error) {
          throw new Error(
            `Failed to resolve middleware ${MiddlewareClass.name}. ` +
            `Make sure it is decorated with @Injectable(). ` +
            `Original error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        // Fallback: create instance directly
        instance = new MiddlewareClass() as RiktaMiddleware;
      }

      // Verify interface
      if (typeof instance.use !== 'function') {
        throw new Error(
          `${MiddlewareClass.name} does not implement RiktaMiddleware interface. ` +
          `The middleware must have a use(req, res, next) method.`
        );
      }

      // Cache for future use
      this.middlewareCache.set(MiddlewareClass, instance);
      return instance;
    });
  }

  /**
   * Pre-resolve interceptor instances at route registration
   */
  private resolveInterceptorInstances(interceptors: InterceptorClass[]): Interceptor[] {
    return interceptors.map(int => {
      // If it's already an instance (has intercept method), return it directly
      if (typeof int === 'object' && int !== null && typeof (int as any).intercept === 'function') {
        return int as unknown as Interceptor;
      }
      
      const InterceptorClass = int as new (...args: any[]) => Interceptor;
      
      // Check cache first
      let instance = this.interceptorCache.get(InterceptorClass);
      if (instance) return instance;

      // Resolve from container or create directly
      if (this.container) {
        try {
          instance = this.container.resolve(InterceptorClass) as Interceptor;
        } catch (error) {
          throw new Error(
            `Failed to resolve interceptor ${InterceptorClass.name}. ` +
            `Make sure it is decorated with @Injectable(). ` +
            `Original error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        // Fallback: create instance directly
        instance = new InterceptorClass() as Interceptor;
      }

      // Verify interface
      if (typeof instance.intercept !== 'function') {
        throw new Error(
          `${InterceptorClass.name} does not implement Interceptor interface. ` +
          `The interceptor must have an intercept(context, next) method.`
        );
      }

      // Cache for future use
      this.interceptorCache.set(InterceptorClass, instance);
      return instance;
    });
  }

  /**
   * Execute guards in order
   * Throws ForbiddenException if any guard returns false
   */
  private async executeGuards(
    guardInstances: CanActivate[],
    context: ExecutionContext
  ): Promise<void> {
    for (let i = 0; i < guardInstances.length; i++) {
      const result = await guardInstances[i].canActivate(context);
      if (result !== true) {
        // Create a simple error that mimics ForbiddenException
        const error = new Error('Access denied by guard') as Error & { statusCode: number };
        error.statusCode = 403;
        throw error;
      }
    }
  }

  /**
   * Execute middleware chain in order
   * Each middleware must call next() to continue
   */
  private async executeMiddlewareChain(
    middlewareInstances: RiktaMiddleware[],
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < middlewareInstances.length) {
        const middleware = middlewareInstances[index++];
        await middleware.use(request, reply, next);
      }
    };

    await next();
  }

  /**
   * Execute interceptor chain
   * Each interceptor wraps around the next, creating an onion-like execution
   */
  private async executeInterceptorChain(
    interceptorInstances: Interceptor[],
    context: ExecutionContext,
    coreHandler: () => Promise<unknown>
  ): Promise<unknown> {
    // Build the chain from the inside out
    // Last interceptor wraps the core handler
    // First interceptor is the outermost wrapper
    let handler = coreHandler;

    for (let i = interceptorInstances.length - 1; i >= 0; i--) {
      const interceptor = interceptorInstances[i];
      const nextHandler = handler;
      
      handler = () => {
        const callHandler: CallHandler = {
          handle: () => nextHandler()
        };
        return interceptor.intercept(context, callHandler);
      };
    }

    return handler();
  }
}

import 'reflect-metadata';
import { ForbiddenException, requestScopeStorage } from '@riktajs/core';
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
  getProviderScope?: <T>(token: Constructor<T>) => 'singleton' | 'transient' | 'request' | undefined;
  hasRequestScopedProviders?: () => boolean;
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

interface CompiledParamResolver {
  index: number;
  extract: (context: RouteContext) => unknown;
  zodSchema?: ParamMetadata['zodSchema'];
}

type InstanceResolver<T> = () => T;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  if (routeOptions.meta !== undefined) merged.meta = { ...(defaults.meta ?? {}), ...routeOptions.meta };

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
  ) { }

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

    // Get routes metadata
    const routes: RouteDefinition[] =
      Reflect.getMetadata(ROUTES_METADATA, controllerClass) ?? [];

    // Register each route
    for (const route of routes) {
      this.registerSsrRoute(
        controllerClass,
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
    ssrMeta: SsrControllerMetadata,
    route: RouteDefinition,
    silent: boolean
  ): void {
    const fullPath = this.buildPath(ssrMeta.prefix, route.path);

    const handler = (controllerClass.prototype as Record<string | symbol, unknown>)[route.handlerName];
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

    const compiledParamResolvers = this.compileParamResolvers(paramsMeta);
    const hasParams = compiledParamResolvers.length > 0;
    const maxParamIndex = hasParams
      ? Math.max(...compiledParamResolvers.map((resolver) => resolver.index))
      : -1;

    // Pre-resolve guard instances
    const guardResolvers = this.resolveGuardInstances(guards);
    const hasGuards = guardResolvers.length > 0;

    // Pre-resolve middleware instances
    const middlewareResolvers = this.resolveMiddlewareInstances(middleware);
    const hasMiddleware = middlewareResolvers.length > 0;

    // Pre-resolve interceptor instances
    const interceptorResolvers = this.resolveInterceptorInstances(interceptors);
    const hasInterceptors = interceptorResolvers.length > 0;

    const shouldUseRequestScope = this.container?.hasRequestScopedProviders?.() ?? false;

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

    const executeHandler = async (
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
          await this.executeGuards(guardResolvers, executionContext);
        }

        // 2. Execute middleware (if any)
        if (hasMiddleware) {
          await this.executeMiddlewareChain(middlewareResolvers, request, reply);
        }

        // 3. Prepare the core handler function
        const coreHandler = async (): Promise<unknown> => {
          const controllerInstance = this.container
            ? this.container.resolve(controllerClass)
            : new controllerClass();

          const resolvedHandler = (controllerInstance as Record<string | symbol, unknown>)[route.handlerName];
          if (typeof resolvedHandler !== 'function') {
            throw new Error(
              `Handler ${String(route.handlerName)} not found on ${controllerClass.name}`
            );
          }

          const args = hasParams
            ? this.resolveParams(compiledParamResolvers, maxParamIndex, request, reply)
            : [];

          // Call the controller method to get context data
          return await resolvedHandler.apply(controllerInstance, args);
        };

        // 4. Execute with interceptors or directly
        let contextData: unknown;
        if (hasInterceptors) {
          contextData = await this.executeInterceptorChain(
            interceptorResolvers,
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
        if (mergedRouteOptions.meta !== undefined) {
          context.meta = mergedRouteOptions.meta;
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
        const html = await this.ssrService.render(request.url, context, mergedSsrOptions);

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
        const rawErrorMessage = typeof httpError.getResponse === 'function'
          ? (typeof httpError.getResponse() === 'string' ? httpError.getResponse() : (httpError.getResponse() as { message?: string })?.message)
          : httpError.message ?? 'An error occurred';
        const errorMessage = typeof rawErrorMessage === 'string' ? rawErrorMessage : 'An error occurred';
        const safeErrorMessage = escapeHtml(errorMessage);
        const safeStack = escapeHtml(error instanceof Error ? error.stack ?? error.message : String(error));

        // Return appropriate error page based on status code
        if (statusCode === 403) {
          return reply.status(403).type('text/html').send(`
            <!DOCTYPE html>
            <html>
              <head><title>Access Denied</title></head>
              <body>
                <h1>403 - Access Denied</h1>
                <p>${safeErrorMessage}</p>
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
                <p>${safeErrorMessage}</p>
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
                <p>${safeErrorMessage}</p>
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
              ${mergedSsrOptions.dev ? `<pre>${safeStack}</pre>` : ''}
            </body>
          </html>
        `);
      }
    };

    const ssrHandler = shouldUseRequestScope
      ? (request: FastifyRequest, reply: FastifyReply) =>
        requestScopeStorage.runAsync(() => executeHandler(request, reply))
      : executeHandler;

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
  private compileParamResolvers(paramsMeta: ParamMetadata[]): CompiledParamResolver[] {
    return paramsMeta.map((param) => ({
      index: param.index,
      zodSchema: param.zodSchema,
      extract: this.createParamExtractor(param),
    }));
  }

  private createParamExtractor(param: ParamMetadata): (context: RouteContext) => unknown {
    switch (param.type) {
      case 'body':
        return param.key
          ? (context) => (context.body as Record<string, unknown> | undefined)?.[param.key!]
          : (context) => context.body;
      case 'query':
        return param.key
          ? (context) => context.query[param.key!]
          : (context) => context.query;
      case 'param':
        return param.key
          ? (context) => context.params[param.key!]
          : (context) => context.params;
      case 'headers': {
        const headerKey = param.key?.toLowerCase();
        return headerKey
          ? (context) => context.request.headers[headerKey]
          : (context) => context.request.headers;
      }
      case 'request':
        return (context) => context.request;
      case 'reply':
        return (context) => context.reply;
      case 'context':
        return (context) => context;
      default:
        return () => undefined;
    }
  }

  private resolveParams(
    compiledResolvers: CompiledParamResolver[],
    maxIndex: number,
    request: FastifyRequest,
    reply: FastifyReply
  ): unknown[] {
    if (compiledResolvers.length === 0) return [];

    const context: RouteContext = {
      request,
      reply,
      params: request.params as Record<string, string>,
      query: request.query as Record<string, unknown>,
      body: request.body,
    };

    const args = new Array(maxIndex + 1);

    for (const resolver of compiledResolvers) {
      let value = resolver.extract(context);

      // Validate with Zod if schema present
      if (resolver.zodSchema && value !== undefined) {
        const result = resolver.zodSchema.safeParse(value);
        if (result.success) {
          value = result.data;
        }
      }

      args[resolver.index] = value;
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
  private resolveGuardInstances(guards: GuardClass[]): Array<InstanceResolver<CanActivate>> {
    return guards.map(guard => {
      // If it's already an instance (has canActivate method), return it directly
      if (typeof guard === 'object' && guard !== null && typeof (guard as any).canActivate === 'function') {
        const instance = guard as unknown as CanActivate;
        return () => instance;
      }

      const GuardClass = guard as new (...args: any[]) => CanActivate;
      const scope = this.container?.getProviderScope?.(GuardClass) ?? 'singleton';

      if (scope === 'singleton') {
        let instance = this.guardCache.get(GuardClass);
        if (!instance) {
          instance = this.resolveGuardInstance(GuardClass);
          this.guardCache.set(GuardClass, instance);
        }

        return () => instance as CanActivate;
      }

      return () => this.resolveGuardInstance(GuardClass);
    });
  }

  private resolveGuardInstance(GuardClass: new (...args: any[]) => CanActivate): CanActivate {
    let instance: CanActivate;

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
      instance = new GuardClass() as CanActivate;
    }

    if (typeof instance.canActivate !== 'function') {
      throw new Error(
        `${GuardClass.name} does not implement CanActivate interface. ` +
        `The guard must have a canActivate(context: ExecutionContext) method.`
      );
    }

    return instance;
  }

  /**
   * Pre-resolve middleware instances at route registration
   */
  private resolveMiddlewareInstances(middleware: MiddlewareClass[]): Array<InstanceResolver<RiktaMiddleware>> {
    return middleware.map(mw => {
      // If it's already an instance (has use method), return it directly
      if (typeof mw === 'object' && mw !== null && typeof (mw as any).use === 'function') {
        const instance = mw as unknown as RiktaMiddleware;
        return () => instance;
      }

      const MiddlewareClass = mw as new (...args: any[]) => RiktaMiddleware;
      const scope = this.container?.getProviderScope?.(MiddlewareClass) ?? 'singleton';

      if (scope === 'singleton') {
        let instance = this.middlewareCache.get(MiddlewareClass);
        if (!instance) {
          instance = this.resolveMiddlewareInstance(MiddlewareClass);
          this.middlewareCache.set(MiddlewareClass, instance);
        }

        return () => instance as RiktaMiddleware;
      }

      return () => this.resolveMiddlewareInstance(MiddlewareClass);
    });
  }

  private resolveMiddlewareInstance(MiddlewareClass: new (...args: any[]) => RiktaMiddleware): RiktaMiddleware {
    let instance: RiktaMiddleware;

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
      instance = new MiddlewareClass() as RiktaMiddleware;
    }

    if (typeof instance.use !== 'function') {
      throw new Error(
        `${MiddlewareClass.name} does not implement RiktaMiddleware interface. ` +
        `The middleware must have a use(req, res, next) method.`
      );
    }

    return instance;
  }

  /**
   * Pre-resolve interceptor instances at route registration
   */
  private resolveInterceptorInstances(interceptors: InterceptorClass[]): Array<InstanceResolver<Interceptor>> {
    return interceptors.map(int => {
      // If it's already an instance (has intercept method), return it directly
      if (typeof int === 'object' && int !== null && typeof (int as any).intercept === 'function') {
        const instance = int as unknown as Interceptor;
        return () => instance;
      }

      const InterceptorClass = int as new (...args: any[]) => Interceptor;
      const scope = this.container?.getProviderScope?.(InterceptorClass) ?? 'singleton';

      if (scope === 'singleton') {
        let instance = this.interceptorCache.get(InterceptorClass);
        if (!instance) {
          instance = this.resolveInterceptorInstance(InterceptorClass);
          this.interceptorCache.set(InterceptorClass, instance);
        }

        return () => instance as Interceptor;
      }

      return () => this.resolveInterceptorInstance(InterceptorClass);
    });
  }

  private resolveInterceptorInstance(InterceptorClass: new (...args: any[]) => Interceptor): Interceptor {
    let instance: Interceptor;

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
      instance = new InterceptorClass() as Interceptor;
    }

    if (typeof instance.intercept !== 'function') {
      throw new Error(
        `${InterceptorClass.name} does not implement Interceptor interface. ` +
        `The interceptor must have an intercept(context, next) method.`
      );
    }

    return instance;
  }

  /**
   * Execute guards in order
   * Throws ForbiddenException if any guard returns false
   */
  private async executeGuards(
    guardResolvers: Array<InstanceResolver<CanActivate>>,
    context: ExecutionContext
  ): Promise<void> {
    for (let i = 0; i < guardResolvers.length; i++) {
      const result = await guardResolvers[i]().canActivate(context);
      if (result !== true) {
        throw new ForbiddenException('Access denied by guard');
      }
    }
  }

  /**
   * Execute middleware chain in order
   * Each middleware must call next() to continue
   */
  private async executeMiddlewareChain(
    middlewareResolvers: Array<InstanceResolver<RiktaMiddleware>>,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < middlewareResolvers.length) {
        const middleware = middlewareResolvers[index++]();
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
    interceptorResolvers: Array<InstanceResolver<Interceptor>>,
    context: ExecutionContext,
    coreHandler: () => Promise<unknown>
  ): Promise<unknown> {
    // Build the chain from the inside out
    // Last interceptor wraps the core handler
    // First interceptor is the outermost wrapper
    let handler = coreHandler;

    for (let i = interceptorResolvers.length - 1; i >= 0; i--) {
      const interceptor = interceptorResolvers[i]();
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

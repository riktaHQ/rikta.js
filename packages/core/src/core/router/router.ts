import 'reflect-metadata';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Container } from '../container/container.js';
import { requestScopeStorage } from '../container/request-scope.js';
import {
  CONTROLLER_METADATA,
  ROUTES_METADATA,
  PARAM_METADATA,
  HTTP_CODE_METADATA,
  ParamType
} from '../constants.js';
import { Constructor, RouteDefinition, RouteContext } from '../types.js';
import { ParamMetadata } from '../decorators/param.decorator.js';
import { getCustomParamMetadata, CustomParamMetadata } from '../decorators/create-param-decorator.js';
import { ValidationException } from '../exceptions/validation.exception.js';
import { ForbiddenException } from '../exceptions/exceptions.js';
import { ExecutionContext, ExecutionContextImpl } from '../guards/execution-context.js';
import { getGuardsMetadata, GuardClass } from '../guards/use-guards.decorator.js';
import type { CanActivate } from '../guards/can-activate.interface.js';
import { getMiddlewareMetadata, MiddlewareClass } from '../middleware/use-middleware.decorator.js';
import type { RiktaMiddleware } from '../middleware/rikta-middleware.interface.js';
import { getInterceptorsMetadata, InterceptorClass } from '../interceptors/use-interceptors.decorator.js';
import type { Interceptor, CallHandler } from '../interceptors/interceptor.interface.js';

/**
 * Compiled parameter extractor function type
 * Pre-compiled for maximum performance
 */

/**
 * Compiled parameter extractor function type
 * Pre-compiled for maximum performance
 */
type ParamExtractor = (context: RouteContext) => unknown;

/**
 * Resolver that returns the component instance to use for the current request.
 */
type InstanceResolver<T> = () => T;

/**
 * Compiled route handler type
 */
type CompiledHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

/**
 * Pre-compiled parameter resolver
 */
interface CompiledParamResolver {
  index: number;
  extract: ParamExtractor;
  zodSchema?: ParamMetadata['zodSchema'];
  validationLabel: string;
}

/**
 * Router class
 * 
 * Responsible for:
 * - Scanning controllers for route metadata
 * - Registering routes with Fastify
 * - Handling parameter injection
 * 
 * Performance optimizations:
 * - Pre-compiled parameter extractors
 * - Guard instance caching
 * - Middleware instance caching
 * - Interceptor instance caching
 * - Fast path for simple routes
 */
export class Router {
  /** Cache for guard instances (singleton per guard class) */
  private readonly guardCache = new Map<GuardClass, CanActivate>();

  /** Cache for middleware instances (singleton per middleware class) */
  private readonly middlewareCache = new Map<MiddlewareClass, RiktaMiddleware>();

  /** Cache for interceptor instances (singleton per interceptor class) */
  private readonly interceptorCache = new Map<InterceptorClass, Interceptor>();

  constructor(
    private readonly server: FastifyInstance,
    private readonly container: Container,
    private readonly globalPrefix: string = ''
  ) { }

  /**
   * Clear the guard instance cache
   * Useful for testing when you need fresh guard instances
   */
  clearGuardCache(): void {
    this.guardCache.clear();
  }

  /**
   * Clear the middleware instance cache
   * Useful for testing when you need fresh middleware instances
   */
  clearMiddlewareCache(): void {
    this.middlewareCache.clear();
  }

  /**
   * Clear the interceptor instance cache
   * Useful for testing when you need fresh interceptor instances
   */
  clearInterceptorCache(): void {
    this.interceptorCache.clear();
  }

  /**
   * Clear all caches (guards, middleware, and interceptors)
   * Useful for testing or hot-reload scenarios
   */
  clearAllCaches(): void {
    this.guardCache.clear();
    this.middlewareCache.clear();
    this.interceptorCache.clear();
  }

  /**
   * Get the number of cached guard instances
   */
  getGuardCacheSize(): number {
    return this.guardCache.size;
  }

  /**
   * Get the number of cached middleware instances
   */
  getMiddlewareCacheSize(): number {
    return this.middlewareCache.size;
  }

  /**
   * Get the number of cached interceptor instances
   */
  getInterceptorCacheSize(): number {
    return this.interceptorCache.size;
  }

  /**
   * Register all routes from a controller
   */
  registerController(controllerClass: Constructor, silent: boolean = false): void {
    // Get controller metadata
    const controllerMeta = Reflect.getMetadata(CONTROLLER_METADATA, controllerClass);
    if (!controllerMeta) {
      throw new Error(
        `${controllerClass.name} is not decorated with @Controller(). ` +
        `Make sure to add the decorator.`
      );
    }

    // Get routes metadata
    const routes: RouteDefinition[] =
      Reflect.getMetadata(ROUTES_METADATA, controllerClass) ?? [];

    // Register each route
    for (const route of routes) {
      this.registerRoute(controllerClass, controllerMeta.prefix, route, silent);
    }
  }

  /**
   * Register a single route
   */
  private registerRoute(
    controllerClass: Constructor,
    controllerPrefix: string,
    route: RouteDefinition,
    silent: boolean = false
  ): void {
    // Build full path
    const fullPath = this.buildPath(controllerPrefix, route.path);

    // Get the handler method
    const handler = (controllerClass.prototype as Record<string | symbol, Function>)[route.handlerName];
    if (typeof handler !== 'function') {
      throw new Error(
        `Handler ${String(route.handlerName)} not found on ${controllerClass.name}`
      );
    }

    // Get parameter metadata
    const paramsMeta: ParamMetadata[] =
      Reflect.getMetadata(PARAM_METADATA, controllerClass, route.handlerName) ?? [];

    // Get custom parameter metadata (from createParamDecorator)
    const customParamsMeta: CustomParamMetadata[] =
      getCustomParamMetadata(controllerClass, route.handlerName);

    // Get HTTP status code if set
    const statusCode = Reflect.getMetadata(HTTP_CODE_METADATA, controllerClass, route.handlerName);

    // Get guards for this route (controller-level + method-level)
    const guards = getGuardsMetadata(controllerClass, route.handlerName);

    // Get middleware for this route (controller-level + method-level)
    const middleware = getMiddlewareMetadata(controllerClass, route.handlerName);

    // Get interceptors for this route (controller-level + method-level)
    const interceptors = getInterceptorsMetadata(controllerClass, route.handlerName);

    // ============================================
    // OPTIMIZATION: Pre-compile parameter resolvers
    // ============================================
    const compiledResolvers = this.compileParamResolvers(paramsMeta);
    const hasBuiltinParams = compiledResolvers.length > 0;
    const hasCustomParams = customParamsMeta.length > 0;
    const hasParams = hasBuiltinParams || hasCustomParams;
    const allParamIndexes = [
      ...compiledResolvers.map(r => r.index),
      ...customParamsMeta.map(r => r.index)
    ];
    const maxParamIndex = hasParams ? Math.max(...allParamIndexes) : -1;

    // ============================================
    // OPTIMIZATION: Pre-resolve guard instances
    // ============================================
    const guardResolvers = this.resolveGuardInstances(guards);
    const hasGuards = guardResolvers.length > 0;

    // ============================================
    // OPTIMIZATION: Pre-resolve middleware instances
    // ============================================
    const middlewareResolvers = this.resolveMiddlewareInstances(middleware);
    const hasMiddleware = middlewareResolvers.length > 0;

    // ============================================
    // OPTIMIZATION: Pre-resolve interceptor instances
    // ============================================
    const interceptorResolvers = this.resolveInterceptorInstances(interceptors);
    const hasInterceptors = interceptorResolvers.length > 0;

    const shouldUseRequestScope = this.container.hasRequestScopedProviders();

    // Pre-create execution context factory (needed for guards, interceptors, or custom params)
    const needsContext = hasGuards || hasCustomParams || hasInterceptors;
    const createContext = needsContext
      ? (req: FastifyRequest, rep: FastifyReply) =>
        new ExecutionContextImpl(req, rep, controllerClass, route.handlerName)
      : null;

    // Inner handler logic (extracted for request scope wrapping)
    const executeHandler = async (request: FastifyRequest, reply: FastifyReply) => {
      // Create execution context if needed (shared between guards, interceptors, and custom params)
      const executionContext = createContext ? createContext(request, reply) : null;

      // 1. Execute guards (if any)
      if (hasGuards && executionContext) {
        await this.executeGuardsOptimized(guardResolvers, executionContext);
      }

      // 2. Execute middleware (if any)
      if (hasMiddleware) {
        await this.executeMiddlewareChain(middlewareResolvers, request, reply);
      }

      // 3. Prepare the core handler function
      const coreHandler = async (): Promise<unknown> => {
        const controllerInstance = this.container.resolve(controllerClass);
        const resolvedHandler = (controllerInstance as Record<string | symbol, Function>)[route.handlerName];

        if (typeof resolvedHandler !== 'function') {
          throw new Error(
            `Handler ${String(route.handlerName)} not found on ${controllerClass.name}`
          );
        }

        let args: unknown[] | undefined;
        if (hasParams) {
          args = await this.resolveAllParams(
            compiledResolvers,
            customParamsMeta,
            maxParamIndex,
            request,
            reply,
            executionContext
          );
        }

        const result = args
          ? await resolvedHandler.apply(controllerInstance, args)
          : await resolvedHandler.call(controllerInstance);

        return result;
      };

      // 4. Execute with interceptors or directly
      let result: unknown;
      if (hasInterceptors && executionContext) {
        result = await this.executeInterceptorChain(
          interceptorResolvers,
          executionContext,
          coreHandler
        );
      } else {
        result = await coreHandler();
      }

      // 5. Set status code if specified
      if (statusCode) reply.status(statusCode);

      return result;
    };

    // Unified route handler - wraps execution in request scope for request-scoped DI
    const routeHandler: CompiledHandler = shouldUseRequestScope
      ? async (request, reply) => requestScopeStorage.runAsync(() => executeHandler(request, reply))
      : executeHandler;

    // Register with Fastify
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
    this.server[method](fullPath, routeHandler);

    // Log route registration
    if (!silent) console.log(`  → ${route.method.padEnd(7)} ${fullPath}`);
  }

  /**
   * OPTIMIZATION: Compile parameter resolvers at route registration time
   * Each resolver is a pre-built extractor function
   */
  private compileParamResolvers(paramsMeta: ParamMetadata[]): CompiledParamResolver[] {
    if (paramsMeta.length === 0) return [];

    return paramsMeta.map(param => {
      const extractor = this.createParamExtractor(param);
      return {
        index: param.index,
        extract: extractor,
        zodSchema: param.zodSchema,
        validationLabel: `${param.type}${param.key ? ` (${param.key})` : ''}`
      };
    });
  }

  /**
   * OPTIMIZATION: Create a specialized extractor function for each param type
   * This avoids switch statements at runtime
   */
  private createParamExtractor(param: ParamMetadata): ParamExtractor {
    const key = param.key;

    switch (param.type) {
      case ParamType.BODY:
        return key
          ? (ctx) => (ctx.body as Record<string, unknown>)?.[key]
          : (ctx) => ctx.body;

      case ParamType.QUERY:
        return key
          ? (ctx) => ctx.query[key]
          : (ctx) => ctx.query;

      case ParamType.PARAM:
        return key
          ? (ctx) => ctx.params[key]
          : (ctx) => ctx.params;

      case ParamType.HEADERS:
        const headerKey = key?.toLowerCase();
        return headerKey
          ? (ctx) => ctx.request.headers[headerKey]
          : (ctx) => ctx.request.headers;

      case ParamType.REQUEST:
        return (ctx) => ctx.request;

      case ParamType.REPLY:
        return (ctx) => ctx.reply;

      case ParamType.CONTEXT:
        return (ctx) => ctx;

      default:
        return () => undefined;
    }
  }

  /**
   * Resolve all parameters including both built-in and custom param decorators
   */
  private async resolveAllParams(
    compiledResolvers: CompiledParamResolver[],
    customParams: CustomParamMetadata[],
    maxIndex: number,
    request: FastifyRequest,
    reply: FastifyReply,
    executionContext: ExecutionContext | null
  ): Promise<unknown[]> {
    // Build route context once for built-in resolvers
    const routeContext: RouteContext = {
      request,
      reply,
      params: request.params as Record<string, string>,
      query: request.query as Record<string, unknown>,
      body: request.body,
    };

    // Pre-allocate array
    const args = new Array(maxIndex + 1);

    // Resolve built-in params synchronously
    for (let i = 0; i < compiledResolvers.length; i++) {
      const resolver = compiledResolvers[i];
      let value = resolver.extract(routeContext);

      // Validate if schema present
      if (resolver.zodSchema) {
        const result = resolver.zodSchema.safeParse(value);
        if (!result.success) {
          throw new ValidationException(
            result.error,
            `Validation failed for ${resolver.validationLabel}`
          );
        }
        value = result.data;
      }

      args[resolver.index] = value;
    }

    // Resolve custom params (potentially async)
    if (customParams.length > 0) {
      // Create execution context if not already created
      const ctx = executionContext ?? new ExecutionContextImpl(
        request,
        reply,
        {} as Constructor,
        ''
      );

      // Execute custom param factories (support async)
      for (const customParam of customParams) {
        const value = await customParam.factory(customParam.data, ctx);
        args[customParam.index] = value;
      }
    }

    return args;
  }

  /**
   * OPTIMIZATION: Pre-resolve guard instances at route registration
   */
  private resolveGuardInstances(guards: GuardClass[]): Array<InstanceResolver<CanActivate>> {
    return guards.map(GuardClass => {
      const scope = this.container.getProviderScope(GuardClass) ?? 'singleton';

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

  /**
   * Resolve and validate a single guard instance.
   */
  private resolveGuardInstance(GuardClass: GuardClass): CanActivate {
    let instance: CanActivate;

    try {
      instance = this.container.resolve(GuardClass) as CanActivate;
    } catch (error) {
      throw new Error(
        `Failed to resolve guard ${GuardClass.name}. ` +
        `Make sure it is decorated with @Injectable(). ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
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
   * OPTIMIZATION: Execute guards using pre-resolved instances
   */
  private async executeGuardsOptimized(
    guardResolvers: Array<InstanceResolver<CanActivate>>,
    context: ExecutionContextImpl
  ): Promise<void> {
    for (let i = 0; i < guardResolvers.length; i++) {
      const result = await guardResolvers[i]().canActivate(context);
      if (result !== true) {
        throw new ForbiddenException(
          `Access denied by guard`
        );
      }
    }
  }

  /**
   * OPTIMIZATION: Pre-resolve middleware instances at route registration
   */
  private resolveMiddlewareInstances(middleware: MiddlewareClass[]): Array<InstanceResolver<RiktaMiddleware>> {
    return middleware.map(MiddlewareClass => {
      const scope = this.container.getProviderScope(MiddlewareClass) ?? 'singleton';

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

  /**
   * Resolve and validate a single middleware instance.
   */
  private resolveMiddlewareInstance(MiddlewareClass: MiddlewareClass): RiktaMiddleware {
    let instance: RiktaMiddleware;

    try {
      instance = this.container.resolve(MiddlewareClass) as RiktaMiddleware;
    } catch (error) {
      throw new Error(
        `Failed to resolve middleware ${MiddlewareClass.name}. ` +
        `Make sure it is decorated with @Injectable(). ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
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
   * OPTIMIZATION: Pre-resolve interceptor instances at route registration
   */
  private resolveInterceptorInstances(interceptors: InterceptorClass[]): Array<InstanceResolver<Interceptor>> {
    return interceptors.map(InterceptorClass => {
      const scope = this.container.getProviderScope(InterceptorClass) ?? 'singleton';

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

  /**
   * Resolve and validate a single interceptor instance.
   */
  private resolveInterceptorInstance(InterceptorClass: InterceptorClass): Interceptor {
    let instance: Interceptor;

    try {
      instance = this.container.resolve(InterceptorClass) as Interceptor;
    } catch (error) {
      throw new Error(
        `Failed to resolve interceptor ${InterceptorClass.name}. ` +
        `Make sure it is decorated with @Injectable(). ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
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

  /**
   * Build the full route path
   */
  private buildPath(controllerPrefix: string, routePath: string): string {
    const parts = [this.globalPrefix, controllerPrefix, routePath]
      .filter(Boolean)
      .join('');

    // Normalize multiple slashes
    return parts.replace(/\/+/g, '/') || '/';
  }
}


import 'reflect-metadata';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Container } from '../container/container';
import { 
  CONTROLLER_METADATA, 
  ROUTES_METADATA, 
  PARAM_METADATA, 
  HTTP_CODE_METADATA,
  ParamType 
} from '../constants';
import { Constructor, RouteDefinition, RouteContext } from '../types';
import { ParamMetadata } from '../decorators/param.decorator';
import { ValidationException } from '../exceptions/validation.exception';
import { ForbiddenException } from '../exceptions/exceptions';
import { ExecutionContextImpl } from '../guards/execution-context';
import { getGuardsMetadata, GuardClass } from '../guards/use-guards.decorator';
import type { CanActivate } from '../guards/can-activate.interface';

/**
 * Compiled parameter extractor function type
 * Pre-compiled for maximum performance
 */
type ParamExtractor = (context: RouteContext) => unknown;

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
 * - Fast path for simple routes
 */
export class Router {
  /** Cache for guard instances (singleton per guard class) */
  private readonly guardCache = new Map<GuardClass, CanActivate>();
  
  constructor(
    private readonly server: FastifyInstance,
    private readonly container: Container,
    private readonly globalPrefix: string = ''
  ) {}

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

    // Resolve controller instance from container
    const controllerInstance = this.container.resolve(controllerClass);

    // Get routes metadata
    const routes: RouteDefinition[] = 
      Reflect.getMetadata(ROUTES_METADATA, controllerClass) ?? [];

    // Register each route
    for (const route of routes) {
      this.registerRoute(controllerClass, controllerInstance, controllerMeta.prefix, route, silent);
    }
  }

  /**
   * Register a single route
   */
  private registerRoute(
    controllerClass: Constructor,
    controllerInstance: unknown,
    controllerPrefix: string,
    route: RouteDefinition,
    silent: boolean = false
  ): void {
    // Build full path
    const fullPath = this.buildPath(controllerPrefix, route.path);
    
    // Get the handler method
    const handler = (controllerInstance as Record<string | symbol, Function>)[route.handlerName];
    if (typeof handler !== 'function') {
      throw new Error(
        `Handler ${String(route.handlerName)} not found on ${controllerClass.name}`
      );
    }

    // Get parameter metadata
    const paramsMeta: ParamMetadata[] = 
      Reflect.getMetadata(PARAM_METADATA, controllerClass, route.handlerName) ?? [];

    // Get HTTP status code if set
    const statusCode = Reflect.getMetadata(HTTP_CODE_METADATA, controllerClass, route.handlerName);

    // Get guards for this route (controller-level + method-level)
    const guards = getGuardsMetadata(controllerClass, route.handlerName);

    // ============================================
    // OPTIMIZATION: Pre-compile parameter resolvers
    // ============================================
    const compiledResolvers = this.compileParamResolvers(paramsMeta);
    const hasParams = compiledResolvers.length > 0;
    const maxParamIndex = hasParams ? Math.max(...compiledResolvers.map(r => r.index)) : -1;

    // ============================================
    // OPTIMIZATION: Pre-resolve guard instances
    // ============================================
    const guardInstances = this.resolveGuardInstances(guards);
    const hasGuards = guardInstances.length > 0;

    // ============================================
    // OPTIMIZATION: Create specialized handlers
    // ============================================
    let routeHandler: CompiledHandler;

    if (!hasGuards && !hasParams && !statusCode) {
      // FAST PATH: No guards, no params, no custom status
      routeHandler = async (_request, _reply) => {
        return handler.call(controllerInstance);
      };
    } else if (!hasGuards && !hasParams) {
      // Fast path: Just status code
      routeHandler = async (_request, reply) => {
        const result = await handler.call(controllerInstance);
        if (statusCode) reply.status(statusCode);
        return result;
      };
    } else if (!hasGuards) {
      // Medium path: Params but no guards
      routeHandler = async (request, reply) => {
        const args = this.resolveParamsOptimized(compiledResolvers, maxParamIndex, request, reply);
        const result = await handler.apply(controllerInstance, args);
        if (statusCode) reply.status(statusCode);
        return result;
      };
    } else {
      // Full path: Guards + params
      // Pre-create execution context factory for this route
      const createContext = (req: FastifyRequest, rep: FastifyReply) => 
        new ExecutionContextImpl(req, rep, controllerClass, route.handlerName);

      routeHandler = async (request, reply) => {
        // Execute guards with cached instances
        await this.executeGuardsOptimized(guardInstances, createContext(request, reply));
        
        // Resolve params if needed
        const args = hasParams 
          ? this.resolveParamsOptimized(compiledResolvers, maxParamIndex, request, reply)
          : [];
        
        const result = await handler.apply(controllerInstance, args);
        if (statusCode) reply.status(statusCode);
        return result;
      };
    }

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
   * OPTIMIZATION: Resolve params using pre-compiled extractors
   */
  private resolveParamsOptimized(
    resolvers: CompiledParamResolver[],
    maxIndex: number,
    request: FastifyRequest,
    reply: FastifyReply
  ): unknown[] {
    // Build context once
    const context: RouteContext = {
      request,
      reply,
      params: request.params as Record<string, string>,
      query: request.query as Record<string, unknown>,
      body: request.body,
    };

    // Pre-allocate array
    const args = new Array(maxIndex + 1);

    for (let i = 0; i < resolvers.length; i++) {
      const resolver = resolvers[i];
      let value = resolver.extract(context);

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

    return args;
  }

  /**
   * OPTIMIZATION: Pre-resolve guard instances at route registration
   */
  private resolveGuardInstances(guards: GuardClass[]): CanActivate[] {
    return guards.map(GuardClass => {
      // Check cache first
      let instance = this.guardCache.get(GuardClass);
      if (instance) return instance;

      // Resolve from container
      try {
        instance = this.container.resolve(GuardClass) as CanActivate;
      } catch (error) {
        throw new Error(
          `Failed to resolve guard ${GuardClass.name}. ` +
          `Make sure it is decorated with @Injectable(). ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`
        );
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
   * OPTIMIZATION: Execute guards using pre-resolved instances
   */
  private async executeGuardsOptimized(
    guardInstances: CanActivate[],
    context: ExecutionContextImpl
  ): Promise<void> {
    for (let i = 0; i < guardInstances.length; i++) {
      const result = await guardInstances[i].canActivate(context);
      if (result !== true) {
        throw new ForbiddenException(
          `Access denied by guard`
        );
      }
    }
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


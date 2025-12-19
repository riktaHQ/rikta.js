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

/**
 * Router class
 * 
 * Responsible for:
 * - Scanning controllers for route metadata
 * - Registering routes with Fastify
 * - Handling parameter injection
 */
export class Router {
  constructor(
    private readonly server: FastifyInstance,
    private readonly container: Container,
    private readonly globalPrefix: string = ''
  ) {}

  /**
   * Register all routes from a controller
   */
  registerController(controllerClass: Constructor): void {
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
      this.registerRoute(controllerClass, controllerInstance, controllerMeta.prefix, route);
    }
  }

  /**
   * Register a single route
   */
  private registerRoute(
    controllerClass: Constructor,
    controllerInstance: unknown,
    controllerPrefix: string,
    route: RouteDefinition
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

    // Create the route handler
    const routeHandler = async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Build route context
        const context: RouteContext = {
          request,
          reply,
          params: request.params as Record<string, string>,
          query: request.query as Record<string, unknown>,
          body: request.body,
        };

        // Resolve parameters
        const args = this.resolveParams(paramsMeta, context);

        // Call the handler
        const result = await handler.apply(controllerInstance, args);

        // Set status code if specified
        if (statusCode) {
          reply.status(statusCode);
        }

        // Return result (Fastify will serialize it)
        return result;
      } catch (error) {
        // Let Fastify handle the error
        throw error;
      }
    };

    // Register with Fastify
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
    this.server[method](fullPath, routeHandler);

    // Log route registration
    console.log(`  → ${route.method.padEnd(7)} ${fullPath}`);
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

  /**
   * Resolve handler parameters based on metadata
   */
  private resolveParams(paramsMeta: ParamMetadata[], context: RouteContext): unknown[] {
    if (paramsMeta.length === 0) {
      return [];
    }

    // Sort by parameter index
    const sorted = [...paramsMeta].sort((a, b) => a.index - b.index);
    
    // Find max index to create properly sized array
    const maxIndex = Math.max(...sorted.map(p => p.index));
    const args: unknown[] = new Array(maxIndex + 1).fill(undefined);

    for (const param of sorted) {
      args[param.index] = this.resolveParam(param, context);
    }

    return args;
  }

  /**
   * Resolve a single parameter with optional Zod validation
   */
  private resolveParam(param: ParamMetadata, context: RouteContext): unknown {
    // Get raw value based on parameter type
    let rawValue: unknown;
    
    switch (param.type) {
      case ParamType.BODY:
        rawValue = param.key 
          ? (context.body as Record<string, unknown>)?.[param.key]
          : context.body;
        break;
      
      case ParamType.QUERY:
        rawValue = param.key 
          ? context.query[param.key]
          : context.query;
        break;
      
      case ParamType.PARAM:
        rawValue = param.key 
          ? context.params[param.key]
          : context.params;
        break;
      
      case ParamType.HEADERS:
        rawValue = param.key 
          ? context.request.headers[param.key.toLowerCase()]
          : context.request.headers;
        break;
      
      case ParamType.REQUEST:
        return context.request;
      
      case ParamType.REPLY:
        return context.reply;
      
      case ParamType.CONTEXT:
        return context;
      
      default:
        return undefined;
    }

    // If a Zod schema is provided, validate the raw value
    if (param.zodSchema) {
      const result = param.zodSchema.safeParse(rawValue);
      
      if (!result.success) {
        // Throw ValidationException with Zod error details
        throw new ValidationException(
          result.error,
          `Validation failed for ${param.type}${param.key ? ` (${param.key})` : ''}`
        );
      }
      
      // Return the validated and transformed data
      return result.data;
    }

    // No schema provided, return raw value (backward compatible)
    return rawValue;
  }
}


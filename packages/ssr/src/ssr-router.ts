import 'reflect-metadata';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SsrService } from './ssr.service.js';
import type { SsrExtendedContext, Constructor, SsrOptions } from './types.js';
import {
  SSR_CONTROLLER_METADATA,
  SSR_ROUTE_METADATA,
} from './decorators/constants.js';
import type { SsrControllerMetadata } from './decorators/ssr-controller.decorator.js';
import type { SsrRouteMetadata } from './decorators/ssr.decorator.js';

// Use Symbol.for() for cross-package compatibility with @riktajs/core
const ROUTES_METADATA = Symbol.for('rikta:routes:metadata');
const PARAM_METADATA = Symbol.for('rikta:param:metadata');

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
 * SSR Router
 *
 * Registers SSR controllers with Fastify and handles SSR rendering.
 * Integrates with @riktajs/core's decorator system.
 *
 * @example
 * ```typescript
 * const router = new SsrRouter(fastify, ssrService, globalOptions);
 * router.registerController(PageController);
 * ```
 */
export class SsrRouter {
  constructor(
    private readonly server: FastifyInstance,
    private readonly ssrService: SsrService,
    private readonly globalOptions: SsrOptions,
    private readonly container?: { resolve: <T>(token: Constructor<T>) => T }
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

    // Merge SSR options: global -> controller -> route
    const mergedSsrOptions = {
      ...this.globalOptions,
      ...ssrMeta.ssrOptions,
    };

    // Create the route handler
    const ssrHandler = async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<unknown> => {
      try {
        // Resolve parameters
        const args = this.resolveParams(paramsMeta, request, reply);

        // Call the controller method to get context data
        const contextData = await handler.apply(controllerInstance, args);

        // Build extended context
        // Decorator metadata (from @Ssr) takes precedence over contextData
        const context: SsrExtendedContext = {
          url: request.url,
          ...(contextData || {}),
          // Include data for hydration
          __SSR_DATA__: contextData,
        };

        // Add route metadata from @Ssr decorator (only if defined)
        const opts = ssrRouteMeta?.options;
        if (opts) {
          if (opts.title !== undefined) {
            context.title = opts.title;
          }
          if (opts.description !== undefined) {
            context.description = opts.description;
          }
          if (opts.og !== undefined) {
            context.og = opts.og;
          }
          if (opts.twitter !== undefined) {
            context.twitter = opts.twitter;
          }
          if (opts.canonical !== undefined) {
            context.canonical = opts.canonical;
          }
          if (opts.robots !== undefined) {
            context.robots = opts.robots;
          }
          if (opts.head !== undefined) {
            context.head = opts.head;
          }
        }

        // Render SSR
        const html = await this.ssrService.render(request.url, context);

        // Set cache headers if configured
        if (ssrRouteMeta?.options?.cache) {
          const { maxAge, staleWhileRevalidate } = ssrRouteMeta.options.cache;
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
        // Log error
        this.server.log.error(error);

        // Return error page
        return reply.status(500).type('text/html').send(`
          <!DOCTYPE html>
          <html>
            <head><title>Server Error</title></head>
            <body>
              <h1>500 - Server Error</h1>
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
}

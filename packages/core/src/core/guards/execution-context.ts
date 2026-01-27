import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Constructor } from '../types.js';

/**
 * HTTP argument host interface
 * Provides access to HTTP-specific request/response objects
 */
export interface HttpArgumentsHost {
  /**
   * Get the Fastify request object
   */
  getRequest<T = FastifyRequest>(): T;
  
  /**
   * Get the Fastify reply object
   */
  getResponse<T = FastifyReply>(): T;
}

/**
 * ExecutionContext Interface
 * 
 * Provides access to the current request context, including
 * request/reply objects and handler metadata. Used by guards
 * and interceptors to access request details.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class AuthGuard implements CanActivate {
 *   async canActivate(context: ExecutionContext): Promise<boolean> {
 *     const request = context.switchToHttp().getRequest();
 *     const authHeader = request.headers.authorization;
 *     return !!authHeader;
 *   }
 * }
 * ```
 */
export interface ExecutionContext {
  /**
   * Switch to HTTP context to access request/response
   * 
   * @returns HTTP arguments host
   */
  switchToHttp(): HttpArgumentsHost;

  /**
   * Get the Fastify request object
   * 
   * @returns The current request instance
   * @deprecated Use switchToHttp().getRequest() instead
   */
  getRequest<T = FastifyRequest>(): T;

  /**
   * Get the Fastify reply object
   * 
   * @returns The current reply instance
   * @deprecated Use switchToHttp().getResponse() instead
   */
  getReply<T = FastifyReply>(): T;

  /**
   * Get the controller class that handles the route
   * 
   * @returns The controller constructor
   */
  getClass(): Constructor;

  /**
   * Get the handler method name
   * 
   * @returns The method name being invoked
   */
  getHandler(): string | symbol;

  /**
   * Get handler metadata by key
   * 
   * @param key - Metadata key to retrieve
   * @returns The metadata value if found
   */
  getMetadata<T = unknown>(key: string | symbol): T | undefined;
}

/**
 * Default ExecutionContext implementation
 * 
 * @internal
 */
export class ExecutionContextImpl implements ExecutionContext {
  private readonly httpHost: HttpArgumentsHost;

  constructor(
    private readonly request: FastifyRequest,
    private readonly reply: FastifyReply,
    private readonly controllerClass: Constructor,
    private readonly handlerName: string | symbol,
  ) {
    // Create HTTP host once
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

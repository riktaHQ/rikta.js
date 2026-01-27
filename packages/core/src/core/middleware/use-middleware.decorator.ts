import 'reflect-metadata';
import { MIDDLEWARE_METADATA } from '../constants.js';
import type { Constructor } from '../types.js';
import type { RiktaMiddleware } from './rikta-middleware.interface.js';

/**
 * Type for middleware constructors
 */
export type MiddlewareClass = Constructor<RiktaMiddleware>;

/**
 * @UseMiddleware() Decorator
 * 
 * Applies one or more middleware to a controller or route handler.
 * Middleware are executed in order AFTER guards and BEFORE the handler runs.
 * 
 * Middleware are resolved from the DI container, so they can have
 * injected dependencies. Make sure middleware are decorated with @Injectable().
 * 
 * @param middleware - Middleware classes to apply
 * 
 * @example Apply middleware to entire controller
 * ```typescript
 * @Controller('/api')
 * @UseMiddleware(LoggerMiddleware)
 * class ApiController {
 *   @Get('/users')
 *   getUsers() {
 *     return [];
 *   }
 * }
 * ```
 * 
 * @example Apply middleware to specific route
 * ```typescript
 * @Controller('/users')
 * class UserController {
 *   @Get()
 *   findAll() {
 *     return []; // No middleware
 *   }
 * 
 *   @Post()
 *   @UseMiddleware(RequestIdMiddleware)
 *   create() {
 *     return {}; // Has middleware
 *   }
 * }
 * ```
 * 
 * @example Multiple middleware (executed in order)
 * ```typescript
 * @Controller('/api')
 * @UseMiddleware(LoggerMiddleware, RequestIdMiddleware)
 * class ApiController {
 *   // LoggerMiddleware runs first, then RequestIdMiddleware
 * }
 * ```
 * 
 * @example Combined with guards (guards run first, then middleware)
 * ```typescript
 * @Controller('/admin')
 * @UseGuards(AuthGuard)           // 1. Guards execute first
 * @UseMiddleware(AuditMiddleware) // 2. Middleware executes after
 * class AdminController {
 *   @Get('/dashboard')
 *   getDashboard() {
 *     // 3. Handler executes last
 *     return { message: 'Admin dashboard' };
 *   }
 * }
 * ```
 */
export function UseMiddleware(...middleware: MiddlewareClass[]): ClassDecorator & MethodDecorator {
  return (
    target: object,
    propertyKey?: string | symbol,
  ): void => {
    if (propertyKey !== undefined) {
      // Method decorator - store on the method
      const existingMiddleware: MiddlewareClass[] = 
        Reflect.getMetadata(MIDDLEWARE_METADATA, target.constructor, propertyKey) ?? [];
      Reflect.defineMetadata(
        MIDDLEWARE_METADATA, 
        [...existingMiddleware, ...middleware], 
        target.constructor, 
        propertyKey
      );
    } else {
      // Class decorator - store on the class
      const existingMiddleware: MiddlewareClass[] = 
        Reflect.getMetadata(MIDDLEWARE_METADATA, target) ?? [];
      Reflect.defineMetadata(
        MIDDLEWARE_METADATA, 
        [...existingMiddleware, ...middleware], 
        target
      );
    }
  };
}

/**
 * Get middleware metadata for a route
 * Combines controller-level and method-level middleware
 * 
 * @param target - Controller class
 * @param propertyKey - Method name (optional)
 * @returns Array of middleware classes (controller-level first, then method-level)
 */
export function getMiddlewareMetadata(
  target: Constructor,
  propertyKey?: string | symbol
): MiddlewareClass[] {
  // Get controller-level middleware
  const controllerMiddleware: MiddlewareClass[] = 
    Reflect.getMetadata(MIDDLEWARE_METADATA, target) ?? [];

  if (!propertyKey) {
    return controllerMiddleware;
  }

  // Get method-level middleware
  const methodMiddleware: MiddlewareClass[] = 
    Reflect.getMetadata(MIDDLEWARE_METADATA, target, propertyKey) ?? [];

  // Controller middleware runs first, then method middleware
  return [...controllerMiddleware, ...methodMiddleware];
}

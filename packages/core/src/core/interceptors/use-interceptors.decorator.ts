import 'reflect-metadata';
import { INTERCEPTORS_METADATA } from '../constants.js';
import { Constructor } from '../types.js';
import type { Interceptor } from './interceptor.interface.js';

/**
 * Type for interceptor classes
 */
export type InterceptorClass = Constructor<Interceptor>;

/**
 * Decorator to apply interceptors to a controller or route handler
 * 
 * Interceptors are executed in order and can:
 * - Transform the response
 * - Add extra logic before/after the handler
 * - Measure execution time
 * - Cache responses
 * - Handle errors
 * 
 * @param interceptors - Interceptor classes to apply
 * 
 * @example
 * ```typescript
 * // Apply to entire controller
 * @Controller('/users')
 * @UseInterceptors(LoggingInterceptor, CacheInterceptor)
 * class UserController { ... }
 * 
 * // Apply to specific route
 * @Controller('/users')
 * class UserController {
 *   @Get('/')
 *   @UseInterceptors(CacheInterceptor)
 *   findAll() { ... }
 * }
 * ```
 */
export function UseInterceptors(...interceptors: InterceptorClass[]): ClassDecorator & MethodDecorator {
  return (
    target: object | Function,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ): void => {
    if (propertyKey && descriptor) {
      // Method decorator - apply to specific route
      const existingInterceptors: InterceptorClass[] = 
        Reflect.getMetadata(INTERCEPTORS_METADATA, target.constructor, propertyKey) ?? [];
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA, 
        [...existingInterceptors, ...interceptors], 
        target.constructor, 
        propertyKey
      );
    } else {
      // Class decorator - apply to all routes in controller
      const existingInterceptors: InterceptorClass[] = 
        Reflect.getMetadata(INTERCEPTORS_METADATA, target) ?? [];
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA, 
        [...existingInterceptors, ...interceptors], 
        target
      );
    }
  };
}

/**
 * Get interceptors metadata for a route handler
 * Combines controller-level and method-level interceptors
 * 
 * @param controllerClass - The controller class
 * @param methodName - The route handler method name
 * @returns Array of interceptor classes (controller-level first, then method-level)
 */
export function getInterceptorsMetadata(
  controllerClass: Constructor,
  methodName: string | symbol
): InterceptorClass[] {
  // Get controller-level interceptors
  const controllerInterceptors: InterceptorClass[] = 
    Reflect.getMetadata(INTERCEPTORS_METADATA, controllerClass) ?? [];
  
  // Get method-level interceptors
  const methodInterceptors: InterceptorClass[] = 
    Reflect.getMetadata(INTERCEPTORS_METADATA, controllerClass, methodName) ?? [];
  
  // Controller interceptors run first, then method interceptors
  return [...controllerInterceptors, ...methodInterceptors];
}

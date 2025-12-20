import 'reflect-metadata';
import { GUARDS_METADATA } from '../constants';
import type { Constructor } from '../types';
import type { CanActivate } from './can-activate.interface';

/**
 * Type for guard constructors
 */
export type GuardClass = Constructor<CanActivate>;

/**
 * @UseGuards() Decorator
 * 
 * Applies one or more guards to a controller or route handler.
 * Guards are executed in order before the handler runs.
 * 
 * Guards are resolved from the DI container, so they can have
 * injected dependencies. Make sure guards are decorated with @Injectable().
 * 
 * @param guards - Guard classes to apply
 * 
 * @example Apply guard to entire controller
 * ```typescript
 * @Controller('/admin')
 * @UseGuards(AuthGuard)
 * class AdminController {
 *   @Get('/dashboard')
 *   getDashboard() {
 *     return { message: 'Admin dashboard' };
 *   }
 * }
 * ```
 * 
 * @example Apply guard to specific route
 * ```typescript
 * @Controller('/users')
 * class UserController {
 *   @Get()
 *   findAll() {
 *     return []; // Public route
 *   }
 * 
 *   @Post()
 *   @UseGuards(AuthGuard)
 *   create() {
 *     return {}; // Protected route
 *   }
 * }
 * ```
 * 
 * @example Multiple guards (AND logic - all must pass)
 * ```typescript
 * @Controller('/admin')
 * @UseGuards(AuthGuard, RolesGuard)
 * class AdminController {
 *   // User must be authenticated AND have correct role
 * }
 * ```
 * 
 * @example Combined controller and method guards
 * ```typescript
 * @Controller('/api')
 * @UseGuards(AuthGuard)  // Applied to all routes
 * class ApiController {
 *   @Get('/public')
 *   // Only AuthGuard runs
 *   getPublic() {}
 * 
 *   @Post('/admin')
 *   @UseGuards(AdminGuard)  // Additional guard
 *   // Both AuthGuard AND AdminGuard run
 *   adminAction() {}
 * }
 * ```
 */
export function UseGuards(...guards: GuardClass[]): ClassDecorator & MethodDecorator {
  return (
    target: object,
    propertyKey?: string | symbol,
    // descriptor?: PropertyDescriptor
  ): void => {
    if (propertyKey !== undefined) {
      // Method decorator - store on the method
      const existingGuards: GuardClass[] = 
        Reflect.getMetadata(GUARDS_METADATA, target.constructor, propertyKey) ?? [];
      Reflect.defineMetadata(
        GUARDS_METADATA, 
        [...existingGuards, ...guards], 
        target.constructor, 
        propertyKey
      );
    } else {
      // Class decorator - store on the class
      const existingGuards: GuardClass[] = 
        Reflect.getMetadata(GUARDS_METADATA, target) ?? [];
      Reflect.defineMetadata(
        GUARDS_METADATA, 
        [...existingGuards, ...guards], 
        target
      );
    }
  };
}

/**
 * Get guards metadata from a controller class and/or method
 * 
 * @param target - Controller class
 * @param propertyKey - Method name (optional)
 * @returns Combined array of guard classes (controller + method)
 */
export function getGuardsMetadata(
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

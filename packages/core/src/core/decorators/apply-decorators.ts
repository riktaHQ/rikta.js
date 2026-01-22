import 'reflect-metadata';

/**
 * Type for class decorators
 */
type ClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;

/**
 * Type for method decorators
 */
type MethodDecorator = <T>(
  target: Object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void;

/**
 * Type for property decorators
 */
type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void;

/**
 * Union type for all decorator types that can be composed
 */
type AnyDecorator = ClassDecorator | MethodDecorator | PropertyDecorator;

/**
 * Applies multiple decorators to a single target.
 * 
 * This utility function allows you to compose multiple decorators into a single
 * decorator, making it easier to create reusable decorator combinations.
 * Decorators are applied in reverse order (last to first), matching TypeScript's
 * decorator application order.
 * 
 * @param decorators - The decorators to compose
 * @returns A composed decorator that applies all the provided decorators
 * 
 * @example
 * ```typescript
 * // Create a composed @Auth decorator
 * import { applyDecorators, UseGuards, SetMetadata } from '@riktajs/core';
 * import { ApiBearerAuth, ApiUnauthorizedResponse } from '@riktajs/swagger';
 * 
 * export function Auth(...roles: Role[]) {
 *   return applyDecorators(
 *     SetMetadata('roles', roles),
 *     UseGuards(AuthGuard, RolesGuard),
 *     ApiBearerAuth(),
 *     ApiUnauthorizedResponse({ description: 'Unauthorized' })
 *   );
 * }
 * 
 * // Usage in controller
 * @Controller('/admin')
 * export class AdminController {
 *   @Auth('admin')
 *   @Get('/dashboard')
 *   getDashboard() {
 *     return { message: 'Admin dashboard' };
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Compose validation decorators
 * export const ValidatedBody = (schema: ZodSchema) => applyDecorators(
 *   ApiBody({ type: schema }),
 *   UsePipes(new ZodValidationPipe(schema))
 * );
 * ```
 * 
 * @example
 * ```typescript
 * // Create a public endpoint decorator
 * export const Public = () => applyDecorators(
 *   SetMetadata('isPublic', true),
 *   ApiOperation({ summary: 'Public endpoint' })
 * );
 * ```
 */
export function applyDecorators(
  ...decorators: AnyDecorator[]
): MethodDecorator & ClassDecorator & PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>
  ) => {
    // Apply decorators in reverse order to match TypeScript's decorator application order
    for (const decorator of decorators.reverse()) {
      if (descriptor) {
        // Method decorator
        const result = (decorator as MethodDecorator)(target, propertyKey!, descriptor);
        if (result) {
          descriptor = result;
        }
      } else if (propertyKey !== undefined) {
        // Property decorator
        (decorator as PropertyDecorator)(target, propertyKey);
      } else {
        // Class decorator
        const result = (decorator as ClassDecorator)(target);
        if (result) {
          return result;
        }
      }
    }

    if (descriptor) {
      return descriptor;
    }
  }) as MethodDecorator & ClassDecorator & PropertyDecorator;
}

/**
 * Sets metadata on a class or method.
 * 
 * This is a utility decorator for storing custom metadata that can be
 * retrieved later using ExecutionContext.getMetadata() or Reflect.getMetadata().
 * 
 * @param key - The metadata key (string or Symbol)
 * @param value - The metadata value
 * @returns A decorator that sets the metadata
 * 
 * @example
 * ```typescript
 * // Define roles for authorization
 * @SetMetadata('roles', ['admin', 'moderator'])
 * @Get('/admin')
 * adminEndpoint() {
 *   return { admin: true };
 * }
 * 
 * // Read in guard
 * class RolesGuard implements CanActivate {
 *   canActivate(context: ExecutionContext) {
 *     const roles = context.getMetadata<string[]>('roles');
 *     // Check user has required role...
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Create a custom @Roles decorator using SetMetadata
 * export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
 * 
 * // Usage
 * @Roles('admin')
 * @Get('/admin')
 * adminOnly() {}
 * ```
 */
export function SetMetadata<T = unknown>(
  key: string | symbol,
  value: T
): MethodDecorator & ClassDecorator {
  const decoratorFactory = (
    target: Object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<unknown>
  ): void => {
    if (descriptor) {
      // Method decorator - set metadata on the method
      Reflect.defineMetadata(key, value, target.constructor, propertyKey!);
    } else {
      // Class decorator - set metadata on the class
      Reflect.defineMetadata(key, value, target);
    }
  };

  return decoratorFactory as MethodDecorator & ClassDecorator;
}

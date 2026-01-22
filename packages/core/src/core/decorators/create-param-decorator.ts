import 'reflect-metadata';
import { ExecutionContext } from '../guards/execution-context';

/**
 * Metadata key for custom parameter decorators
 */
export const CUSTOM_PARAM_METADATA = Symbol.for('rikta:custom:param:metadata');

/**
 * Custom parameter decorator metadata structure
 */
export interface CustomParamMetadata<T = unknown> {
  /** Parameter index in the method signature */
  index: number;
  /** Factory function that extracts/transforms the parameter value */
  factory: CustomParamFactory<T, unknown>;
  /** Optional data passed to the decorator */
  data?: T;
}

/**
 * Factory function type for custom parameter decorators.
 * 
 * @template TData - Type of the data passed to the decorator
 * @template TResult - Type of the value returned by the factory
 * 
 * @param data - Optional data passed when using the decorator (e.g., @User('email'))
 * @param ctx - Execution context providing access to request, reply, and metadata
 * @returns The value to inject as the parameter
 */
export type CustomParamFactory<TData = unknown, TResult = unknown> = (
  data: TData,
  ctx: ExecutionContext
) => TResult | Promise<TResult>;

/**
 * Creates a custom parameter decorator.
 * 
 * This function allows you to define custom decorators that extract data from
 * the request context. The factory function receives the optional data passed
 * to the decorator and the ExecutionContext, which provides access to the
 * request, reply, and handler metadata.
 * 
 * @template TData - Type of the data passed to the decorator
 * @template TResult - Type of the value returned by the factory
 * 
 * @param factory - Function that receives data and ExecutionContext and returns the parameter value
 * @returns A decorator factory that can be used with optional data
 * 
 * @example
 * ```typescript
 * // Create a @User() decorator to extract user from request
 * export const User = createParamDecorator<string | undefined, UserEntity>(
 *   (data, ctx) => {
 *     const request = ctx.getRequest<FastifyRequest & { user: UserEntity }>();
 *     const user = request.user;
 *     
 *     // If data is provided, return that specific property
 *     return data ? user?.[data as keyof UserEntity] : user;
 *   }
 * );
 * 
 * // Usage in controller
 * @Controller('/users')
 * export class UserController {
 *   @Get('/profile')
 *   getProfile(@User() user: UserEntity) {
 *     return user;
 *   }
 * 
 *   @Get('/email')
 *   getEmail(@User('email') email: string) {
 *     return { email };
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Create a @ClientIp() decorator
 * export const ClientIp = createParamDecorator<void, string>((_, ctx) => {
 *   const request = ctx.getRequest();
 *   return request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
 * });
 * 
 * // Usage
 * @Get('/log')
 * logVisit(@ClientIp() ip: string) {
 *   console.log(`Visit from ${ip}`);
 * }
 * ```
 */
export function createParamDecorator<TData = unknown, TResult = unknown>(
  factory: CustomParamFactory<TData, TResult>
): (data?: TData) => ParameterDecorator {
  return (data?: TData): ParameterDecorator => {
    return (
      target: Object,
      propertyKey: string | symbol | undefined,
      parameterIndex: number
    ): void => {
      if (propertyKey === undefined) return;

      // Get existing custom param metadata or initialize empty array
      const existingParams: CustomParamMetadata<TData>[] =
        Reflect.getMetadata(CUSTOM_PARAM_METADATA, target.constructor, propertyKey) ?? [];

      // Build metadata object
      const metadata: CustomParamMetadata<TData> = {
        index: parameterIndex,
        factory: factory as CustomParamFactory<TData, unknown>,
        data,
      };

      // Add this param
      existingParams.push(metadata);

      // Store updated params
      Reflect.defineMetadata(CUSTOM_PARAM_METADATA, existingParams, target.constructor, propertyKey);
    };
  };
}

/**
 * Gets custom parameter metadata for a method.
 * 
 * @param target - The controller class
 * @param propertyKey - The method name
 * @returns Array of custom parameter metadata
 */
export function getCustomParamMetadata<T = unknown>(
  target: Function,
  propertyKey: string | symbol
): CustomParamMetadata<T>[] {
  return Reflect.getMetadata(CUSTOM_PARAM_METADATA, target, propertyKey) ?? [];
}

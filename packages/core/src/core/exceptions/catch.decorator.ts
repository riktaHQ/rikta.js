import 'reflect-metadata';
import { Constructor } from '../types.js';

/**
 * Metadata key for @Catch() decorator
 */
export const CATCH_METADATA = Symbol('catch:metadata');

/**
 * Metadata stored by @Catch() decorator
 */
export interface CatchMetadata {
  /** Exception types this filter handles */
  exceptions: Constructor<Error>[];
}

/**
 * @Catch() Decorator
 * 
 * Marks a class as an exception filter and specifies which
 * exception types it should handle.
 * 
 * If no exception types are provided, the filter catches all exceptions.
 * 
 * @param exceptions - Exception types to catch (optional)
 * 
 * @example Catch specific exception
 * ```typescript
 * @Catch(NotFoundException)
 * class NotFoundExceptionFilter implements ExceptionFilter {
 *   catch(exception: NotFoundException, context: ExceptionContext) {
 *     const { reply, path } = context;
 *     reply.status(404).send({
 *       statusCode: 404,
 *       message: exception.message,
 *       path,
 *       timestamp: new Date().toISOString()
 *     });
 *   }
 * }
 * ```
 * 
 * @example Catch multiple exceptions
 * ```typescript
 * @Catch(BadRequestException, UnprocessableEntityException)
 * class ValidationExceptionFilter implements ExceptionFilter {
 *   catch(exception: HttpException, context: ExceptionContext) {
 *     const { reply } = context;
 *     const response = exception.getResponse();
 *     
 *     reply.status(exception.getStatus()).send({
 *       ...response,
 *       type: 'VALIDATION_ERROR'
 *     });
 *   }
 * }
 * ```
 * 
 * @example Catch all exceptions
 * ```typescript
 * @Catch()
 * class AllExceptionsFilter implements ExceptionFilter {
 *   catch(exception: Error, context: ExceptionContext) {
 *     // Handle any exception
 *   }
 * }
 * ```
 */
export function Catch(...exceptions: Constructor<Error>[]): ClassDecorator {
  return (target) => {
    const metadata: CatchMetadata = {
      exceptions: exceptions.length > 0 ? exceptions : [],
    };
    
    Reflect.defineMetadata(CATCH_METADATA, metadata, target);
  };
}

/**
 * Get catch metadata from a filter class
 */
export function getCatchMetadata(target: Constructor): CatchMetadata | undefined {
  return Reflect.getMetadata(CATCH_METADATA, target);
}

import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { HttpException, HttpExceptionResponse } from './http-exception';

/**
 * Exception context passed to filters
 */
export interface ExceptionContext {
  /** The caught exception */
  exception: Error;
  
  /** Fastify request object */
  request: FastifyRequest;
  
  /** Fastify reply object */
  reply: FastifyReply;
  
  /** Request path */
  path: string;
  
  /** HTTP method */
  method: string;
  
  /** Request ID (if available) */
  requestId?: string;
}

/**
 * Exception Filter Interface
 * 
 * Implement this interface to create custom exception handlers.
 * Filters can catch specific exception types or handle all exceptions.
 * 
 * @example
 * ```typescript
 * @Catch(ValidationException)
 * class ValidationExceptionFilter implements ExceptionFilter {
 *   catch(exception: ValidationException, context: ExceptionContext) {
 *     const { reply } = context;
 *     reply.status(422).send({
 *       statusCode: 422,
 *       errors: exception.errors,
 *       timestamp: new Date().toISOString()
 *     });
 *   }
 * }
 * ```
 */
export interface ExceptionFilter<T extends Error = Error> {
  /**
   * Handle the caught exception
   * 
   * @param exception - The caught exception
   * @param context - Exception context with request/reply
   */
  catch(exception: T, context: ExceptionContext): void | Promise<void>;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;
  
  /** Error message */
  message: string;
  
  /** Error type/name (e.g., "Bad Request", "Not Found") */
  error: string;
  
  /** ISO timestamp when the error occurred */
  timestamp: string;
  
  /** Request path that caused the error */
  path: string;
  
  /** Request ID for tracing (optional) */
  requestId?: string;
  
  /** Additional error details (optional) */
  details?: unknown;
  
  /** Application-specific error code (optional) */
  code?: string;
  
  /** Stack trace (only in development mode) */
  stack?: string;
}

/**
 * Global Exception Filter
 * 
 * Default exception handler that catches all errors and returns
 * a standardized JSON response.
 * 
 * Features:
 * - Handles HttpException with proper status codes
 * - Handles Fastify validation errors
 * - Handles unknown errors as 500 Internal Server Error
 * - Includes stack traces in development mode
 * 
 * @example
 * ```typescript
 * // The filter is automatically registered by Rikta
 * // But you can customize behavior via options:
 * const app = await Rikta.create({
 *   exceptionFilter: {
 *     includeStack: process.env.NODE_ENV !== 'production',
 *     logErrors: true
 *   }
 * });
 * ```
 */
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly includeStack: boolean;
  private readonly logErrors: boolean;

  constructor(options: GlobalExceptionFilterOptions = {}) {
    this.includeStack = options.includeStack ?? process.env.NODE_ENV !== 'production';
    this.logErrors = options.logErrors ?? true;
  }

  /**
   * Handle any exception and send standardized response
   */
  catch(exception: Error, context: ExceptionContext): void {
    const { request, reply, path, method } = context;
    const requestId = (request.id as string) ?? undefined;

    // Log the error
    if (this.logErrors) {
      this.logError(exception, method, path, requestId);
    }

    // Build error response
    const response = this.buildResponse(exception, path, requestId);

    // Send response
    reply.status(response.statusCode).send(response);
  }

  /**
   * Build standardized error response
   */
  private buildResponse(
    exception: Error, 
    path: string, 
    requestId?: string
  ): ErrorResponse {
    // Handle HttpException
    if (exception instanceof HttpException) {
      const httpResponse = exception.getResponse();
      return {
        statusCode: httpResponse.statusCode,
        message: httpResponse.message,
        error: httpResponse.error,
        timestamp: httpResponse.timestamp,
        path,
        ...(requestId && { requestId }),
        ...(httpResponse.details && { details: httpResponse.details }),
        ...(httpResponse.code && { code: httpResponse.code }),
        ...(this.includeStack && { stack: exception.stack }),
      };
    }

    // Handle Fastify validation errors
    if (this.isFastifyValidationError(exception)) {
      return {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path,
        ...(requestId && { requestId }),
        details: (exception as FastifyError).validation,
        ...(this.includeStack && { stack: exception.stack }),
      };
    }

    // Handle Fastify errors with statusCode
    if (this.isFastifyError(exception)) {
      const fastifyError = exception as FastifyError;
      return {
        statusCode: fastifyError.statusCode ?? 500,
        message: fastifyError.message,
        error: fastifyError.code ?? 'Error',
        timestamp: new Date().toISOString(),
        path,
        ...(requestId && { requestId }),
        ...(this.includeStack && { stack: exception.stack }),
      };
    }

    // Handle unknown errors as 500
    return {
      statusCode: 500,
      message: this.includeStack ? exception.message : 'Internal Server Error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path,
      ...(requestId && { requestId }),
      ...(this.includeStack && { stack: exception.stack }),
    };
  }

  /**
   * Check if error is a Fastify validation error
   */
  private isFastifyValidationError(error: Error): boolean {
    return 'validation' in error && Array.isArray((error as FastifyError).validation);
  }

  /**
   * Check if error is a Fastify error with statusCode
   */
  private isFastifyError(error: Error): boolean {
    return 'statusCode' in error;
  }

  /**
   * Log error to console
   */
  private logError(
    exception: Error, 
    method: string, 
    path: string, 
    requestId?: string
  ): void {
    const timestamp = new Date().toISOString();
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : 500;
    
    const prefix = status >= 500 ? '❌' : '⚠️';
    const reqIdStr = requestId ? ` [${requestId}]` : '';
    
    console.error(
      `${prefix} [${timestamp}]${reqIdStr} ${method} ${path} - ${status} ${exception.message}`
    );
    
    // Log stack trace for 5xx errors in development
    if (status >= 500 && this.includeStack && exception.stack) {
      console.error(exception.stack);
    }
  }
}

/**
 * Options for GlobalExceptionFilter
 */
export interface GlobalExceptionFilterOptions {
  /** Include stack trace in response (default: true in development) */
  includeStack?: boolean;
  
  /** Log errors to console (default: true) */
  logErrors?: boolean;
}

/**
 * Create exception handler function for Fastify
 */
export function createExceptionHandler(
  filter: ExceptionFilter,
  customFilters: Map<Function, ExceptionFilter> = new Map()
) {
  return async (
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const context: ExceptionContext = {
      exception: error,
      request,
      reply,
      path: request.url,
      method: request.method,
      requestId: request.id as string,
    };

    // Try to find a custom filter for this exception type
    for (const [ExceptionType, customFilter] of customFilters) {
      if (error instanceof ExceptionType) {
        return customFilter.catch(error, context);
      }
    }

    // Use global filter
    return filter.catch(error, context);
  };
}

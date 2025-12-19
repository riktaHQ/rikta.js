/**
 * HTTP Exception Base Class
 * 
 * Base class for all HTTP exceptions in Rikta.
 * Provides a standard structure for error responses.
 * 
 * @example
 * ```typescript
 * // Throw directly
 * throw new HttpException('Something went wrong', 500);
 * 
 * // With additional details
 * throw new HttpException({
 *   message: 'Validation failed',
 *   error: 'Bad Request',
 *   details: { field: 'email', reason: 'Invalid format' }
 * }, 400);
 * ```
 */
export class HttpException extends Error {
  /**
   * HTTP status code
   */
  readonly statusCode: number;

  /**
   * Error response object
   */
  readonly response: HttpExceptionResponse;

  /**
   * Timestamp when the exception was created
   */
  readonly timestamp: string;

  constructor(
    response: string | HttpExceptionBody,
    statusCode: number = 500
  ) {
    const message = typeof response === 'string' 
      ? response 
      : response.message;
    
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    
    // Build response object
    if (typeof response === 'string') {
      this.response = {
        statusCode,
        message,
        error: this.getDefaultError(statusCode),
        timestamp: this.timestamp,
      };
    } else {
      this.response = {
        statusCode,
        message: response.message,
        error: response.error ?? this.getDefaultError(statusCode),
        timestamp: this.timestamp,
        ...(response.details && { details: response.details }),
        ...(response.code && { code: response.code }),
      };
    }

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get the response object for JSON serialization
   */
  getResponse(): HttpExceptionResponse {
    return this.response;
  }

  /**
   * Get the HTTP status code
   */
  getStatus(): number {
    return this.statusCode;
  }

  /**
   * Get default error name for status code
   */
  private getDefaultError(statusCode: number): string {
    const errors: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      406: 'Not Acceptable',
      408: 'Request Timeout',
      409: 'Conflict',
      410: 'Gone',
      413: 'Payload Too Large',
      415: 'Unsupported Media Type',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return errors[statusCode] ?? 'Error';
  }
}

/**
 * Exception body structure for custom responses
 */
export interface HttpExceptionBody {
  /** Error message */
  message: string;
  
  /** Error type/name (e.g., "Bad Request", "Validation Error") */
  error?: string;
  
  /** Additional error details */
  details?: unknown;
  
  /** Application-specific error code */
  code?: string;
}

/**
 * Standard HTTP exception response format
 */
export interface HttpExceptionResponse {
  /** HTTP status code */
  statusCode: number;
  
  /** Error message */
  message: string;
  
  /** Error type/name */
  error: string;
  
  /** ISO timestamp */
  timestamp: string;
  
  /** Additional error details (optional) */
  details?: unknown;
  
  /** Application-specific error code (optional) */
  code?: string;
  
  /** Request path (added by filter) */
  path?: string;
}

import { HttpException, HttpExceptionBody } from './http-exception';

// ============================================================================
// 4xx Client Errors
// ============================================================================

/**
 * 400 Bad Request
 * 
 * The server cannot process the request due to client error.
 * 
 * @example
 * ```typescript
 * throw new BadRequestException('Invalid input data');
 * 
 * throw new BadRequestException({
 *   message: 'Validation failed',
 *   details: { email: 'Invalid format' }
 * });
 * ```
 */
export class BadRequestException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Bad Request') {
    super(response, 400);
  }
}

/**
 * 401 Unauthorized
 * 
 * Authentication is required and has failed or not been provided.
 * 
 * @example
 * ```typescript
 * throw new UnauthorizedException('Invalid credentials');
 * throw new UnauthorizedException('Token expired');
 * ```
 */
export class UnauthorizedException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Unauthorized') {
    super(response, 401);
  }
}

/**
 * 403 Forbidden
 * 
 * The server understood the request but refuses to authorize it.
 * 
 * @example
 * ```typescript
 * throw new ForbiddenException('Access denied');
 * throw new ForbiddenException('Insufficient permissions');
 * ```
 */
export class ForbiddenException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Forbidden') {
    super(response, 403);
  }
}

/**
 * 404 Not Found
 * 
 * The requested resource could not be found.
 * 
 * @example
 * ```typescript
 * throw new NotFoundException('User not found');
 * throw new NotFoundException(`Resource ${id} not found`);
 * ```
 */
export class NotFoundException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Not Found') {
    super(response, 404);
  }
}

/**
 * 405 Method Not Allowed
 * 
 * The request method is not supported for the requested resource.
 * 
 * @example
 * ```typescript
 * throw new MethodNotAllowedException('POST not allowed on this endpoint');
 * ```
 */
export class MethodNotAllowedException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Method Not Allowed') {
    super(response, 405);
  }
}

/**
 * 406 Not Acceptable
 * 
 * The requested resource is not capable of generating content acceptable
 * according to the Accept headers sent in the request.
 */
export class NotAcceptableException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Not Acceptable') {
    super(response, 406);
  }
}

/**
 * 408 Request Timeout
 * 
 * The server timed out waiting for the request.
 */
export class RequestTimeoutException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Request Timeout') {
    super(response, 408);
  }
}

/**
 * 409 Conflict
 * 
 * The request conflicts with the current state of the server.
 * 
 * @example
 * ```typescript
 * throw new ConflictException('Email already exists');
 * throw new ConflictException('Version conflict');
 * ```
 */
export class ConflictException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Conflict') {
    super(response, 409);
  }
}

/**
 * 410 Gone
 * 
 * The resource is no longer available and will not be available again.
 */
export class GoneException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Gone') {
    super(response, 410);
  }
}

/**
 * 413 Payload Too Large
 * 
 * The request entity is larger than limits defined by the server.
 */
export class PayloadTooLargeException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Payload Too Large') {
    super(response, 413);
  }
}

/**
 * 415 Unsupported Media Type
 * 
 * The media format of the requested data is not supported by the server.
 */
export class UnsupportedMediaTypeException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Unsupported Media Type') {
    super(response, 415);
  }
}

/**
 * 422 Unprocessable Entity
 * 
 * The server understands the content type, but was unable to process the contained instructions.
 * 
 * @example
 * ```typescript
 * throw new UnprocessableEntityException({
 *   message: 'Validation failed',
 *   details: [
 *     { field: 'email', message: 'Invalid email format' },
 *     { field: 'age', message: 'Must be a positive number' }
 *   ]
 * });
 * ```
 */
export class UnprocessableEntityException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Unprocessable Entity') {
    super(response, 422);
  }
}

/**
 * 429 Too Many Requests
 * 
 * The user has sent too many requests in a given amount of time.
 * 
 * @example
 * ```typescript
 * throw new TooManyRequestsException('Rate limit exceeded. Try again in 60 seconds.');
 * ```
 */
export class TooManyRequestsException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Too Many Requests') {
    super(response, 429);
  }
}

// ============================================================================
// 5xx Server Errors
// ============================================================================

/**
 * 500 Internal Server Error
 * 
 * A generic server error occurred.
 * 
 * @example
 * ```typescript
 * throw new InternalServerErrorException('An unexpected error occurred');
 * ```
 */
export class InternalServerErrorException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Internal Server Error') {
    super(response, 500);
  }
}

/**
 * 501 Not Implemented
 * 
 * The server does not support the functionality required to fulfill the request.
 */
export class NotImplementedException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Not Implemented') {
    super(response, 501);
  }
}

/**
 * 502 Bad Gateway
 * 
 * The server received an invalid response from an upstream server.
 */
export class BadGatewayException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Bad Gateway') {
    super(response, 502);
  }
}

/**
 * 503 Service Unavailable
 * 
 * The server is not ready to handle the request.
 * 
 * @example
 * ```typescript
 * throw new ServiceUnavailableException('Service is under maintenance');
 * ```
 */
export class ServiceUnavailableException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Service Unavailable') {
    super(response, 503);
  }
}

/**
 * 504 Gateway Timeout
 * 
 * The server did not receive a timely response from an upstream server.
 */
export class GatewayTimeoutException extends HttpException {
  constructor(response: string | HttpExceptionBody = 'Gateway Timeout') {
    super(response, 504);
  }
}

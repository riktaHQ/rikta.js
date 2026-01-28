// HTTP Exception
export { HttpException } from './http-exception.js';
export type { HttpExceptionBody, HttpExceptionResponse } from './http-exception.js';

// Validation Exception (Zod)
export { ValidationException } from './validation.exception.js';
export type { ValidationErrorDetails } from './validation.exception.js';

// Specific Exceptions
export {
  // 4xx Client Errors
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  NotAcceptableException,
  RequestTimeoutException,
  ConflictException,
  GoneException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  TooManyRequestsException,
  // 5xx Server Errors
  InternalServerErrorException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from './exceptions.js';

// Exception Filter
export { GlobalExceptionFilter, createExceptionHandler } from './exception-filter.js';
export type { ExceptionFilter, ExceptionContext, ErrorResponse, GlobalExceptionFilterOptions } from './exception-filter.js';

// Catch Decorator
export { Catch, CATCH_METADATA, getCatchMetadata } from './catch.decorator.js';
export type { CatchMetadata } from './catch.decorator.js';

// Config Exceptions
export {
  ConfigProviderAlreadyRegisteredException,
  ConfigProviderNotFoundException,
  ConfigProviderInstantiationException,
} from './config.exceptions.js';

// Discovery Exceptions
export { DiscoveryException } from './discovery.exception.js';
export type { DiscoveryFailure, DiscoveryOptions } from './discovery.exception.js';

// HTTP Exception
export { HttpException, HttpExceptionBody, HttpExceptionResponse } from './http-exception.js';

// Validation Exception (Zod)
export { ValidationException, ValidationErrorDetails } from './validation.exception.js';

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
export { 
  ExceptionFilter, 
  ExceptionContext,
  ErrorResponse,
  GlobalExceptionFilter,
  GlobalExceptionFilterOptions,
  createExceptionHandler,
} from './exception-filter.js';

// Catch Decorator
export { Catch, CatchMetadata, CATCH_METADATA, getCatchMetadata } from './catch.decorator.js';

// Config Exceptions
export {
  ConfigProviderAlreadyRegisteredException,
  ConfigProviderNotFoundException,
  ConfigProviderInstantiationException,
} from './config.exceptions.js';

// Discovery Exceptions
export {
  DiscoveryException,
  DiscoveryFailure,
  DiscoveryOptions,
} from './discovery.exception.js';

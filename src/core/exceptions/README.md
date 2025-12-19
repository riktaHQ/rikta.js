# Exception Handling

Rikta provides a comprehensive exception handling system with standardized JSON error responses.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXCEPTION HANDLING FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Controller/Service                Custom Filter              Global Filter
        │                               │                           │
        │ throw NotFoundException()     │                           │
        ▼                               │                           │
  ┌───────────┐                         │                           │
  │ Exception │─────────────────────────┼───────────────────────────┤
  └───────────┘                         │                           │
        │                               ▼                           │
        │                    ┌─────────────────────┐                │
        │                    │ @Catch(NotFound...) │                │
        │                    │ CustomFilter.catch()│                │
        │                    └─────────────────────┘                │
        │                               │ (if no match)             │
        │                               ▼                           ▼
        │                         ┌─────────────────────────────────────┐
        │                         │     GlobalExceptionFilter.catch()   │
        │                         │  ┌─────────────────────────────────┐│
        │                         │  │ Standard JSON Response:        ││
        │                         │  │ {                               ││
        │                         │  │   statusCode: 404,              ││
        │                         │  │   message: "User not found",    ││
        │                         │  │   error: "Not Found",           ││
        │                         │  │   timestamp: "...",             ││
        │                         │  │   path: "/users/123"            ││
        │                         │  │ }                               ││
        │                         │  └─────────────────────────────────┘│
        │                         └─────────────────────────────────────┘
        ▼
    JSON Response
```

## Quick Start

### Throwing Exceptions

```typescript
import { 
  NotFoundException, 
  BadRequestException,
  UnauthorizedException 
} from 'rikta';

@Controller('/users')
class UserController {
  @Get('/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    
    return user;
  }

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    if (!data.email) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: { email: 'Email is required' }
      });
    }
    
    return this.userService.create(data);
  }
}
```

### Standard Response Format

All exceptions return a consistent JSON structure:

```json
{
  "statusCode": 404,
  "message": "User 123 not found",
  "error": "Not Found",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/users/123",
  "requestId": "abc-123"
}
```

## Available Exceptions

### 4xx Client Errors

| Exception | Status | Description |
|-----------|--------|-------------|
| `BadRequestException` | 400 | Invalid request data |
| `UnauthorizedException` | 401 | Authentication required |
| `ForbiddenException` | 403 | Access denied |
| `NotFoundException` | 404 | Resource not found |
| `MethodNotAllowedException` | 405 | HTTP method not supported |
| `NotAcceptableException` | 406 | Cannot produce acceptable response |
| `RequestTimeoutException` | 408 | Request timed out |
| `ConflictException` | 409 | Resource conflict |
| `GoneException` | 410 | Resource permanently removed |
| `PayloadTooLargeException` | 413 | Request body too large |
| `UnsupportedMediaTypeException` | 415 | Unsupported content type |
| `UnprocessableEntityException` | 422 | Validation failed |
| `TooManyRequestsException` | 429 | Rate limit exceeded |

### 5xx Server Errors

| Exception | Status | Description |
|-----------|--------|-------------|
| `InternalServerErrorException` | 500 | Generic server error |
| `NotImplementedException` | 501 | Feature not implemented |
| `BadGatewayException` | 502 | Invalid upstream response |
| `ServiceUnavailableException` | 503 | Service temporarily unavailable |
| `GatewayTimeoutException` | 504 | Upstream timeout |

## Custom Exceptions

Create your own exceptions by extending `HttpException`:

```typescript
import { HttpException } from 'rikta';

export class PaymentRequiredException extends HttpException {
  constructor(message: string = 'Payment Required') {
    super({
      message,
      error: 'Payment Required',
      code: 'PAYMENT_REQUIRED'
    }, 402);
  }
}

export class ValidationException extends HttpException {
  constructor(errors: Record<string, string[]>) {
    super({
      message: 'Validation failed',
      error: 'Unprocessable Entity',
      details: errors
    }, 422);
  }
}
```

## Custom Exception Filters

Create custom filters to handle specific exception types:

```typescript
import { Catch, ExceptionFilter, ExceptionContext, Injectable } from 'rikta';

@Injectable()
@Catch(ValidationException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ValidationException, context: ExceptionContext) {
    const { reply, path } = context;
    const response = exception.getResponse();
    
    reply.status(422).send({
      statusCode: 422,
      type: 'VALIDATION_ERROR',
      errors: response.details,
      path,
      timestamp: new Date().toISOString()
    });
  }
}

// Multiple exception types
@Injectable()
@Catch(BadRequestException, UnprocessableEntityException)
export class ClientErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, context: ExceptionContext) {
    // Handle multiple client error types
  }
}

// Catch-all filter
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: Error, context: ExceptionContext) {
    // Handle any unhandled exception
  }
}
```

### Registering Custom Filters

```typescript
const app = await Rikta.create({
  exceptionFilters: [
    ValidationExceptionFilter,
    ClientErrorFilter
  ],
  exceptionFilter: {
    includeStack: process.env.NODE_ENV !== 'production',
    logErrors: true
  }
});
```

## Configuration Options

```typescript
const app = await Rikta.create({
  exceptionFilter: {
    // Include stack trace in error response
    // Default: true in development, false in production
    includeStack: process.env.NODE_ENV !== 'production',
    
    // Log errors to console
    // Default: true
    logErrors: true
  }
});
```

## Exception with Details

```typescript
// Simple message
throw new BadRequestException('Invalid email format');

// With details object
throw new BadRequestException({
  message: 'Validation failed',
  error: 'Validation Error',
  code: 'VALIDATION_001',
  details: {
    email: 'Invalid format',
    password: 'Too short'
  }
});

// Response:
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Validation Error",
  "code": "VALIDATION_001",
  "details": {
    "email": "Invalid format",
    "password": "Too short"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/users"
}
```

## Error Logging

The global filter automatically logs errors:

```
⚠️ [2024-01-15T10:30:00.000Z] [req-1] GET /users/123 - 404 User not found
❌ [2024-01-15T10:30:00.000Z] [req-2] POST /users - 500 Database connection failed
    at UserService.create (user.service.ts:45:11)
    at UserController.createUser (user.controller.ts:23:25)
    ...
```

- `⚠️` - Client errors (4xx)
- `❌` - Server errors (5xx) - includes stack trace in development

---
sidebar_position: 7
---

# Custom Decorators

Rikta provides powerful utilities for creating custom decorators, allowing you to extend the framework with your own functionality. This is particularly useful for extracting common patterns into reusable, type-safe decorators.

## Overview

Rikta offers three main utilities for custom decorators:

| Utility | Purpose |
|---------|---------|
| `createParamDecorator` | Create custom parameter decorators |
| `applyDecorators` | Compose multiple decorators into one |
| `SetMetadata` | Store custom metadata on classes/methods |

## createParamDecorator

The `createParamDecorator` function allows you to create custom parameter decorators that extract data from the request context. This is perfect for creating decorators like `@User()`, `@ClientIp()`, or any custom data extraction logic.

### Basic Usage

```typescript
import { createParamDecorator, ExecutionContext, FastifyRequest } from '@riktajs/core';

// Define your user type
interface UserEntity {
  id: string;
  email: string;
  roles: string[];
}

// Extend request type to include user
type AuthenticatedRequest = FastifyRequest & { user: UserEntity };

// Create the @User() decorator
export const User = createParamDecorator<string | undefined, UserEntity | string | undefined>(
  (data, ctx: ExecutionContext) => {
    const request = ctx.getRequest<AuthenticatedRequest>();
    const user = request.user;
    
    // If a property name is provided, return that specific property
    return data ? user?.[data as keyof UserEntity] : user;
  }
);
```

### Using Custom Parameter Decorators

```typescript
import { Controller, Get } from '@riktajs/core';
import { User } from './decorators/user.decorator';

@Controller('/users')
export class UserController {
  // Inject the entire user object
  @Get('/profile')
  getProfile(@User() user: UserEntity) {
    return user;
  }

  // Inject a specific property
  @Get('/email')
  getEmail(@User('email') email: string) {
    return { email };
  }

  // Combine with other decorators
  @Get('/dashboard')
  getDashboard(
    @User() user: UserEntity,
    @User('roles') roles: string[]
  ) {
    return { 
      name: user.email.split('@')[0],
      isAdmin: roles.includes('admin')
    };
  }
}
```

### More Examples

#### @ClientIp Decorator

```typescript
export const ClientIp = createParamDecorator<void, string>((_, ctx) => {
  const request = ctx.getRequest();
  return request.ip || 
         (request.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         'unknown';
});

// Usage
@Get('/analytics')
track(@ClientIp() ip: string) {
  return { recorded: true, ip };
}
```

#### @UserAgent Decorator

```typescript
export const UserAgent = createParamDecorator<void, string>((_, ctx) => {
  const request = ctx.getRequest();
  return request.headers['user-agent'] || 'unknown';
});

// Usage
@Get('/info')
getInfo(@UserAgent() ua: string) {
  return { userAgent: ua };
}
```

#### @Lang Decorator with Default Value

```typescript
export const Lang = createParamDecorator<string, string>((defaultLang, ctx) => {
  const request = ctx.getRequest();
  const acceptLanguage = request.headers['accept-language'];
  return acceptLanguage?.split(',')[0]?.split('-')[0] || defaultLang || 'en';
});

// Usage
@Get('/greeting')
greet(@Lang('en') lang: string) {
  const greetings: Record<string, string> = {
    en: 'Hello',
    es: 'Hola',
    it: 'Ciao',
    fr: 'Bonjour'
  };
  return { greeting: greetings[lang] || greetings.en };
}
```

#### @Session Decorator

```typescript
interface SessionData {
  userId?: string;
  cart?: string[];
  preferences?: Record<string, unknown>;
}

export const Session = createParamDecorator<keyof SessionData | undefined, SessionData | unknown>(
  (data, ctx) => {
    const request = ctx.getRequest<FastifyRequest & { session: SessionData }>();
    const session = request.session || {};
    return data ? session[data] : session;
  }
);

// Usage
@Get('/cart')
getCart(@Session('cart') cart: string[]) {
  return { items: cart || [] };
}
```

### ExecutionContext API

The `ExecutionContext` provides access to the current request context:

```typescript
interface ExecutionContext {
  // Get the Fastify request object
  getRequest<T = FastifyRequest>(): T;
  
  // Get the Fastify reply object
  getReply<T = FastifyReply>(): T;
  
  // Get the controller class
  getClass(): Constructor;
  
  // Get the handler method name
  getHandler(): string | symbol;
  
  // Get metadata by key
  getMetadata<T = unknown>(key: string | symbol): T | undefined;
}
```

## applyDecorators

The `applyDecorators` function combines multiple decorators into a single reusable decorator. This is extremely useful for reducing boilerplate when the same combination of decorators is used frequently.

### Basic Usage

```typescript
import { applyDecorators, SetMetadata, UseGuards } from '@riktajs/core';
import { AuthGuard, RolesGuard } from './guards';

export function Auth(...roles: string[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(AuthGuard, RolesGuard)
  );
}
```

### Using Composed Decorators

```typescript
import { Controller, Get, Post } from '@riktajs/core';
import { Auth } from './decorators/auth.decorator';

@Controller('/admin')
export class AdminController {
  @Auth('admin')
  @Get('/dashboard')
  getDashboard() {
    return { message: 'Welcome to admin dashboard' };
  }

  @Auth('admin', 'moderator')
  @Get('/users')
  getUsers() {
    return { users: [] };
  }

  @Auth('admin')
  @Post('/settings')
  updateSettings() {
    return { success: true };
  }
}
```

### With OpenAPI/Swagger

When using `@riktajs/swagger`, you can include Swagger decorators in your composition:

```typescript
import { applyDecorators, SetMetadata, UseGuards } from '@riktajs/core';
import { 
  ApiBearerAuth, 
  ApiUnauthorizedResponse,
  ApiForbiddenResponse 
} from '@riktajs/swagger';

export function Auth(...roles: string[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(AuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' })
  );
}
```

### Public Endpoint Decorator

```typescript
export const Public = () => applyDecorators(
  SetMetadata('isPublic', true)
);

// In your AuthGuard
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isPublic = context.getMetadata<boolean>('isPublic');
    if (isPublic) {
      return true;
    }
    // ... normal auth logic
  }
}

// Usage
@Controller('/api')
@UseGuards(AuthGuard)
export class ApiController {
  @Public()
  @Get('/health')
  health() {
    return { status: 'ok' };
  }

  @Get('/protected')
  protected() {
    return { data: 'secret' };
  }
}
```

### Rate Limiting Decorator

```typescript
export function RateLimit(limit: number, windowMs: number = 60000) {
  return applyDecorators(
    SetMetadata('rateLimit', { limit, windowMs }),
    UseGuards(RateLimitGuard)
  );
}

// Usage
@Controller('/api')
export class ApiController {
  @RateLimit(100, 60000) // 100 requests per minute
  @Get('/data')
  getData() {
    return { data: [] };
  }
}
```

## SetMetadata

The `SetMetadata` decorator stores custom metadata on classes or methods that can be retrieved later using `ExecutionContext.getMetadata()` or `Reflect.getMetadata()`.

### Basic Usage

```typescript
import { SetMetadata } from '@riktajs/core';

// On a method
class Controller {
  @SetMetadata('roles', ['admin', 'user'])
  @Get()
  handler() {}
}

// On a class
@SetMetadata('version', 'v2')
class VersionedController {}
```

### Creating Custom Metadata Decorators

```typescript
// Create a type-safe @Roles decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Create a @CacheFor decorator
export const CacheFor = (seconds: number) => SetMetadata('cacheTTL', seconds);

// Create a @Throttle decorator
export const Throttle = (limit: number, ttl: number) => 
  SetMetadata('throttle', { limit, ttl });

// Usage
@Controller('/api')
export class ApiController {
  @Roles('admin')
  @CacheFor(300)
  @Throttle(10, 60)
  @Get('/data')
  getData() {
    return { data: [] };
  }
}
```

### Reading Metadata in Guards

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = context.getMetadata<string[]>('roles');
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const request = context.getRequest<AuthenticatedRequest>();
    const user = request.user;

    return requiredRoles.some(role => user?.roles?.includes(role));
  }
}
```

## Complete Example

Here's a complete example combining all custom decorator utilities:

```typescript
// decorators/user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@riktajs/core';

interface User {
  id: string;
  email: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator<keyof User | undefined, User | unknown>(
  (property, ctx: ExecutionContext) => {
    const request = ctx.getRequest<{ user: User }>();
    return property ? request.user?.[property] : request.user;
  }
);
```

```typescript
// decorators/auth.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@riktajs/core';
import { AuthGuard, RolesGuard } from '../guards';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export function Auth(...roles: string[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(AuthGuard, RolesGuard)
  );
}

export const Public = () => SetMetadata('isPublic', true);
```

```typescript
// controllers/user.controller.ts
import { Controller, Get, Post, Body } from '@riktajs/core';
import { CurrentUser } from '../decorators/user.decorator';
import { Auth, Public } from '../decorators/auth.decorator';

@Controller('/users')
export class UserController {
  @Public()
  @Get('/public-info')
  getPublicInfo() {
    return { message: 'This is public' };
  }

  @Auth('user', 'admin')
  @Get('/profile')
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      memberSince: '2024-01-01'
    };
  }

  @Auth('admin')
  @Get('/admin')
  adminOnly(@CurrentUser('email') email: string) {
    return {
      message: `Welcome admin: ${email}`,
      permissions: ['read', 'write', 'delete']
    };
  }
}
```

## Best Practices

1. **Type Safety**: Always provide generic type parameters to `createParamDecorator` for better type inference:
   ```typescript
   createParamDecorator<TData, TResult>((data, ctx) => ...)
   ```

2. **Reusability**: Place custom decorators in a `decorators/` directory and export them from an index file.

3. **Documentation**: Document your custom decorators with JSDoc comments for better IDE support.

4. **Error Handling**: Handle edge cases gracefully in your decorator factories:
   ```typescript
   const User = createParamDecorator((data, ctx) => {
     const user = ctx.getRequest().user;
     if (!user) {
       throw new UnauthorizedException('User not found in request');
     }
     return data ? user[data] : user;
   });
   ```

5. **Composition**: Prefer `applyDecorators` over manually applying multiple decorators when the same combination is used repeatedly.

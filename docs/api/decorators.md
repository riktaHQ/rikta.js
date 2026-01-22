# 🎨 Decorators Reference

Complete reference for all Rikta decorators.

## Class Decorators

### @Controller(prefix?)

Marks a class as an HTTP controller. **Auto-registered!**

```typescript
@Controller()
export class RootController { }

@Controller('/users')
export class UserController { }
```

### @Injectable(options?)

Marks a class as injectable. **Auto-registered!**

```typescript
@Injectable()
class UserService { }

@Injectable({ scope: 'transient' })
class RequestLogger { }
```

### @Provider(token)

Marks a class as a custom provider. **Auto-registered!**

**Two Types of Providers:**

1. **Custom Providers:** Classes with a `provide()` method that returns a value
2. **Config Providers:** Classes extending `AbstractConfigProvider` with a `schema()` method

The decorator automatically detects the provider type and registers it appropriately.

**Custom Provider Example:**
```typescript
import { InjectionToken, Provider, Autowired } from '@riktajs/core';

const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

// Simple value provider
@Provider(APP_CONFIG)
export class AppConfigProvider {
  provide(): AppConfig {
    return {
      name: 'My App',
      version: '1.0.0',
    };
  }
}

// Provider with dependencies
const LOGGER = new InjectionToken<Logger>('logger');

@Provider(LOGGER)
export class LoggerProvider {
  @Autowired(APP_CONFIG)
  private config!: AppConfig;

  provide(): Logger {
    return createLogger({
      appName: this.config.name,
      level: 'info',
    });
  }
}

// Async provider
const DATABASE = new InjectionToken<Database>('database');

@Provider(DATABASE)
export class DatabaseProvider {
  async provide(): Promise<Database> {
    const db = await connectToDatabase();
    return db;
  }
}
```

**Config Provider Example:**
```typescript
import { Provider, AbstractConfigProvider, ConfigProperty } from '@riktajs/core';
import { z } from 'zod';

export const APP_CONFIG = 'APP_CONFIG' as const;

@Provider(APP_CONFIG)
export class AppConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      NODE_ENV: z.enum(['development', 'production', 'test']),
      PORT: z.coerce.number().int().min(1).max(65535),
    });
  }

  @ConfigProperty('NODE_ENV')
  environment!: string;

  @ConfigProperty()
  port!: number;

  constructor() {
    super();
    this.populate();
  }
}

// Use config providers via Dependency Injection
@Injectable()
export class ApiService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;

  getServerUrl() {
    return `http://localhost:${this.config.port}`;
  }

  isProduction() {
    return this.config.environment === 'production';
  }
}
```

📖 See [Configuration Guide](../guide/configuration.md) for complete config provider documentation.

## Route Decorators

### @Get, @Post, @Put, @Patch, @Delete

```typescript
@Controller('/users')
export class UserController {
  @Get()              // GET /users
  findAll() { }

  @Get('/:id')        // GET /users/:id
  findOne() { }

  @Post()             // POST /users
  @HttpCode(201)
  create() { }

  @Put('/:id')        // PUT /users/:id
  update() { }

  @Delete('/:id')     // DELETE /users/:id
  remove() { }
}
```

### @HttpCode(statusCode)

```typescript
@Post()
@HttpCode(201)
create() {
  return { created: true };
}
```

## Parameter Decorators

### @Body(key?)

```typescript
@Post()
create(@Body() data: CreateDto) { }

@Post()
create(@Body('name') name: string) { }
```

### @Param(key?)

```typescript
@Get('/:id')
findOne(@Param('id') id: string) { }
```

### @Query(key?)

```typescript
@Get()
findAll(@Query('page') page: string) { }
```

### @Headers(key?)

```typescript
@Get()
getData(@Headers('authorization') auth: string) { }
```

### @Req() / @Res()

```typescript
@Get()
getData(@Req() request: FastifyRequest) { }

@Get()
sendData(@Res() reply: FastifyReply) { }
```

## Dependency Injection

### @Autowired(token?)

**The universal DI decorator** for both constructor and property injection.

#### Property Injection (Recommended)

```typescript
@Controller('/users')
export class UserController {
  // Auto-infer type from property
  @Autowired()
  private userService!: UserService;

  // With token for interfaces
  @Autowired(LOGGER)
  private logger!: Logger;

  @Get()
  findAll() {
    this.logger.log('Getting users');
    return this.userService.findAll();
  }
}
```

#### Constructor Injection

```typescript
@Injectable()
class ApiService {
  constructor(
    @Autowired() private userService: UserService,
    @Autowired(CONFIG) private config: AppConfig
  ) { }
}
```

### @Optional()

Mark as optional (undefined if not found):

```typescript
// Property
@Optional()
@Autowired()
private analytics?: AnalyticsService;

// With token
@Optional()
@Autowired(FEATURE_FLAG)
private feature?: string;

// Constructor
constructor(
  @Optional() @Autowired(SLACK) private slack?: SlackClient
) { }
```

## Complete Example

```typescript
import { InjectionToken } from '@riktajs/core';

// Define tokens for interfaces
const LOGGER = new InjectionToken<Logger>('logger');
const CONFIG = new InjectionToken<AppConfig>('config');

@Controller('/users')
export class UserController {
  // Property injection - auto-infer
  @Autowired()
  private userService!: UserService;

  // Property injection - with token
  @Autowired(LOGGER)
  private logger!: Logger;

  @Autowired(CONFIG)
  private config!: AppConfig;

  // Optional dependency
  @Optional()
  @Autowired()
  private cache?: CacheService;

  @Get()
  findAll(@Query('limit') limit?: string) {
    this.logger.log('Getting users');
    return this.userService.findAll(limit ? +limit : 10);
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }
}
```

## Decorator Summary

| Decorator | Usage |
|-----------|-------|
| `@Controller(prefix?)` | HTTP controller (auto-registered) |
| `@Injectable(opts?)` | DI service (auto-registered) |
| `@Provider(token)` | Custom provider (auto-registered) |
| `@Get`, `@Post`, etc. | Route methods |
| `@Body`, `@Param`, `@Query` | Request data |
| `@Autowired(token?)` | **Dependency injection** |
| `@Optional()` | Optional dependency |
| `@HttpCode(code)` | Response status |
| `SetMetadata(key, value)` | Store custom metadata |
| `applyDecorators(...decorators)` | Compose multiple decorators |
| `createParamDecorator(factory)` | Create custom param decorators |

## Custom Decorators

Rikta provides powerful utilities for creating custom decorators, allowing you to extend the framework with your own functionality.

### createParamDecorator

Creates a custom parameter decorator that can extract data from the request context.

```typescript
import { createParamDecorator, ExecutionContext } from '@riktajs/core';

// Create a @User() decorator
export const User = createParamDecorator<string | undefined, UserEntity>(
  (data, ctx: ExecutionContext) => {
    const request = ctx.getRequest<FastifyRequest & { user: UserEntity }>();
    const user = request.user;
    
    // If data is provided, return that specific property
    return data ? user?.[data as keyof UserEntity] : user;
  }
);

// Usage in controller
@Controller('/users')
export class UserController {
  @Get('/profile')
  getProfile(@User() user: UserEntity) {
    return user;
  }

  @Get('/email')
  getEmail(@User('email') email: string) {
    return { email };
  }
}
```

**More Examples:**

```typescript
// @ClientIp() - Extract client IP address
export const ClientIp = createParamDecorator<void, string>((_, ctx) => {
  const request = ctx.getRequest();
  return request.ip || 
         (request.headers['x-forwarded-for'] as string) || 
         'unknown';
});

// @UserAgent() - Extract user agent
export const UserAgent = createParamDecorator<void, string>((_, ctx) => {
  const request = ctx.getRequest();
  return request.headers['user-agent'] || 'unknown';
});

// @Lang() - Extract language preference
export const Lang = createParamDecorator<string, string>((defaultLang, ctx) => {
  const request = ctx.getRequest();
  return request.headers['accept-language']?.split(',')[0] || defaultLang || 'en';
});
```

### applyDecorators

Combines multiple decorators into a single reusable decorator.

```typescript
import { applyDecorators, SetMetadata, UseGuards } from '@riktajs/core';

// Create a composed @Auth decorator
export function Auth(...roles: string[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(AuthGuard, RolesGuard)
  );
}

// Usage
@Controller('/admin')
export class AdminController {
  @Auth('admin')
  @Get('/dashboard')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
}
```

**With Swagger Integration:**

```typescript
import { applyDecorators, SetMetadata, UseGuards } from '@riktajs/core';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@riktajs/swagger';

export function Auth(...roles: Role[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(AuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' })
  );
}
```

### SetMetadata

Sets custom metadata on a class or method that can be retrieved later.

```typescript
import { SetMetadata, ExecutionContext, Injectable, CanActivate } from '@riktajs/core';

// Create a @Roles decorator using SetMetadata
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Use in controller
@Controller('/admin')
export class AdminController {
  @Roles('admin', 'moderator')
  @Get()
  adminOnly() {
    return { admin: true };
  }
}

// Read metadata in guard
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = context.getMetadata<string[]>('roles') ?? [];
    const user = context.getRequest().user;
    return roles.some(role => user?.roles?.includes(role));
  }
}
```


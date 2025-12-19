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
import { InjectionToken } from '@rikta/core';

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
| `@Get`, `@Post`, etc. | Route methods |
| `@Body`, `@Param`, `@Query` | Request data |
| `@Autowired(token?)` | **Dependency injection** |
| `@Optional()` | Optional dependency |
| `@HttpCode(code)` | Response status |

---
sidebar_position: 4
---

# Middleware

Middleware are functions that have access to the request and response objects and can execute code before the route handler is invoked. They are perfect for cross-cutting concerns like logging, request transformation, metrics collection, and more.

## Introduction

Middleware in Rikta follows a familiar pattern similar to Express/NestJS middleware:

- **Logging** - Log incoming requests and response times
- **Request transformation** - Modify request data before it reaches handlers
- **Headers** - Add custom headers to responses
- **Rate limiting** - Control request frequency
- **Metrics** - Collect performance data

```
Request ──▶ Guards ──▶ Middleware ──▶ Route Handler
                            │
                            │ next()
                            ▼
                       Continue chain
```

:::info Execution Order
Middleware always executes **AFTER** guards and **BEFORE** the route handler. If a guard rejects the request, middleware will not run.
:::

## Creating Middleware

A middleware implements the `RiktaMiddleware` interface and is decorated with `@Middleware()`, which auto-registers it as a singleton injectable:

```typescript
import { Middleware, RiktaMiddleware, NextFunction } from '@riktajs/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Middleware()
export class LoggerMiddleware implements RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const start = Date.now();
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    res.raw.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    
    next(); // Continue to next middleware/handler
  }
}
```

If you need transient or request scope, override the registration with
`@Injectable({ scope: 'transient' | 'request' })` or register the middleware in
the container before calling `Rikta.create()`.

:::warning Important
You **MUST** call `next()` to continue the request pipeline. If you don't call `next()`, the request will hang indefinitely.
:::

## Using Middleware

### Controller-Level Middleware

Apply middleware to all routes in a controller:

```typescript
import { Controller, Get, UseMiddleware } from '@riktajs/core';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Controller('/api')
@UseMiddleware(LoggerMiddleware)
export class ApiController {
  @Get('/users')
  getUsers() {
    return []; // LoggerMiddleware runs before this
  }

  @Get('/posts')
  getPosts() {
    return []; // LoggerMiddleware runs before this too
  }
}
```

### Route-Level Middleware

Apply middleware to specific routes only:

```typescript
@Controller('/posts')
export class PostController {
  @Get()
  findAll() {
    // No middleware
    return this.postService.findAll();
  }

  @Post()
  @UseMiddleware(RequestIdMiddleware)
  create(@Body() data: CreatePostDto) {
    // RequestIdMiddleware runs before this
    return this.postService.create(data);
  }
}
```

### Multiple Middleware

Apply multiple middleware that execute in order:

```typescript
@Controller('/api')
@UseMiddleware(LoggerMiddleware, MetricsMiddleware, CacheMiddleware)
export class ApiController {
  // Execution order: LoggerMiddleware → MetricsMiddleware → CacheMiddleware → Handler
}
```

### Combined Controller and Route Middleware

Controller-level middleware runs first, then route-level:

```typescript
@Controller('/api')
@UseMiddleware(LoggerMiddleware)  // Runs first for all routes
export class ApiController {
  @Get('/data')
  @UseMiddleware(CacheMiddleware)  // Runs second, only for this route
  getData() {
    return { data: 'value' };  // Runs third
  }

  @Get('/other')
  getOther() {
    return { other: 'data' };  // Only LoggerMiddleware runs
  }
}
```

## Async Middleware

Middleware can be asynchronous for operations like database lookups:

```typescript
@Middleware()
export class UserLoaderMiddleware implements RiktaMiddleware {
  @Autowired()
  private userService!: UserService;

  async use(req: FastifyRequest, res: FastifyReply, next: NextFunction): Promise<void> {
    const userId = req.headers['x-user-id'] as string;
    
    if (userId) {
      const user = await this.userService.findById(userId);
      (req as any).user = user;
    }
    
    await next();
  }
}
```

## Middleware with Dependency Injection

Middleware supports full dependency injection:

```typescript
import { Middleware, RiktaMiddleware, Autowired, Injectable } from '@riktajs/core';

@Injectable()
class MetricsService {
  private requestCount = 0;

  incrementRequests() {
    this.requestCount++;
  }

  getCount() {
    return this.requestCount;
  }
}

@Middleware()
export class MetricsMiddleware implements RiktaMiddleware {
  @Autowired()
  private metricsService!: MetricsService;

  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    this.metricsService.incrementRequests();
    next();
  }
}
```

## Combining Guards and Middleware

When using both guards and middleware on the same controller/route:

```typescript
import { Controller, Get, UseGuards, UseMiddleware } from '@riktajs/core';
import { AuthGuard } from './guards/auth.guard';
import { AuditMiddleware } from './middleware/audit.middleware';

@Controller('/admin')
@UseGuards(AuthGuard)              // 1. Guard runs first
@UseMiddleware(AuditMiddleware)    // 2. Middleware runs after guard passes
export class AdminController {
  @Get('/dashboard')
  getDashboard() {
    return { data: 'Admin dashboard' };  // 3. Handler runs last
  }
}
```

**Execution Order:**
1. `AuthGuard.canActivate()` - If returns `false`, request is rejected (403)
2. `AuditMiddleware.use()` - Only runs if guard passes
3. Route handler

:::tip
Use guards for authorization checks and middleware for logging, metrics, and request transformation. This keeps concerns separated.
:::

## Common Middleware Examples

### Request ID Middleware

Add a unique ID to each request:

```typescript
import { randomUUID } from 'crypto';

@Middleware()
export class RequestIdMiddleware implements RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const requestId = randomUUID();
    
    // Attach to request for use in handlers/other middleware
    (req as any).requestId = requestId;
    
    // Add to response headers for tracing
    res.header('X-Request-Id', requestId);
    
    next();
  }
}
```

### Response Time Middleware

Track and expose response times:

```typescript
@Middleware()
export class ResponseTimeMiddleware implements RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const start = process.hrtime.bigint();
    
    res.raw.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      res.header('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    });
    
    next();
  }
}
```

### Token Decoder Middleware

Decode JWT tokens and attach user info to request:

```typescript
@Middleware()
export class TokenDecoderMiddleware implements RiktaMiddleware {
  @Autowired()
  private jwtService!: JwtService;

  async use(req: FastifyRequest, res: FastifyReply, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await this.jwtService.verify(token);
        (req as any).user = decoded;
      } catch {
        // Token invalid - continue without user (guards will handle auth)
      }
    }
    
    await next();
  }
}
```

### Simple Rate Limiter

Basic in-memory rate limiting:

```typescript
@Middleware()
export class RateLimitMiddleware implements RiktaMiddleware {
  private requests = new Map<string, number[]>();
  private readonly limit = 100;
  private readonly windowMs = 60_000; // 1 minute

  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let ipRequests = this.requests.get(ip) || [];
    ipRequests = ipRequests.filter(time => time > windowStart);
    
    if (ipRequests.length >= this.limit) {
      res.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Try again later.',
        retryAfter: Math.ceil(this.windowMs / 1000)
      });
      return; // Don't call next() - terminate request
    }
    
    ipRequests.push(now);
    this.requests.set(ip, ipRequests);
    
    res.header('X-RateLimit-Limit', this.limit.toString());
    res.header('X-RateLimit-Remaining', (this.limit - ipRequests.length).toString());
    
    next();
  }
}
```

## Best Practices

### Always Call `next()`

Unless you're intentionally terminating the request, always call `next()`:

```typescript
// ❌ Bad - request will hang
use(req, res, next) {
  console.log('Logging...');
  // Forgot to call next()!
}

// ✅ Good
use(req, res, next) {
  console.log('Logging...');
  next();
}
```

### Handle Errors Gracefully

Wrap async operations in try-catch:

```typescript
async use(req, res, next) {
  try {
    await riskyOperation();
    await next();
  } catch (error) {
    console.error('Middleware error:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
}
```

### Keep Middleware Focused

Each middleware should have a single responsibility:

```typescript
// ❌ Bad - doing too much
@Middleware()
class DoEverythingMiddleware {
  use(req, res, next) {
    // Logging + Auth + Rate limiting + Caching + ...
  }
}

// ✅ Good - single responsibility
@Middleware()
class LoggerMiddleware { /* just logging */ }

@Middleware()
class RateLimitMiddleware { /* just rate limiting */ }
```

### Consider Order Carefully

The order of middleware matters:

```typescript
@Controller('/api')
@UseMiddleware(
  RequestIdMiddleware,    // 1st: Generate request ID
  LoggerMiddleware,       // 2nd: Log with request ID available
  RateLimitMiddleware,    // 3rd: Rate limit before heavy processing
)
export class ApiController {}
```

## Guards vs Middleware

| Aspect | Guards | Middleware |
|--------|--------|------------|
| **Purpose** | Authorization decisions | Cross-cutting concerns |
| **Interface** | `CanActivate` | `RiktaMiddleware` |
| **Return type** | `boolean` | `void` (calls `next()`) |
| **Execution** | Before middleware | After guards |
| **Context** | `ExecutionContext` | Raw Fastify `Request`/`Reply` |
| **Block request** | Return `false` → 403 | Don't call `next()` |

**Use Guards for:**
- Authentication checks
- Role-based access control  
- Permission validation

**Use Middleware for:**
- Logging and metrics
- Request/response transformation
- Adding headers
- Rate limiting
- Request timing

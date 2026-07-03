# 🔗 Middleware

Middleware are functions that have access to the request and response objects and can execute code before the route handler is invoked. They are perfect for cross-cutting concerns like logging, request transformation, and adding custom properties to requests.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MIDDLEWARE EXECUTION FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

  HTTP Request      Guards (if any)     Middleware Chain        Route Handler
        │                 │                   │                       │
        ▼                 ▼                   ▼                       │
  ┌───────────┐    ┌───────────┐     ┌───────────────┐                │
  │  Router   │───►│  Guards   │────►│  Middleware 1 │                │
  └───────────┘    └───────────┘     │    use()      │                │
                                     └───────┬───────┘                │
                                             │ next()                 │
                                             ▼                        │
                                     ┌───────────────┐                │
                                     │  Middleware 2 │                │
                                     │    use()      │                │
                                     └───────┬───────┘                │
                                             │ next()                 ▼
                                             │              ┌──────────────────┐
                                             └─────────────►│  Controller       │
                                                            │  Handler Method  │
                                                            └──────────────────┘
```

**Key Points:**
- Middleware executes **AFTER** guards
- Middleware executes **BEFORE** the route handler
- Each middleware must call `next()` to continue the chain
- Middleware can modify the request/response objects
- If `next()` is not called, the request will hang

## Quick Start

### 1. Create a Middleware

Middleware must implement the `RiktaMiddleware` interface and be decorated with `@Middleware()`. The decorator auto-registers the middleware as a singleton injectable:

```typescript
import { Middleware, RiktaMiddleware, NextFunction } from '@riktajs/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Middleware()
export class LoggerMiddleware implements RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next(); // Don't forget to call next()!
  }
}
```

If you need a different scope, override it with `@Injectable({ scope: 'transient' | 'request' })`
or register the middleware manually in the container before `Rikta.create()`.

### 2. Apply Middleware

Use the `@UseMiddleware()` decorator on controllers or methods:

```typescript
import { Controller, Get, UseMiddleware } from '@riktajs/core';
import { LoggerMiddleware } from './logger.middleware';

@Controller('/api')
@UseMiddleware(LoggerMiddleware)
export class ApiController {
  @Get('/')
  getData() {
    return { message: 'Hello!' };
  }
}
```

## RiktaMiddleware Interface

Every middleware must implement the `RiktaMiddleware` interface:

```typescript
interface RiktaMiddleware {
  use(
    req: FastifyRequest,
    res: FastifyReply,
    next: NextFunction
  ): void | Promise<void>;
}
```

- `req` - The Fastify request object
- `res` - The Fastify reply object
- `next` - Function to call to pass control to the next middleware/handler

**Important:** You MUST call `next()` to continue the request pipeline. If you don't call `next()`, the request will hang.

## Creating Middleware

### Basic Middleware

```typescript
import { Middleware, RiktaMiddleware, NextFunction } from '@riktajs/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Middleware()
export class RequestTimingMiddleware implements RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const start = Date.now();
    
    // Add timing header on response finish
    res.raw.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.url} - ${duration}ms`);
    });
    
    next();
  }
}
```

### Async Middleware

Middleware can be asynchronous:

```typescript
@Middleware()
export class AsyncMiddleware implements RiktaMiddleware {
  async use(req: FastifyRequest, res: FastifyReply, next: NextFunction): Promise<void> {
    // Perform async operations
    await someAsyncOperation();
    
    // Continue to next middleware/handler
    await next();
  }
}
```

### Middleware with Dependency Injection

Middleware supports full dependency injection:

```typescript
import { Middleware, RiktaMiddleware, NextFunction, Autowired, Injectable } from '@riktajs/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
class MetricsService {
  recordRequest(method: string, url: string, duration: number) {
    // Record metrics to monitoring system
  }
}

@Middleware()
export class MetricsMiddleware implements RiktaMiddleware {
  @Autowired()
  private metricsService!: MetricsService;

  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const start = Date.now();
    
    res.raw.on('finish', () => {
      const duration = Date.now() - start;
      this.metricsService.recordRequest(req.method, req.url, duration);
    });
    
    next();
  }
}
```

## Using Middleware

### Controller-Level Middleware

Apply middleware to all routes in a controller:

```typescript
import { Controller, Get, Post, UseMiddleware } from '@riktajs/core';

@Controller('/api')
@UseMiddleware(LoggerMiddleware, MetricsMiddleware)
export class ApiController {
  @Get('/users')
  getUsers() {
    // LoggerMiddleware and MetricsMiddleware run before this
    return [];
  }

  @Post('/users')
  createUser() {
    // LoggerMiddleware and MetricsMiddleware run before this too
    return {};
  }
}
```

### Route-Level Middleware

Apply middleware to specific routes:

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

### Combining Controller and Route Middleware

Controller-level middleware runs first, then route-level:

```typescript
@Controller('/api')
@UseMiddleware(LoggerMiddleware)  // Runs first
export class ApiController {
  @Get('/data')
  @UseMiddleware(CacheMiddleware)  // Runs second
  getData() {
    // Handler runs third
    return { data: 'value' };
  }
}
```

Execution order: `LoggerMiddleware` → `CacheMiddleware` → `getData()`

## Combining Guards and Middleware

When using both guards and middleware, guards execute first:

```typescript
@Controller('/admin')
@UseGuards(AuthGuard)              // 1. Guards run first
@UseMiddleware(AuditMiddleware)    // 2. Middleware runs after guards pass
export class AdminController {
  @Get('/dashboard')
  getDashboard() {
    // 3. Handler runs last
    return { data: 'Admin dashboard' };
  }
}
```

**Execution Order:**
1. **Guards** - Check authorization (if guard returns `false`, middleware never runs)
2. **Middleware** - Execute cross-cutting concerns
3. **Handler** - Process the request

## Common Middleware Examples

### Request ID Middleware

Add a unique ID to each request:

```typescript
import { randomUUID } from 'crypto';

@Middleware()
export class RequestIdMiddleware implements RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const requestId = randomUUID();
    
    // Attach to request for use in handlers
    (req as any).requestId = requestId;
    
    // Add to response headers
    res.header('X-Request-Id', requestId);
    
    next();
  }
}
```

### CORS Middleware

Handle CORS headers:

```typescript
@Middleware()
export class CorsMiddleware implements RiktaMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return; // Don't call next() for preflight
    }
    
    next();
  }
}
```

### Token Decoder Middleware

Decode JWT and attach user to request:

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
        // Token invalid, continue without user
      }
    }
    
    await next();
  }
}
```

### Rate Limiting Middleware

Simple in-memory rate limiter:

```typescript
@Middleware()
export class RateLimitMiddleware implements RiktaMiddleware {
  private requests = new Map<string, number[]>();
  private readonly limit = 100; // requests
  private readonly window = 60000; // 1 minute

  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - this.window;
    
    // Get requests for this IP
    let ipRequests = this.requests.get(ip) || [];
    
    // Filter to only requests in current window
    ipRequests = ipRequests.filter(time => time > windowStart);
    
    if (ipRequests.length >= this.limit) {
      res.status(429).send({ 
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Try again later.'
      });
      return;
    }
    
    // Record this request
    ipRequests.push(now);
    this.requests.set(ip, ipRequests);
    
    // Add rate limit headers
    res.header('X-RateLimit-Limit', this.limit.toString());
    res.header('X-RateLimit-Remaining', (this.limit - ipRequests.length).toString());
    
    next();
  }
}
```

## Best Practices

### 1. Always Call `next()`

Unless you're terminating the request early, always call `next()`:

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

### 2. Handle Errors

Wrap async operations in try-catch:

```typescript
async use(req, res, next) {
  try {
    await riskyOperation();
    await next();
  } catch (error) {
    res.status(500).send({ error: 'Internal Server Error' });
  }
}
```

### 3. Keep Middleware Focused

Each middleware should do one thing well:

```typescript
// ❌ Bad - doing too much
@Middleware()
class KitchenSinkMiddleware {
  use(req, res, next) {
    // Logging
    // Auth
    // Rate limiting
    // Caching
    // ...
  }
}

// ✅ Good - single responsibility
@Middleware()
class LoggerMiddleware { /* just logging */ }

@Middleware()
class RateLimitMiddleware { /* just rate limiting */ }
```

### 4. Order Matters

Apply middleware in the correct order:

```typescript
@Controller('/api')
@UseMiddleware(
  RequestIdMiddleware,    // First: Add request ID
  LoggerMiddleware,       // Second: Log with request ID
  AuthMiddleware,         // Third: Check auth
)
export class ApiController {}
```

## Comparison: Guards vs Middleware

| Feature | Guards | Middleware |
|---------|--------|------------|
| Purpose | Authorization | Cross-cutting concerns |
| Interface | `CanActivate` | `RiktaMiddleware` |
| Return | `boolean` | `void` (calls `next()`) |
| Execution | Before middleware | After guards |
| Access | `ExecutionContext` | Raw `Request`/`Reply` |
| Block request | Return `false` | Don't call `next()` |

**Use Guards for:**
- Authentication/Authorization
- Role-based access control
- Permission checks

**Use Middleware for:**
- Logging
- Request transformation
- Adding headers
- Rate limiting
- Request timing/metrics

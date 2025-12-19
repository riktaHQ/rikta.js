# 🎯 Rikta

[![npm version](https://img.shields.io/npm/v/@riktajs/core?color=blue&style=flat-square)](https://www.npmjs.com/package/@riktajs/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A modern TypeScript backend framework with zero-config autowiring, powered by Fastify.

## ✨ Features

- 🎯 **Decorator-based routing** - `@Controller`, `@Get`, `@Post`, etc.
- 💉 **Full Autowiring** - No modules needed, everything is auto-discovered
- 🔌 **Single DI decorator** - `@Autowired()` for everything
- 🔄 **Hybrid Lifecycle** - Interface hooks + EventBus
- 🛡️ **Exception Handling** - Built-in filters with standardized JSON responses
- ✅ **Zod Validation** - Native type-safe validation with automatic type inference
- ⚡ **Fastify under the hood** - Maximum performance
- 🔒 **Type-safe** - Full TypeScript support
- 🪶 **Zero config** - Just decorate and run

## Install in your project

```bash
npm install @riktajs/core
```

## 🚀 Quick Start

```typescript
import { Rikta, Controller, Injectable, Get, Autowired } from '@riktajs/core';

@Injectable()
class GreetingService {
  getGreeting(): string {
    return 'Hello from Rikta!';
  }
}

@Controller()
export class AppController {
  @Autowired()
  private greetingService!: GreetingService;

  @Get('/')
  getHello() {
    return this.greetingService.getGreeting();
  }
}

// No modules - just create and run!
const app = await Rikta.create({ port: 3000, autowired: [__dirname] });
await app.listen();
```

## 📚 Documentation

| Section | Description |
|---------|-------------|
| [Core Architecture](./src/core/README.md) | Framework internals |
| [Dependency Injection](./src/core/container/README.md) | DI, tokens, autowiring |
| [Lifecycle](./src/core/lifecycle/README.md) | Hooks, events, priority |
| [Exception Handling](./src/core/exceptions/README.md) | Errors, filters, responses |
| [Decorators](./src/core/decorators/README.md) | All decorators reference |
| [Router](./src/core/router/README.md) | Routing and requests |
| [Example](./example/README.md) | Working code example |

## 🏃 Running Example

```bash
npm run example  # Full-featured CRUD with lifecycle hooks
```

## ⚙️ Configuration

```typescript
const app = await Rikta.create({
  port: 3000,           // Server port
  host: '0.0.0.0',      // Server host
  logger: true,         // Fastify logging
  prefix: '/api/v1',    // Global prefix
  
  // Auto-discovery paths (default: ['./**'] - scans all files)
  autowired: [path.resolve('./src/controllers'), path.resolve('./src/services')],
  
  // Optional: explicit controller list (skips auto-discovery)
  controllers: [UserController, AppController],
  
  // Exception handling configuration
  exceptionFilter: {
    includeStack: process.env.NODE_ENV !== 'production',
    logErrors: true,
  },
  
  // Custom exception filters
  exceptionFilters: [ValidationExceptionFilter],
});
```

### Auto-Discovery

Rikta automatically scans and imports files to discover `@Controller` and `@Injectable` classes:

```typescript
// Scan specific directories
await Rikta.create({ 
  autowired: [path.resolve('./src/controllers')] 
});

// Default: scans current directory recursively
await Rikta.create({ port: 3000, autowired: [path.resolve('.')] });
```

## 🔄 Lifecycle Hooks

```typescript
@Injectable({ priority: 100 })  // Higher = initialized first
class DatabaseService implements OnProviderInit, OnProviderDestroy {
  async onProviderInit() {
    await this.connect();
  }
  
  async onProviderDestroy() {
    await this.disconnect();
  }
}

// Or use @On() decorator for events
@Injectable()
class MonitoringService {
  @On('app:listen')
  onServerStart({ address }) {
    console.log(`Server at ${address}`);
  }
}
```

See [Lifecycle Documentation](./src/core/lifecycle/README.md) for full details.

## 🛡️ Exception Handling

```typescript
import { 
  NotFoundException, 
  BadRequestException,
  HttpException 
} from '@rikta/core';

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
  async create(@Body() data: CreateUserDto) {
    if (!data.email) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: { email: 'Email is required' }
      });
    }
  }
}
```

**Standard JSON Response:**
```json
{
  "statusCode": 404,
  "message": "User 123 not found",
  "error": "Not Found",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/users/123"
}
```

**Available Exceptions:** `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, `UnprocessableEntityException`, `TooManyRequestsException`, `InternalServerErrorException`, `ServiceUnavailableException`, and more.

See [Exception Handling Documentation](./src/core/exceptions/README.md) for full details.

## ✅ Zod Validation

Rikta has **native Zod integration** for type-safe request validation. Define schemas once and get both runtime validation and TypeScript type inference automatically.

### Basic Usage

```typescript
import { Controller, Post, Body, Query, z } from '@riktajs/core';

// Define your schema
const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().int().positive().optional(),
});

// Type is automatically inferred!
type CreateUser = z.infer<typeof CreateUserSchema>;

@Controller('/users')
class UserController {
  @Post()
  create(@Body(CreateUserSchema) data: CreateUser) {
    // data is fully typed as { name: string; email: string; age?: number }
    // Validation happens automatically before this method is called
    return { success: true, user: data };
  }
}
```

### Validation Error Response

When validation fails, Rikta automatically returns a structured 400 response:

```json
{
  "statusCode": 400,
  "message": "Validation failed for body",
  "error": "Validation Error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/users",
  "details": {
    "errors": [
      { "path": ["email"], "message": "Invalid email format", "code": "invalid_string" },
      { "path": ["name"], "message": "Name is required", "code": "too_small" }
    ],
    "errorCount": 2
  }
}
```

### All Decorators Support Zod

```typescript
import { z, Controller, Get, Post, Body, Query, Param, Headers } from '@riktajs/core';

// Query validation with coercion
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().max(100).default(10),
});

// Route params validation
const IdSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

// Headers validation
const AuthSchema = z.object({
  authorization: z.string().startsWith('Bearer '),
});

@Controller('/items')
class ItemController {
  @Get()
  list(@Query(PaginationSchema) query: z.infer<typeof PaginationSchema>) {
    // query.page and query.limit are numbers (coerced from string)
    return { page: query.page, limit: query.limit };
  }

  @Get('/:id')
  findOne(
    @Param(IdSchema) params: z.infer<typeof IdSchema>,
    @Headers(AuthSchema) headers: z.infer<typeof AuthSchema>
  ) {
    return { id: params.id };
  }
}
```

### Zod Transformations

Zod's transform feature works seamlessly:

```typescript
const DateSchema = z.object({
  date: z.string().transform(val => new Date(val)),
  tags: z.string().transform(val => val.split(',')),
});

@Post('/events')
create(@Body(DateSchema) data: z.infer<typeof DateSchema>) {
  // data.date is a Date object
  // data.tags is string[]
}
```

### With non-Zod Validation

You can also use Rikta without Zod by omitting the schema parameter:

```typescript
@Get('/:id')
findOne(@Param('id') id: string) { ... }

@Post()
create(@Body() data: unknown) { ... }

@Get()
list(@Query('page') page: string) { ... }
```

## 📁 Project Structure

```
rikta/
├── src/core/
│   ├── container/      # Dependency Injection
│   ├── decorators/     # All decorators
│   ├── exceptions/     # Error handling & filters
│   ├── lifecycle/      # Hooks & EventBus
│   ├── router/         # Route handling
│   ├── registry.ts     # Auto-discovery registry
│   └── application.ts  # Bootstrap
└── example/            # Full-featured example
```

## 📜 License

MIT

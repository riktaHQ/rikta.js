# 🔧 Rikta Framework

A modern TypeScript backend framework with zero-config autowiring, powered by Fastify.

## ✨ Features

- 🎯 **Decorator-based routing** - `@Controller`, `@Get`, `@Post`, etc.
- 💉 **Full Autowiring** - No modules needed, everything is auto-discovered
- 🔌 **Single DI decorator** - `@Autowired()` for everything
- 🔄 **Hybrid Lifecycle** - Interface hooks + EventBus
- 🛡️ **Exception Handling** - Built-in filters with standardized JSON responses
- ⚡ **Fastify under the hood** - Maximum performance
- 🔒 **Type-safe** - Full TypeScript support
- 🪶 **Zero config** - Just decorate and run

## 📦 Installation

```bash
npm install
```

## 🚀 Quick Start

```typescript
import { Rikta, Controller, Injectable, Get, Autowired } from '@rikta/core';

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
const app = await Rikta.create({ port: 3000 });
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
  autowired: ['./src/controllers', './src/services'],
  
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
  autowired: ['./src/controllers', './src/services'] 
});

// Scan with glob patterns
await Rikta.create({ 
  autowired: ['./src/**/*.controller.ts', './src/**/*.service.ts'] 
});

// Default: scans current directory recursively
await Rikta.create({ port: 3000 });
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

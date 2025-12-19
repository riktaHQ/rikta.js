# 🏗️ Rikta Core Architecture

This document describes the internal architecture of the Rikta framework.

## Overview

Rikta uses **auto-discovery** - no modules required!

```
┌─────────────────────────────────────────────────────────────┐
│                     Rikta.create()                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Registry   │───▶│  Container   │───▶│    Router    │  │
│  │ (Discovery)  │    │     (DI)     │    │   (Fastify)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ @Controller  │    │ @Injectable  │    │  @Get, etc.  │  │
│  │ auto-register│    │ auto-register│    │    Routes    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## How Auto-Discovery Works

1. **Decoration**: When you use `@Controller` or `@Injectable`, the class is automatically registered in a global registry
2. **Bootstrap**: When you call `Rikta.create()`, all registered controllers are discovered
3. **Resolution**: The DI container resolves all dependencies automatically

```typescript
// This controller is auto-registered when decorated
@Controller('/users')
export class UserController {
  @Autowired()
  private userService!: UserService;  // Auto-resolved!
}

// Just create the app - controllers are found automatically
const app = await Rikta.create({ port: 3000 });
```

## Core Components

### 1. Registry (`registry.ts`)

Global registry for auto-discovery:

```typescript
import { registry } from '@rikta/core';

// Get all auto-discovered controllers
const controllers = registry.getControllers();

// Get all registered providers
const providers = registry.getProviders();
```

### 2. Container (`container/`)

Dependency Injection container:

- **Singleton scope**: One instance (default)
- **Transient scope**: New instance each time
- **Token-based injection**: For interfaces
- **Property injection**: `@Autowired()`

📖 [Full Container Documentation](./container/README.md)

### 3. Decorators (`decorators/`)

Metadata decorators:

- `@Controller` - HTTP request handler (auto-registered)
- `@Injectable` - DI service (auto-registered)
- `@Get`, `@Post`, etc. - Route methods
- `@Autowired`, `@Inject` - Dependency injection

📖 [Full Decorators Documentation](./decorators/README.md)

### 4. Router (`router/`)

HTTP routing via Fastify:

📖 [Full Router Documentation](./router/README.md)

## Request Flow

```
HTTP Request
     │
     ▼
┌─────────┐     ┌─────────────┐     ┌────────────┐
│ Fastify │────▶│   Router    │────▶│ Controller │
└─────────┘     └─────────────┘     └────────────┘
                      │                    │
                      ▼                    ▼
              ┌──────────────┐     ┌─────────────┐
              │   Resolve    │     │   Handler   │
              │   Params     │     │   Method    │
              └──────────────┘     └─────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │  Response   │
                                   └─────────────┘
```

## Lifecycle Hooks

Providers can implement lifecycle interfaces:

| Interface | Method | When Called |
|-----------|--------|-------------|
| `OnModuleInit` | `onModuleInit()` | After provider initialized |
| `OnApplicationBootstrap` | `onApplicationBootstrap()` | After all providers ready |
| `OnApplicationShutdown` | `onApplicationShutdown()` | When `app.close()` called |

```typescript
@Injectable()
class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  async onModuleInit() {
    await this.connect();
  }

  async onApplicationShutdown() {
    await this.disconnect();
  }
}
```

## File Structure

```
core/
├── application.ts      # RiktaFactory bootstrap
├── registry.ts         # Auto-discovery registry
├── constants.ts        # Metadata keys
├── types.ts            # TypeScript interfaces
├── index.ts            # Public exports
├── container/          # Dependency Injection
├── decorators/         # All decorators
└── router/             # HTTP routing
```

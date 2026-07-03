# 🏗️ Rikta Core Architecture

This document describes the internal architecture of the Rikta framework.

## Overview

Rikta uses **auto-discovery** - no modules required!

> **📦 Library Usage:** When you install `@riktajs/core` from npm, it resides in `node_modules`. The auto-discovery system automatically resolves paths relative to **your project directory**, not the library location. This means `./src` will correctly scan your project's `src` folder.

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
│  │ @Provider    │    │   Providers  │    │    Routes    │  │
│  │ auto-register│    │ Config Provs │    │              │  │
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

### Path Resolution (Library Usage)

When `@riktajs/core` is installed in `node_modules`, the auto-discovery system intelligently resolves paths relative to **your calling code**, not the library location.

```typescript
// main.ts (in your project root)
import { Rikta } from '@riktajs/core';

const app = await Rikta.create({
  port: 3000,
  // These paths are resolved relative to THIS file's location,
  // NOT relative to node_modules/@riktajs/core
  autowired: [
    './src/controllers',
    './src/services',
  ]
});
```

**How it works internally:**
1. `discoverModules()` detects the caller's file location via stack trace
2. Relative paths like `./src` are resolved from that location
3. Absolute paths are used as-is
4. The library automatically excludes `node_modules`, `dist`, and test files

## Core Components

### 1. Registry (`registry.ts`)

Global registry for auto-discovery during the decoration phase:

```typescript
import { registry } from '@riktajs/core';

// Get all auto-discovered controllers
const controllers = registry.getControllers();

// Get all registered providers
const providers = registry.getProviders();
```

**Role:** The registry acts as a collection point when decorators are applied. During application initialization, all registered classes are transferred to the DI container for dependency resolution and lifecycle management.

**Note:** Config providers registered via `@Provider` are automatically moved to the container during bootstrap, where they can be injected like any other dependency.

### 2. Container (`container/`)

Dependency Injection container:

- **Singleton scope**: One instance (default)
- **Transient scope**: New instance each time
- **Request scope**: One instance per HTTP request
- **Token-based injection**: For interfaces
- **Property injection**: `@Autowired()`

📖 [Full Container Documentation](./dependency-injection.md)

### 3. Decorators (`decorators/`)

Metadata decorators:

- `@Controller` - HTTP request handler (auto-registered)
- `@Injectable` - DI service (auto-registered)
- `@Provider` - Custom provider (auto-registered)
- `@Get`, `@Post`, etc. - Route methods
- `@Autowired`, `@Inject` - Dependency injection

📖 [Full Decorators Documentation](../api/decorators.md)

### 4. Router (`router/`)

HTTP routing via Fastify:

📖 [Full Router Documentation](./routing.md)

### 5. Configuration System

Configuration providers extend `AbstractConfigProvider` and use the `@Provider` decorator:

```typescript
@Provider('APP_CONFIG')
export class AppConfigProvider extends AbstractConfigProvider {
  schema() { /* Zod schema */ }
  // Properties decorated with @ConfigProperty
}
```

**How it works:**
1. **Registration:** `@Provider` decorator registers the config class in the registry
2. **Bootstrap:** During `Rikta.create()`, config providers are transferred to the container
3. **Resolution:** Config instances can be injected using `@Autowired(APP_CONFIG)`

The container manages config provider instantiation and ensures singleton scope.

📖 [Full Configuration Documentation](./configuration.md)

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
| `OnProviderInit` | `onProviderInit()` | After singleton provider initialized |
| `OnProviderDestroy` | `onProviderDestroy()` | During singleton provider shutdown |
| `OnApplicationBootstrap` | `onApplicationBootstrap()` | After all providers ready |
| `OnApplicationShutdown` | `onApplicationShutdown()` | When `app.close()` called |

```typescript
@Injectable()
class DatabaseService implements OnProviderInit, OnApplicationShutdown {
  async onProviderInit() {
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

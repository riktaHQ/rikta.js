# 🧭 Rikta

> **The Zero-Config TypeScript Framework for Modern Backends.**
 
Build scalable APIs with the power of Fastify and the elegance of decorators. No modules. No boilerplate. Just code.

[![NPM Version](https://img.shields.io/npm/v/@riktajs/core)](https://www.npmjs.com/package/@riktajs/core)
[![License](https://img.shields.io/npm/l/@riktajs/core)](LICENSE)

---

<img src="https://fsn1.your-objectstorage.com/artiforge/rikta-installed.png" align="center" alt="Rikta installed" />

## 🤔 Why Rikta?

Do you miss the simplicity of Express but need the structure of a real framework?

**Rikta** is designed for developers who want to move fast without breaking things.

*   🚀 **Zero-Config Autowiring:** No `imports: []`, `exports: []`, or `providers: []` arrays. Just decorate your class, and it works.
*   ⚡ **Fastify Powered:** Built on top of Fastify for maximum performance and low overhead.
*   🛡️ **Type-Safe by Default:** Native Zod integration for validation that infers your TypeScript types automatically.
*   🔄 **Hybrid Lifecycle:** Powerful hooks and an event bus for complex application flows.

Rikta is nordic for "guide". Let Rikta guide you to build better backends, faster.

---

## ⚡ Quick Start

Get up and running in seconds with the Rikta CLI:

```bash
# Create a new project
npx @riktajs/cli new my-app

# Start development
cd my-app
npm run dev
```

That's it! 🎉 Your API is running at `http://localhost:3000`

### What you get

The CLI generates a complete project with:
- ✅ TypeScript configuration optimized for Rikta
- ✅ Example controller with REST endpoints
- ✅ Example service with dependency injection
- ✅ Hot reload development server
- ✅ Production build for serverless deployment

### Generated Code Example

```typescript
// src/controllers/app.controller.ts
import { Controller, Get, Autowired } from '@riktajs/core';
import { GreetingService } from '../services/greeting.service.js';

@Controller()
export class AppController {
  @Autowired()
  private greetingService!: GreetingService;

  @Get('/')
  index() {
    return { message: this.greetingService.getGreeting() };
  }

  @Get('/health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

```typescript
// src/services/greeting.service.ts
import { Injectable } from '@riktajs/core';

@Injectable()
export class GreetingService {
  getGreeting(): string {
    return 'Welcome to Rikta! 🚀';
  }
}
```

---

## 📦 Packages

| Package | Description | Version |
|---------|-------------|---------|
| [@riktajs/core](./packages/core) | Core framework with DI, routing, and validation | [![npm](https://img.shields.io/npm/v/@riktajs/core)](https://www.npmjs.com/package/@riktajs/core) |
| [@riktajs/cli](./packages/cli) | CLI for scaffolding and development | [![npm](https://img.shields.io/npm/v/@riktajs/cli)](https://www.npmjs.com/package/@riktajs/cli) |
| [@riktajs/swagger](./packages/swagger) | OpenAPI/Swagger documentation | [![npm](https://img.shields.io/npm/v/@riktajs/swagger)](https://www.npmjs.com/package/@riktajs/swagger) |
| [@riktajs/typeorm](./packages/typeorm) | TypeORM integration | [![npm](https://img.shields.io/npm/v/@riktajs/typeorm)](https://www.npmjs.com/package/@riktajs/typeorm) |
| [@riktajs/queue](./packages/queue) | BullMQ-based job queue integration for Rikta | [![npm](https://img.shields.io/npm/v/@riktajs/queue)](https://www.npmjs.com/package/@riktajs/queue) |

---

## 🛠️ CLI Commands

| Command | Description |
|---------|-------------|
| `rikta new <name>` | Create a new Rikta project |
| `rikta dev` | Start development server with hot reload |
| `rikta build` | Build for production (serverless optimized) |

```bash
# Global installation (optional)
npm install -g @riktajs/cli

# Or use npx directly
npx @riktajs/cli new my-app
```

See the [CLI Guide](./docs/guide/cli.md) for full documentation.

---

## 📚 Documentation

Everything you need to build production-ready APIs.

| Guide | Description |
|-------|-------------|
| [**Architecture**](./docs/guide/architecture.md) | How Rikta's auto-discovery works under the hood. |
| [**Dependency Injection**](./docs/guide/dependency-injection.md) | Using `@Autowired`, tokens, and scopes. |
| [**Configuration**](./docs/guide/configuration.md) | Type-safe configuration with .env and Zod validation. |
| [**Routing**](./docs/guide/routing.md) | Controllers, methods, and parameter handling. |
| [**Validation**](./docs/guide/validation.md) | **New!** Type-safe validation with Zod. |
| [**Lifecycle**](./docs/guide/lifecycle.md) | Hooks (`OnProviderInit`) and the Event Bus. |
| [**Error Handling**](./docs/guide/error-handling.md) | Exception filters and standard JSON responses. |
| [**CLI Guide**](./packages/cli/README.md) | Using the Rikta CLI. |
| [**Benchmarks**](./benchmarks/README.md) | Performance comparison with Fastify & NestJS. |

---

## ⚡ Performance

Rikta is built on Fastify and delivers **excellent performance**. From our [benchmarks](./benchmarks/README.md):

| Metric | Rikta vs NestJS | Result |
|--------|-----------------|--------|
| **Startup** | 🟢 **-43%** | Rikta is faster |
| **GET requests** | 🟢 **-41%** | Rikta is faster |
| **POST requests** | 🟢 **-25%** | Rikta is faster |
| **Param requests** | 🟢 **-46%** | Rikta is faster |
| **Average** | 🟢 **~40%** | Rikta is faster |

Rikta adds minimal overhead (~2-5%) over vanilla Fastify while providing DI, decorators, and structured architecture.

For detailed tests:
```bash
cd benchmarks
npm install
npm run bench
```

### Production Mode

For maximum performance, use silent mode:

```typescript
const app = await Rikta.create({
  port: 3000,
  silent: true,   // Disable all console output
  logger: false   // Disable Fastify logging
});
```

---

## ✨ Key Features

### 🚫 No Modules, Just Logic
Forget about `AppModule`, `UserModule`, `SharedModule`. Rikta scans your code and resolves dependencies automatically.

### ✅ Native Zod Validation
Don't duplicate your types. Define a Zod schema, and Rikta validates the request *and* gives you the TypeScript type.

```typescript
@Post()
create(@Body(UserSchema) user: z.infer<typeof UserSchema>) {
  // If we get here, 'user' is valid and typed.
  // If not, Rikta returns a 400 Bad Request automatically.
}
```

### 🔌 Powerful Dependency Injection
Support for Singleton (default) and Transient scopes, factory providers, and value tokens.

```typescript
@Injectable()
class AuthService {
  constructor(
    @Autowired(DB_CONFIG) private config: Config,
    @Autowired() private logger: LoggerService
  ) {}
}
```

---

## 💖 Sponsors

Rikta is proudly sponsored by:

<a href="https://artiforge.ai" target="_blank">
  <img src="https://artiforge.ai/artiforge-logo.svg" alt="Artiforge" height="40" />
</a>

**[Artiforge](https://artiforge.ai)** - AI-powered development tools

---

## 🤝 Contributing

We love contributions! Please check our [Contributing Guide](CONTRIBUTING.md) (Coming Soon) and join our community.

## 📄 License

Rikta is [MIT licensed](LICENSE).

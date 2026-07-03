---
id: introduction
slug: /
sidebar_position: 1
title: Introduction
---

# Introduction

> **The Zero-Config TypeScript Framework for Modern Backends.**

Build scalable APIs with the power of Fastify and the elegance of decorators. No modules. No boilerplate. Just code.

## 🤔 Why Rikta?

Do you miss the simplicity of Express but need the structure of a real framework?

**Rikta** is designed for developers who want to move fast without breaking things.

- 🚀 **Zero-Config Autowiring:** No `imports: []`, `exports: []`, or `providers: []` arrays. Just decorate your class, and it works.
- ⚡ **Fastify Powered:** Built on top of Fastify for maximum performance and low overhead.
- 🛡️ **Type-Safe by Default:** Native Zod integration for validation that infers your TypeScript types automatically.
- 🔄 **Hybrid Lifecycle:** Powerful hooks and an event bus for complex application flows.

*Rikta is nordic for "guide". Let Rikta guide you to build better backends, faster.*

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

## 📦 Packages

| Package | Description |
|---------|-------------|
| [@riktajs/core](/docs/api-reference) | Core framework with DI, routing, and validation |
| [@riktajs/cli](/docs/cli/overview) | CLI for scaffolding and development |
| [@riktajs/swagger](/docs/openapi/introduction) | OpenAPI/Swagger documentation |
| [@riktajs/typeorm](/docs/database/typeorm) | TypeORM integration |

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

## ⚡ Performance

Rikta is built on Fastify and delivers **excellent performance**:

| Metric | Rikta vs NestJS | Result |
|--------|-----------------|--------|
| **Startup** | 🟢 **-43%** | Rikta is faster |
| **GET requests** | 🟢 **-41%** | Rikta is faster |
| **POST requests** | 🟢 **-25%** | Rikta is faster |
| **Param requests** | 🟢 **-46%** | Rikta is faster |
| **Average** | 🟢 **~40%** | Rikta is faster |

Rikta adds minimal overhead (~2-5%) over vanilla Fastify while being ~40% faster than NestJS.

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

Support for Singleton (default), Transient, and Request scopes, factory providers, and value tokens.

```typescript
@Injectable()
class AuthService {
  constructor(
    @Autowired(DB_CONFIG) private config: Config,
    @Autowired() private logger: LoggerService
  ) {}
}
```

## Next Steps

Ready to get started? Head to the [First Steps](/docs/overview/first-steps) guide!

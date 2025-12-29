# 🧭 Rikta

> **The Zero-Config TypeScript Framework for Modern Backends.**
 
Build scalable APIs with the power of Fastify and the elegance of decorators. No modules. No boilerplate. Just code.

[![NPM Version](https://img.shields.io/npm/v/@riktajs/core)](https://www.npmjs.com/package/@riktajs/core)
[![License](https://img.shields.io/npm/l/@riktajs/core)](LICENSE)

---

## 🤔 Why Rikta?

Are you tired of **"Module Hell"** in NestJS? Do you miss the simplicity of Express but need the structure of a real framework?

**Rikta** is designed for developers who want to move fast without breaking things.

*   🚀 **Zero-Config Autowiring:** No `imports: []`, `exports: []`, or `providers: []` arrays. Just decorate your class, and it works.
*   ⚡ **Fastify Powered:** Built on top of Fastify for maximum performance and low overhead.
*   🛡️ **Type-Safe by Default:** Native Zod integration for validation that infers your TypeScript types automatically.
*   🔄 **Hybrid Lifecycle:** Powerful hooks and an event bus for complex application flows.

Rikta is nordic for "guide". Let Rikta guide you to build better backends, faster.

---

## ⚡ Quick Start

### 1. Install

```bash
npm install @riktajs/core
```

### 2. Create your App

No complex setup. Just one file is enough to start.

```typescript
// main.ts
import { Rikta, Controller, Injectable, Get, Post, Body, Autowired, z } from '@riktajs/core';

// 1. Define a Service (Auto-discovered!)
@Injectable()
class UserService {
  private users = [{ id: 1, name: 'Rikta User' }];

  findAll() { return this.users; }
  
  create(name: string) {
    const user = { id: this.users.length + 1, name };
    this.users.push(user);
    return user;
  }
}

// 2. Define a Schema (Type-safe!)
const CreateUserSchema = z.object({
  name: z.string().min(3)
});

// 3. Define a Controller (Auto-discovered!)
@Controller('/users')
export class UserController {
  @Autowired()
  private userService!: UserService; // Dependency Injection works like magic

  @Get()
  getUsers() {
    return this.userService.findAll();
  }

  @Post()
  createUser(@Body(CreateUserSchema) body: z.infer<typeof CreateUserSchema>) {
    // 'body' is fully typed here!
    return this.userService.create(body.name);
  }
}

// 4. Run it!
// autowired paths are resolved relative to your project, not node_modules!
const app = await Rikta.create({ 
  port: 3000, 
  autowired: ['./src']  // Relative paths are resolved from YOUR project directory
});
await app.listen();
console.log('🚀 Server running on http://localhost:3000');
```

---

## 📚 Documentation

Everything you need to build production-ready APIs.

| Guide | Description |
|-------|-------------|
| [**Architecture**](./docs/guide/architecture.md) | How Rikta's auto-discovery works under the hood. |
| [**Dependency Injection**](./docs/guide/dependency-injection.md) | Using `@Autowired`, tokens, and scopes. |
| [**Routing**](./docs/guide/routing.md) | Controllers, methods, and parameter handling. |
| [**Validation**](./docs/guide/validation.md) | **New!** Type-safe validation with Zod. |
| [**Lifecycle**](./docs/guide/lifecycle.md) | Hooks (`OnProviderInit`) and the Event Bus. |
| [**Error Handling**](./docs/guide/error-handling.md) | Exception filters and standard JSON responses. |
| [**Benchmarks**](./benchmarks/README.md) | Performance comparison with Fastify & NestJS. |

---

## ⚡ Performance

Rikta is built on Fastify and delivers **excellent performance**. From our [benchmarks](./benchmarks/README.md):

| Metric | Rikta vs NestJS | Result |
|--------|-----------------|--------|
| **Startup** | 🟢 **-37.7%** | Rikta is faster |
| **GET requests** | 🟢 **-44.3%** | Rikta is faster |
| **POST requests** | 🟢 **-14.8%** | Rikta is faster |
| **Param requests** | 🟢 **-36.7%** | Rikta is faster |
| **Average** | 🟢 **-32.0%** | Rikta is faster |

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

## 🤝 Contributing

We love contributions! Please check our [Contributing Guide](CONTRIBUTING.md) (Coming Soon) and join our community.

## 📄 License

Rikta is [MIT licensed](LICENSE).
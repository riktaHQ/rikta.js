# @riktajs/core

The core package of the Rikta framework.

See the [main repository README](../../README.md) for full documentation.

## Installation

```bash
npm install @riktajs/core
```

## Quick Start

```typescript
import { Rikta, Controller, Injectable, Get, Autowired } from '@riktajs/core';

@Injectable()
class HelloService {
  getMessage() {
    return { message: 'Hello from Rikta!' };
  }
}

@Controller('/api')
class HelloController {
  @Autowired()
  private helloService!: HelloService;

  @Get('/hello')
  getHello() {
    return this.helloService.getMessage();
  }
}

const app = await Rikta.create({ 
  port: 3000, 
  autowired: ['./src']
});
await app.listen();
```

## Features

- 🚀 Zero-Config Autowiring
- ⚡ Fastify Powered
- 🛡️ Type-Safe by Default
- 🔄 Hybrid Lifecycle
- 📦 Built-in Dependency Injection
- ✅ Zod Validation Integration

## Provider Scopes

Rikta supports three provider scopes:

```typescript
// Singleton (default) - shared instance
@Injectable()
class ConfigService {}

// Transient - new instance each time
@Injectable({ scope: 'transient' })
class RequestLogger {}

// Request - one instance per HTTP request
@Injectable({ scope: 'request' })
class RequestContext {}
```

Request-scoped providers can be injected into singleton controllers, guards,
middleware, and interceptors. Rikta injects a lazy proxy and resolves the real
instance from the current HTTP request. Accessing that dependency outside a
request handler throws.

## Strict Discovery Mode

Enable strict discovery to catch import errors early:

```typescript
const app = await Rikta.create({
  strictDiscovery: process.env.NODE_ENV !== 'production',
  onDiscoveryError: (file, error) => {
    console.warn(`Failed to import: ${file}`);
  },
});
```

## EventBus

The EventBus provides pub/sub for lifecycle events:

```typescript
import { Injectable, Autowired, EventBus } from '@riktajs/core';

@Injectable()
class MonitorService {
  @Autowired()
  private events!: EventBus;

  onProviderInit() {
    this.events.on('app:listen', ({ address }) => {
      console.log(`Server at ${address}`);
    });
  }
}
```

## Interceptors

Interceptors allow you to bind extra logic before/after method execution:

```typescript
import { Injectable, Interceptor, ExecutionContext, CallHandler, UseInterceptors } from '@riktajs/core';

@Injectable()
class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const start = Date.now();
    const result = await next.handle();
    console.log(`Request took ${Date.now() - start}ms`);
    return result;
  }
}

@Controller('/api')
@UseInterceptors(LoggingInterceptor)
class ApiController {
  @Get('/data')
  getData() {
    return { data: 'example' };
  }
}
```

## License

MIT

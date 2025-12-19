# 🔄 Lifecycle System

Rikta provides a hybrid lifecycle system combining **interface-based hooks** (type-safe) with an **event bus** (flexible).

## Lifecycle Flow

```
Rikta.create()
│
├─ 🔍 Auto-discovery
│   └─ Emit: 'app:discovery'
│
├─ ⚡ Process @Provider classes
│   └─ Emit: 'app:providers'
│
├─ 📦 Initialize providers (sorted by priority DESC)
│   ├─ Call: onProviderInit()
│   └─ Emit: 'provider:init' (per provider)
│
├─ 📡 Register routes
│   └─ Emit: 'app:routes'
│
├─ ✅ Bootstrap complete
│   ├─ Call: onApplicationBootstrap()
│   └─ Emit: 'app:bootstrap'
│
app.listen()
│
├─ 🚀 Server starts
│   ├─ Call: onApplicationListen(address)
│   └─ Emit: 'app:listen'
│
app.close()
│
├─ 🛑 Shutdown (reverse priority order)
│   ├─ Emit: 'app:shutdown'
│   ├─ Call: onApplicationShutdown(signal?)
│   ├─ Call: onProviderDestroy()
│   └─ Emit: 'app:destroy'
```

## Interface Hooks (Type-Safe)

### OnProviderInit

Called after a provider is instantiated and dependencies injected:

```typescript
import { Injectable, OnProviderInit } from '@rikta/core';

@Injectable({ priority: 100 })  // Higher = initialized first
class DatabaseService implements OnProviderInit {
  async onProviderInit() {
    await this.connect();
    console.log('Database connected');
  }
}
```

### OnProviderDestroy

Called during shutdown, in reverse priority order:

```typescript
@Injectable({ priority: 100 })
class DatabaseService implements OnProviderDestroy {
  async onProviderDestroy() {
    await this.connection.close();
    console.log('Database disconnected');
  }
}
```

### OnApplicationBootstrap

Called once after all providers are initialized:

```typescript
@Injectable()
class AppService implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    console.log('Application fully initialized');
  }
}
```

### OnApplicationListen

Called after the server starts listening:

```typescript
@Injectable()
class HealthService implements OnApplicationListen {
  onApplicationListen(address: string) {
    console.log(`Health checks active at ${address}/health`);
  }
}
```

### OnApplicationShutdown

Called when app.close() is invoked:

```typescript
@Injectable()
class MetricsService implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    console.log(`Shutting down: ${signal}`);
    await this.flushMetrics();
  }
}
```

## @On() Decorator (Event-Based)

For more flexibility, use the `@On()` decorator:

```typescript
import { Injectable, On } from '@rikta/core';

@Injectable()
class MonitoringService {
  @On('app:listen')
  onServerStart({ address, port }) {
    console.log(`Server at ${address}:${port}`);
  }

  @On('app:shutdown')
  async onShutdown({ signal }) {
    await this.reportFinalMetrics();
  }

  @On('provider:init')
  onProviderInit({ name, priority }) {
    console.log(`Provider ${name} initialized (priority: ${priority})`);
  }
}
```

## Built-in Events

| Event | Payload | When |
|-------|---------|------|
| `app:discovery` | `{ files: string[] }` | After file discovery |
| `app:providers` | `{ count: number }` | After @Provider processed |
| `provider:init` | `{ provider, name, priority }` | Per provider init |
| `app:routes` | `{ count: number }` | After routes registered |
| `app:bootstrap` | `{ providerCount: number }` | App fully ready |
| `app:listen` | `{ address, port }` | Server listening |
| `app:shutdown` | `{ signal?: string }` | Shutdown started |
| `app:destroy` | `{ uptime: number }` | App fully closed |

## Priority System

Control initialization order with the `priority` option:

```typescript
@Injectable({ priority: 100 })  // First
class DatabaseService { }

@Injectable({ priority: 50 })   // Second
class CacheService { }

@Injectable()                    // Last (priority: 0)
class UserService { }
```

**Shutdown order is reversed**: Lower priority providers are destroyed first.

## EventBus (Programmatic)

For advanced use cases, inject the EventBus directly:

```typescript
import { Injectable, EventBus } from '@rikta/core';

@Injectable()
class CustomService {
  constructor(private events: EventBus) {
    // Subscribe
    const unsubscribe = events.on('app:listen', ({ address }) => {
      console.log(`Listening at ${address}`);
    });

    // One-time listener
    events.once('app:shutdown', () => {
      console.log('Goodbye!');
    });
  }
}

// In bootstrap
async function main() {
  const app = await Rikta.create({ port: 3000 });
  
  // Wait for specific event
  const { address } = await app.getEventBus().waitFor('app:listen');
  
  await app.listen();
}
```

## Custom Events

Emit your own events:

```typescript
@Injectable()
class OrderService {
  constructor(private events: EventBus) {}

  async placeOrder(data: OrderDto) {
    const order = await this.save(data);
    
    // Emit custom event
    await this.events.emit('order:placed', { order });
    
    return order;
  }
}

@Injectable()
class NotificationService {
  @On('order:placed')
  async sendConfirmation({ order }) {
    await this.email.send(order.email, 'Order confirmed!');
  }
}
```


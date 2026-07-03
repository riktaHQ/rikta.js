---
sidebar_position: 3
---

# Lifecycle Events

Rikta provides hooks into key application lifecycle events, allowing you to run initialization logic, cleanup tasks, and respond to application state changes.

## Overview

Understanding the application lifecycle is crucial for:

- **Initializing resources** (database connections, caches)
- **Graceful shutdown** (closing connections, flushing buffers)
- **Health checks** (monitoring readiness and liveness)
- **Logging and metrics** (tracking application state)

## Lifecycle Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Lifecycle                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Rikta.create() called                                   │
│           │                                                 │
│           ▼                                                 │
│  2. Container initialization                                │
│           │                                                 │
│           ▼                                                 │
│  3. Providers registered                                    │
│           │                                                 │
│           ▼                                                 │
│  4. OnProviderInit hooks called (singleton providers only)  │
│           │                                                 │
│           ▼                                                 │
│  5. Routes registered                                       │
│           │                                                 │
│           ▼                                                 │
│  6. app.listen() - Server starts                            │
│           │                                                 │
│           ▼                                                 │
│  7. OnApplicationListen hooks called                        │
│           │                                                 │
│           ▼                                                 │
│  8. Application running...                                  │
│           │                                                 │
│           ▼                                                 │
│  9. Shutdown signal received                                │
│           │                                                 │
│           ▼                                                 │
│  10. OnApplicationShutdown hooks called                     │
│           │                                                 │
│           ▼                                                 │
│  11. Application terminated                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Lifecycle Hooks

### OnProviderInit

Implement this interface to run code when a singleton provider is instantiated and dependencies are injected:

```typescript
import { Injectable, OnProviderInit } from '@riktajs/core';

@Injectable()
export class DatabaseService implements OnProviderInit {
  private connection: Connection;

  async onProviderInit() {
    console.log('Initializing database connection...');
    this.connection = await createConnection();
    console.log('Database connected!');
  }
}
```

:::warning Request Scope and Lifecycle Hooks
Lifecycle hooks only run for singleton providers. If a singleton injects a
request-scoped dependency, do not access that dependency from the constructor,
`onProviderInit()`, or `onApplicationBootstrap()`. The lazy proxy becomes valid
only during HTTP request handling.
:::

### OnApplicationListen

Implement this interface to run code when the application is fully started and ready to accept requests:

```typescript
import { Injectable, OnApplicationListen } from '@riktajs/core';

@Injectable()
export class MonitoringService implements OnApplicationListen {
  async onApplicationListen(address: string) {
    console.log(`Application is ready at ${address}!`);
    await this.registerWithServiceDiscovery();
    await this.startHealthChecks();
  }

  private async registerWithServiceDiscovery() {
    // Register this instance with service discovery
  }

  private async startHealthChecks() {
    // Start periodic health checks
  }
}
```

### OnApplicationShutdown

Implement this interface to run code when the application receives a shutdown signal:

```typescript
import { Injectable, OnApplicationShutdown, Autowired } from '@riktajs/core';

@Injectable()
export class CleanupService implements OnApplicationShutdown {
  @Autowired()
  private database!: DatabaseService;

  @Autowired()
  private cache!: CacheService;

  async onApplicationShutdown(signal?: string) {
    console.log(`Shutting down gracefully (${signal})...`);
    
    // Close database connections
    await this.database.disconnect();
    
    // Flush cache
    await this.cache.flush();
    
    // Deregister from service discovery
    await this.deregisterService();
    
    console.log('Cleanup complete');
  }
}
```

## Async Hooks

All lifecycle hooks support async operations:

```typescript
@Injectable()
export class StartupService implements OnProviderInit {
  async onProviderInit() {
    await this.loadConfiguration();
    await this.warmupCache();
    await this.validateConnections();
  }

  private async loadConfiguration() {
    // Load remote configuration
  }

  private async warmupCache() {
    // Pre-populate cache with common data
  }

  private async validateConnections() {
    // Verify external service connections
  }
}
```

## Order of Execution

Lifecycle hooks are executed in the order providers are registered:

```typescript
@Injectable()
export class ServiceA implements OnProviderInit {
  onProviderInit() {
    console.log('ServiceA initialized'); // Called first
  }
}

@Injectable()
export class ServiceB implements OnProviderInit {
  @Autowired()
  private serviceA!: ServiceA;

  onProviderInit() {
    console.log('ServiceB initialized'); // Called after ServiceA
  }
}
```

## Practical Examples

### Database Connection Manager

```typescript
import { Injectable, OnProviderInit, OnApplicationShutdown } from '@riktajs/core';

@Injectable()
export class DatabaseManager implements OnProviderInit, OnApplicationShutdown {
  private pool: ConnectionPool;

  async onProviderInit() {
    console.log('Creating database connection pool...');
    this.pool = await createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      max: 20,
    });
    console.log('Database pool created');
  }

  async onApplicationShutdown() {
    console.log('Closing database connections...');
    await this.pool.end();
    console.log('Database connections closed');
  }

  getPool(): ConnectionPool {
    return this.pool;
  }
}
```

### Health Check Service

```typescript
import { Injectable, OnApplicationListen, Autowired } from '@riktajs/core';

@Injectable()
export class HealthCheckService implements OnApplicationListen {
  @Autowired()
  private database!: DatabaseManager;

  private isReady = false;

  async onApplicationListen(address: string) {
    this.isReady = true;
    console.log(`Health check: Application ready at ${address}`);
  }

  async checkHealth(): Promise<HealthStatus> {
    const dbHealthy = await this.checkDatabase();
    
    return {
      status: this.isReady && dbHealthy ? 'healthy' : 'unhealthy',
      checks: {
        database: dbHealthy,
        ready: this.isReady,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.database.getPool().query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: Record<string, boolean>;
  timestamp: string;
}
```

### Graceful Shutdown Handler

```typescript
import { Injectable, OnApplicationShutdown, Autowired } from '@riktajs/core';

@Injectable()
export class GracefulShutdown implements OnApplicationShutdown {
  private shutdownInProgress = false;

  @Autowired()
  private database!: DatabaseManager;

  @Autowired()
  private messageQueue!: MessageQueueService;

  async onApplicationShutdown(signal?: string) {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    console.log('Graceful shutdown initiated...');

    // Stop accepting new work
    await this.messageQueue.stopConsuming();

    // Wait for in-flight requests (with timeout)
    await this.waitForInFlightRequests(30000);

    // Flush any pending writes
    await this.messageQueue.flushPending();

    // Close connections
    await this.database.disconnect();

    console.log('Graceful shutdown complete');
  }

  private async waitForInFlightRequests(timeout: number): Promise<void> {
    const start = Date.now();
    while (this.getInFlightCount() > 0 && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private getInFlightCount(): number {
    // Return count of in-flight requests
    return 0;
  }
}
```

## Signal Handling

Rikta automatically handles common shutdown signals:

- `SIGTERM` - Standard termination signal
- `SIGINT` - Interrupt from keyboard (Ctrl+C)

```typescript
// Rikta handles this automatically
process.on('SIGTERM', () => {
  // OnApplicationShutdown hooks are called
});

process.on('SIGINT', () => {
  // OnApplicationShutdown hooks are called
});
```

## Best Practices

### 1. Keep Hooks Fast

```typescript
// ✅ Good - quick initialization
async onProviderInit() {
  this.config = this.loadConfig();
  await this.validateConfig();
}

// ❌ Avoid - slow startup
async onProviderInit() {
  await this.loadAllDataFromDatabase(); // Blocks startup
}
```

### 2. Handle Errors Gracefully

```typescript
async onProviderInit() {
  try {
    await this.connect();
  } catch (error) {
    console.error('Failed to initialize:', error);
    throw error; // Prevent app from starting with broken state
  }
}
```

### 3. Set Timeouts for Shutdown

```typescript
async onApplicationShutdown(signal?: string) {
  const timeout = setTimeout(() => {
    console.error('Shutdown timeout - forcing exit');
    process.exit(1);
  }, 30000);

  await this.cleanup();
  clearTimeout(timeout);
}
```

### 4. Order Dependencies Correctly

```typescript
// Database should initialize before services that use it
@Injectable()
export class DatabaseService implements OnProviderInit {
  async onProviderInit() { /* Connect first */ }
}

@Injectable()
export class UserService implements OnProviderInit {
  @Autowired()
  private database!: DatabaseService; // Depends on database

  async onProviderInit() { /* Database already connected */ }
}
```

## EventBus

The EventBus provides a flexible pub/sub mechanism for lifecycle and custom events. It works alongside interface-based hooks.

### Basic Usage

```typescript
import { Injectable, Autowired, EventBus } from '@riktajs/core';

@Injectable()
export class MonitoringService {
  @Autowired()
  private events!: EventBus;

  onProviderInit() {
    // Subscribe to lifecycle events
    this.events.on('app:listen', ({ address, port }) => {
      console.log(`Server started at ${address}:${port}`);
    });

    this.events.on('app:shutdown', ({ signal }) => {
      console.log(`Shutdown signal: ${signal}`);
    });
  }
}
```

### Built-in Events

| Event | Payload | Description |
|-------|---------|-------------|
| `app:discovery` | `{ files: string[] }` | After auto-discovery completes |
| `app:providers` | `{ count: number }` | After providers are registered |
| `provider:init` | `{ provider, name, priority }` | When a provider is initialized |
| `app:routes` | `{ count: number }` | After routes are registered |
| `app:bootstrap` | `{ providerCount: number }` | Application bootstrap complete |
| `app:listen` | `{ address, port }` | Server starts listening |
| `app:shutdown` | `{ signal?: string }` | Shutdown initiated |
| `provider:destroy` | `{ provider, name }` | Provider being destroyed |
| `app:destroy` | `{ uptime: number }` | Application fully shut down |

### Unsubscribing

The `on()` method returns an unsubscribe function:

```typescript
const unsubscribe = this.events.on('app:listen', () => {
  console.log('Server started');
});

// Later, to stop listening:
unsubscribe();
```

### One-time Listeners

Use `once()` to automatically unsubscribe after the first event:

```typescript
this.events.once('app:listen', ({ address }) => {
  console.log(`First start at ${address}`);
  // Automatically unsubscribed after this
});
```

### Promise-based Waiting

Use `waitFor()` to await an event:

```typescript
async function waitForReady() {
  const { address } = await events.waitFor('app:listen');
  console.log(`App is ready at ${address}`);
}
```

### Custom Events

You can emit and listen to custom events:

```typescript
// Emit custom event
await this.events.emit('user:created', { userId: '123', email: 'user@example.com' });

// Listen to custom event
this.events.on<{ userId: string; email: string }>('user:created', ({ userId, email }) => {
  console.log(`New user: ${email}`);
});
```

### Owner Tracking and Cleanup

EventBus supports owner tracking for automatic cleanup. When registering listeners, you can specify an owner:

```typescript
// Register with owner tracking
this.events.on('custom:event', handler, 'MyService');

// Remove all listeners for an owner
this.events.removeByOwner('MyService');
```

:::info Automatic Cleanup
When using the `@On()` decorator, Rikta automatically tracks listeners by provider name and cleans them up during application shutdown. This prevents memory leaks from accumulated listeners.
:::

### Debugging EventBus

Useful methods for debugging:

```typescript
// Get listener count for specific event
const count = events.listenerCount('app:listen');

// Get total listeners across all events
const total = events.totalListenerCount();

// Get all registered owners
const owners = events.getOwners();

// Get listener count by owner
const ownerCount = events.listenerCountByOwner('MyService');
```

### Using @On() Decorator

The `@On()` decorator provides a declarative way to subscribe to events:

```typescript
import { Injectable, On } from '@riktajs/core';

@Injectable()
export class LoggingService {
  @On('app:listen')
  onAppListen({ address }: { address: string }) {
    console.log(`Application started at ${address}`);
  }

  @On('app:shutdown')
  onAppShutdown({ signal }: { signal?: string }) {
    console.log(`Shutting down: ${signal}`);
  }

  @On('provider:init')
  onProviderInit({ name }: { name: string }) {
    console.log(`Provider initialized: ${name}`);
  }
}
```

:::tip Memory Management
Listeners registered with `@On()` are automatically cleaned up when the application shuts down, preventing memory leaks.
:::

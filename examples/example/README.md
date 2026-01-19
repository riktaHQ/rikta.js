# 🚀 Rikta Example Application

A complete example demonstrating Rikta's features.

## 📁 Structure

```
example/
├── main.ts                          # Application entry point
├── README.md
└── src/
    ├── config/
    │   ├── app.config.ts            # Interfaces & injection tokens
    │   ├── app-config.provider.ts   # @Provider for APP_CONFIG
    │   ├── database-config.provider.ts  # @Provider for DATABASE_CONFIG
    │   └── logger.provider.ts       # @Provider for LOGGER (with dependencies!)
    ├── controllers/
    │   ├── app.controller.ts        # Root & health endpoints
    │   └── user.controller.ts       # User CRUD endpoints
    └── services/
        ├── database.service.ts      # In-memory database (priority: 100)
        ├── health.service.ts        # Health check + OnApplicationListen
        ├── monitoring.service.ts    # @On() event listeners
        └── user.service.ts          # User business logic
```

## 🏃 Running

```bash
npm run example
```

Server starts at `http://localhost:3000`

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Application info |
| GET | `/health` | Health check |
| GET | `/users` | List all users |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |

## 🔄 Lifecycle Demonstrations

### Priority-based Initialization

```typescript
// database.service.ts - Initialized FIRST (priority: 100)
@Injectable({ priority: 100 })
export class DatabaseService implements OnProviderInit, OnProviderDestroy {
  async onProviderInit() {
    await this.connect();
  }

  async onProviderDestroy() {
    await this.disconnect();
  }
}
```

### Interface Hooks

```typescript
// health.service.ts - Uses OnApplicationListen
@Injectable()
export class HealthService implements OnApplicationListen {
  onApplicationListen(address: string) {
    console.log(`Health endpoint ready at ${address}/health`);
  }
}
```

### @On() Decorator

```typescript
// monitoring.service.ts - Event-based lifecycle
@Injectable()
export class MonitoringService {
  @On('app:listen')
  onServerStart({ address, port }) {
    console.log(`Monitoring active at ${address}`);
  }

  @On('provider:init')
  onProviderInit({ name, priority }) {
    console.log(`${name} initialized (priority: ${priority})`);
  }

  @On('app:shutdown')
  onShutdown({ signal }) {
    console.log(`Shutting down: ${signal}`);
  }
}
```

## 💉 Dependency Injection Patterns

### @Provider Decorator

```typescript
// logger.provider.ts - Provider with dependencies
@Provider(LOGGER)
export class LoggerProvider {
  @Autowired(APP_CONFIG)
  private config!: AppConfig;

  provide(): Logger {
    return createLogger(this.config.name);
  }
}
```

### Property Injection

```typescript
@Controller('/users')
export class UserController {
  @Autowired()
  private userService!: UserService;
}
```

### Constructor Injection

```typescript
@Injectable()
export class DatabaseService {
  constructor(
    @Autowired(DATABASE_CONFIG) config: DatabaseConfig,
    @Autowired(LOGGER) private logger: Logger
  ) {}
}
```

## 🧪 Test with cURL

```bash
# App info
curl http://localhost:3000

# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# List users
curl http://localhost:3000/users
```

## 🔑 Key Features Demonstrated

| Feature | File |
|---------|------|
| `@Provider` decorator | `config/*.provider.ts` |
| Priority initialization | `services/database.service.ts` |
| `OnProviderInit` hook | `services/database.service.ts` |
| `OnProviderDestroy` hook | `services/database.service.ts` |
| `OnApplicationListen` hook | `services/health.service.ts` |
| `@On()` decorator | `services/monitoring.service.ts` |
| Auto-discovery | `main.ts` (autowired: ['./src']) |

## 📦 Path Resolution

When using `@riktajs/core` from `node_modules`, relative paths in `autowired` are resolved from **your project's location**, not the library:

```typescript
// main.ts
import { Rikta } from '@riktajs/core';

// './src' is resolved relative to main.ts location
const app = await Rikta.create({
  port: 3000,
  autowired: ['./src']  // Scans YOUR project's src/ folder
});
```

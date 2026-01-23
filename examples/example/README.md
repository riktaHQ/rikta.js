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
    │   ├── notification.controller.ts # Strategy Pattern demo
    │   └── user.controller.ts       # User CRUD endpoints
    ├── strategies/
    │   ├── notification.strategy.ts # Abstract strategy contract
    │   ├── email.strategy.ts        # @Primary email implementation
    │   ├── sms.strategy.ts          # SMS implementation
    │   ├── push.strategy.ts         # Push notification implementation
    │   └── notification.factory.ts  # Factory for runtime selection
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
| GET | `/notifications/channels` | List notification channels |
| GET | `/notifications/status` | Notification system status |
| POST | `/notifications/send` | Send notification |
| POST | `/notifications/broadcast` | Broadcast to all channels |

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

### Strategy Pattern with Abstract Class DI

```typescript
// Abstract contract
abstract class NotificationStrategy {
  abstract send(recipient: string, message: string): Promise<boolean>;
  abstract isAvailable(): boolean;
}

// Primary implementation (default)
@Injectable()
@Primary()
@Implements(NotificationStrategy)
export class EmailStrategy extends NotificationStrategy {
  async send(recipient: string, message: string): Promise<boolean> {
    // Email logic...
    return true;
  }
  
  isAvailable(): boolean {
    return true;
  }
}

// Factory for runtime selection
@Injectable()
export class NotificationFactory {
  @Autowired()
  private emailStrategy!: EmailStrategy;
  
  @Autowired()
  private smsStrategy!: SmsStrategy;
  
  getStrategy(channel: 'email' | 'sms'): NotificationStrategy {
    return channel === 'email' ? this.emailStrategy : this.smsStrategy;
  }
}

// Inject abstract class - auto-resolved to @Primary
@Injectable()
export class NotificationService {
  @Autowired()
  private strategy!: NotificationStrategy; // Gets EmailStrategy
  
  @Autowired()
  private factory!: NotificationFactory;
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

# Notification channels
curl http://localhost:3000/notifications/channels

# Send notification via default channel (email)
curl -X POST http://localhost:3000/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"recipient": "user@example.com", "message": "Hello!"}'

# Send notification via specific channel
curl -X POST http://localhost:3000/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"recipient": "+1234567890", "message": "Your OTP is 123456", "channel": "sms"}'

# Broadcast to all available channels
curl -X POST http://localhost:3000/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{"recipient": "user123", "message": "Important announcement!"}'
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
| Strategy Pattern | `strategies/*.ts` |
| Abstract Class DI | `strategies/notification.strategy.ts` |
| `@Implements` decorator | `strategies/email.strategy.ts` |
| `@Primary` decorator | `strategies/email.strategy.ts` |
| Factory Pattern | `strategies/notification.factory.ts` |

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

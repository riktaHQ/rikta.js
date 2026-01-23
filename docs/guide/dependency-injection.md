# 💉 Dependency Injection Container

The Rikta DI container with full autowiring support.

## Overview

- **Automatic resolution** via TypeScript metadata
- **Single decorator**: `@Autowired()` for everything
- **Token-based injection** for interfaces
- **Abstract class-based injection** for contracts (Strategy pattern)
- **Zero configuration** - just decorate!

## @Autowired() - The Universal Decorator

`@Autowired()` works for both property and constructor injection.

### Property Injection (Recommended)

```typescript
@Controller('/users')
export class UserController {
  @Autowired()
  private userService!: UserService;

  @Autowired()
  private logger!: LoggerService;

  @Get('/')
  findAll() {
    this.logger.log('Getting users');
    return this.userService.findAll();
  }
}
```

### Constructor Injection

```typescript
@Injectable()
class UserService {
  constructor(
    @Autowired() private db: DatabaseService,
    @Autowired() private cache: CacheService
  ) {}
}
```

## Injection Tokens

For non-class dependencies (interfaces, config, primitives):

### Define Tokens

```typescript
import { InjectionToken } from '@riktajs/core';

interface DatabaseConfig {
  host: string;
  port: number;
}

export const DB_CONFIG = new InjectionToken<DatabaseConfig>('db.config');

interface Logger {
  log(msg: string): void;
}

export const LOGGER = new InjectionToken<Logger>('logger');
```

### Register Values

```typescript
import { container } from '@riktajs/core';

// Before Rikta.create()
container.registerValue(DB_CONFIG, {
  host: 'localhost',
  port: 5432,
});

container.registerFactory(LOGGER, () => ({
  log: (msg) => console.log(`[LOG] ${msg}`),
}));
```

### Inject with Token

```typescript
@Injectable()
class DatabaseService {
  constructor(
    @Autowired(DB_CONFIG) private config: DatabaseConfig,
    @Autowired(LOGGER) private logger: Logger
  ) {
    this.logger.log(`Connecting to ${config.host}`);
  }
}

// Or property injection
@Controller()
export class AppController {
  @Autowired(DB_CONFIG)
  private config!: DatabaseConfig;

  @Autowired(LOGGER)
  private logger!: Logger;
}
```

## Optional Dependencies

```typescript
const ANALYTICS = new InjectionToken<Analytics>('analytics');

@Injectable()
class TrackingService {
  constructor(
    @Optional() @Autowired(ANALYTICS) private analytics?: Analytics
  ) {}

  track(event: string) {
    this.analytics?.send(event);  // Safe - may be undefined
  }
}

// Property injection
@Controller()
export class AppController {
  @Optional()
  @Autowired()
  private metrics?: MetricsService;
}
```

## Provider Types

### Value Provider

```typescript
container.registerValue(TOKEN, value);
```

### Factory Provider

```typescript
container.registerFactory(TOKEN, () => createSomething());

// With dependencies
container.registerProvider({
  provide: DB_CONNECTION,
  useFactory: (config) => createConnection(config),
  inject: [DB_CONFIG],
});
```

### Class Provider

```typescript
container.registerProvider({
  provide: AbstractLogger,
  useClass: ConsoleLogger,
});
```

### @Provider Decorator (Recommended)

The cleanest way to create providers - **auto-discovered!**

```typescript
import { Provider, InjectionToken, Autowired } from '@riktajs/core';

const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

@Provider(APP_CONFIG)
export class AppConfigProvider {
  provide(): AppConfig {
    return {
      name: 'My App',
      version: '1.0.0',
    };
  }
}

// Providers can inject dependencies
const LOGGER = new InjectionToken<Logger>('logger');

@Provider(LOGGER)
export class LoggerProvider {
  @Autowired(APP_CONFIG)
  private config!: AppConfig;

  provide(): Logger {
    return createLogger({ appName: this.config.name });
  }
}
```

📖 [Full @Provider Documentation](../api/decorators.md#providertoken)

## Scopes

### Singleton (Default)

```typescript
@Injectable()  // One instance for entire app
class ConfigService { }
```

### Transient

```typescript
@Injectable({ scope: 'transient' })  // New instance each time
class RequestLogger { }
```

## API Reference

| Method | Description |
|--------|-------------|
| `container.registerValue(token, value)` | Register static value |
| `container.registerFactory(token, fn)` | Register factory |
| `container.registerProvider(provider)` | Register custom provider |
| `container.resolve(token)` | Get instance |
| `container.resolveOptional(token)` | Get instance or undefined |

## Abstract Class-Based Injection

For complex contracts and the Strategy pattern, use abstract classes instead of tokens.

### Why Abstract Classes?

| Aspect | InjectionToken | Abstract Class |
|--------|----------------|----------------|
| **Type Safety** | ⚠️ Requires explicit type | ✅ Inferred automatically |
| **Boilerplate** | ⚠️ Create token separately | ✅ Just the abstract class |
| **Refactoring** | ⚠️ Update token everywhere | ✅ Rename works automatically |
| **Shared Methods** | ❌ Not possible | ✅ Add utility methods |

### Define the Contract

```typescript
// contracts/notification.strategy.ts
export abstract class NotificationStrategy {
  abstract send(recipient: string, message: string): Promise<boolean>;
  abstract isAvailable(): boolean;
  
  // Shared utility method available to all implementations
  protected log(message: string): void {
    console.log(`[${this.constructor.name}] ${message}`);
  }
}
```

### Implement with `@Implements`

```typescript
// strategies/email.strategy.ts
import { Injectable, Implements, Primary } from '@riktajs/core';
import { NotificationStrategy } from '../contracts/notification.strategy';

@Injectable()
@Implements(NotificationStrategy)
@Primary()  // This is the default implementation
export class EmailStrategy extends NotificationStrategy {
  async send(recipient: string, message: string): Promise<boolean> {
    this.log(`Sending email to ${recipient}`);
    // ... email logic
    return true;
  }
  
  isAvailable(): boolean {
    return true;
  }
}
```

```typescript
// strategies/sms.strategy.ts
@Injectable()
@Implements(NotificationStrategy)
export class SmsStrategy extends NotificationStrategy {
  async send(recipient: string, message: string): Promise<boolean> {
    this.log(`Sending SMS to ${recipient}`);
    // ... SMS logic
    return true;
  }
  
  isAvailable(): boolean {
    return process.env.TWILIO_ENABLED === 'true';
  }
}
```

### Inject the Abstract Class

```typescript
@Controller('/notifications')
export class NotificationController {
  // Automatically resolved to EmailStrategy (the @Primary)
  @Autowired()
  private strategy!: NotificationStrategy;
  
  @Post('/send')
  async send(@Body() data: { to: string; message: string }) {
    if (!this.strategy.isAvailable()) {
      throw new Error('Notification strategy not available');
    }
    return this.strategy.send(data.to, data.message);
  }
}
```

### Strategy Pattern with Factory

For runtime strategy selection, combine with a Factory pattern:

```typescript
// factory/notification.factory.ts
@Injectable()
export class NotificationFactory {
  @Autowired()
  private emailStrategy!: EmailStrategy;
  
  @Autowired()
  private smsStrategy!: SmsStrategy;
  
  @Autowired()
  private pushStrategy!: PushStrategy;
  
  getStrategy(channel: 'email' | 'sms' | 'push'): NotificationStrategy {
    switch (channel) {
      case 'email': return this.emailStrategy;
      case 'sms': return this.smsStrategy;
      case 'push': return this.pushStrategy;
    }
  }
  
  getAvailableStrategies(): NotificationStrategy[] {
    return [this.emailStrategy, this.smsStrategy, this.pushStrategy]
      .filter(s => s.isAvailable());
  }
}

// services/notification.service.ts
@Injectable()
export class NotificationService {
  @Autowired()
  private factory!: NotificationFactory;
  
  @Autowired()
  private defaultStrategy!: NotificationStrategy;  // Gets @Primary
  
  async notify(
    recipient: string,
    message: string,
    channel?: 'email' | 'sms' | 'push'
  ): Promise<boolean> {
    const strategy = channel 
      ? this.factory.getStrategy(channel)
      : this.defaultStrategy;
    
    return strategy.send(recipient, message);
  }
  
  async notifyAll(recipient: string, message: string): Promise<void> {
    const strategies = this.factory.getAvailableStrategies();
    await Promise.all(strategies.map(s => s.send(recipient, message)));
  }
}
```

### Multiple Implementations Rules

1. **Single implementation**: Automatically used, no `@Primary` needed
2. **Multiple implementations with `@Primary`**: The `@Primary` is the default
3. **Multiple implementations without `@Primary`**: Error at resolution time
4. **Multiple implementations with `@Named`**: Use qualified injection by name

```typescript
// ✅ Single implementation - works
@Injectable()
@Implements(CacheStrategy)
export class RedisCache extends CacheStrategy { }

// ✅ Multiple with @Primary - works  
@Injectable()
@Implements(PaymentGateway)
@Primary()
export class StripeGateway extends PaymentGateway { }

@Injectable()
@Implements(PaymentGateway)
export class PayPalGateway extends PaymentGateway { }

// ❌ Multiple without @Primary - throws error
@Injectable()
@Implements(Logger)
export class FileLogger extends Logger { }

@Injectable()
@Implements(Logger)
export class ConsoleLogger extends Logger { }
// Error: Multiple implementations found. Use @Primary() to mark one as default.
```

### Named Implementations with @Named

When you have multiple implementations and want to inject specific ones by name:

```typescript
import { Injectable, Implements, Named, Primary, Autowired } from '@riktajs/core';

// Abstract contract
abstract class Mailer {
  abstract send(to: string, body: string): Promise<void>;
}

// Named implementations
@Injectable()
@Implements(Mailer)
@Named('smtp')
@Primary() // Also the default
export class SmtpMailer extends Mailer {
  async send(to: string, body: string): Promise<void> {
    console.log('[SMTP]', to, body);
  }
}

@Injectable()
@Implements(Mailer)
@Named('sendgrid')
export class SendGridMailer extends Mailer {
  async send(to: string, body: string): Promise<void> {
    console.log('[SendGrid]', to, body);
  }
}

// Inject by name
@Injectable()
export class MailService {
  @Autowired(Mailer)
  private defaultMailer!: Mailer; // Gets SmtpMailer (Primary)

  @Autowired(Mailer, 'smtp')
  private smtpMailer!: Mailer;

  @Autowired(Mailer, 'sendgrid')
  private sendgridMailer!: Mailer;
}

// Also works with constructor injection
@Injectable()
export class CampaignService {
  constructor(
    @Autowired(Mailer, 'sendgrid') private bulkMailer: Mailer,
    @Autowired(Mailer, 'smtp') private transactionalMailer: Mailer
  ) {}
}
```

### Explicit Registration (Override)

You can also register implementations explicitly, overriding `@Implements`:

```typescript
// main.ts
import { container } from '@riktajs/core';

// Override based on environment
if (process.env.NODE_ENV === 'test') {
  container.registerProvider({
    provide: NotificationStrategy,
    useClass: MockNotificationStrategy,
  });
}
```

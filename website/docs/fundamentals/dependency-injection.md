---
sidebar_position: 1
---

# Dependency Injection

Rikta features a powerful **dependency injection** (DI) system that makes it easy to manage the lifecycles and relationships between your application's components.

## Introduction

Dependency Injection is a design pattern where dependencies are "injected" into a class rather than being created by the class itself. This leads to:

- **Loose coupling** between components
- **Easier testing** through mock injection
- **Better code organization**
- **Automatic lifecycle management**

## The Container

At the heart of Rikta's DI system is the **Container**. The container is responsible for:

1. **Registering** providers (services, factories, values)
2. **Resolving** dependencies between providers
3. **Managing** the lifecycle of singleton instances
4. **Injecting** dependencies into classes

```typescript
import { container } from '@riktajs/core';

// The container is available globally
container.registerClass(MyService, MyService);
container.resolve(MyService); // Returns singleton instance
```

## Injection Types

### Property Injection with @Autowired()

The most common way to inject dependencies in Rikta:

```typescript
import { Controller, Autowired } from '@riktajs/core';

@Controller('/users')
export class UserController {
  @Autowired()
  private userService!: UserService;

  @Autowired()
  private logger!: LoggerService;
}
```

:::info Note
The `!` after the property name tells TypeScript that the property will be initialized (by the DI container), even though it's not assigned in the constructor.
:::

### Constructor Injection

You can also inject dependencies via the constructor:

```typescript
import { Injectable, Autowired } from '@riktajs/core';

@Injectable()
export class UserService {
  constructor(
    @Autowired() private database: DatabaseService,
    @Autowired() private cache: CacheService
  ) {}
}
```

## Scopes

Rikta supports different scopes for providers:

### Singleton (Default)

By default, all providers are singletons - a single instance is shared across the entire application:

```typescript
@Injectable()
export class ConfigService {
  // Same instance everywhere
}
```

### Transient

Create a new instance every time the provider is requested:

```typescript
@Injectable({ scope: 'transient' })
export class RequestLogger {
  private requestId = crypto.randomUUID();
}
```

## Injection Tokens

For injecting non-class values (strings, numbers, objects), use **injection tokens**:

```typescript
import { InjectionToken, container } from '@riktajs/core';

// Define a token
const DATABASE_URL = new InjectionToken<string>('database.url');

// Register a value
container.registerValue(DATABASE_URL, 'postgres://localhost/mydb');

// Inject by token
@Injectable()
export class DatabaseService {
  @Autowired(DATABASE_URL)
  private databaseUrl!: string;
}
```

## Factory Providers

When you need custom initialization logic:

```typescript
import { container, InjectionToken } from '@riktajs/core';

const CONNECTION = new InjectionToken<Connection>('database.connection');

container.registerFactory(CONNECTION, () => {
  const config = container.resolve(ConfigService);
  return new Connection({
    host: config.get('DB_HOST'),
    port: config.get('DB_PORT'),
  });
});
```

## Circular Dependencies

Rikta handles circular dependencies automatically when using property injection:

```typescript
@Injectable()
export class ServiceA {
  @Autowired()
  private serviceB!: ServiceB; // Works even if ServiceB depends on ServiceA
}

@Injectable()
export class ServiceB {
  @Autowired()
  private serviceA!: ServiceA;
}
```

:::warning Constructor Injection
Circular dependencies will cause errors when using constructor injection. Use property injection to avoid this issue.
:::

## Optional Dependencies

Mark a dependency as optional when it may not exist:

```typescript
import { Optional, Autowired } from '@riktajs/core';

@Injectable()
export class NotificationService {
  @Optional()
  @Autowired()
  private emailService?: EmailService;

  notify(message: string) {
    if (this.emailService) {
      this.emailService.send(message);
    } else {
      console.log(message);
    }
  }
}
```

## Advanced: Custom Decorators

Create your own injection decorators for cleaner code:

```typescript
import { Autowired } from '@riktajs/core';

// Create a custom decorator
export function InjectConfig() {
  return Autowired();
}

// Usage
@Injectable()
export class MyService {
  @InjectConfig()
  private config!: ConfigService;
}
```

## The Registry

Rikta uses a **Registry** to track all decorated classes:

```typescript
import { Registry } from '@riktajs/core';

// Access registered providers
const providers = Registry.getAllProviders();
const controllers = Registry.getAllControllers();
```

## Best Practices

### 1. Prefer Property Injection

```typescript
// ✅ Preferred
@Injectable()
export class UserService {
  @Autowired()
  private database!: DatabaseService;
}

// ⚠️ Works, but less flexible
@Injectable()
export class UserService {
  constructor(@Autowired() private database: DatabaseService) {}
}
```

### 2. Use Interfaces with Tokens

```typescript
interface Logger {
  log(message: string): void;
}

const LOGGER = new InjectionToken<Logger>('logger');

// Register different implementations
container.registerClass(LOGGER, ConsoleLogger);
// or
container.registerClass(LOGGER, FileLogger);
```

### 3. Use Abstract Classes for Complex Contracts

For complex service contracts (Strategy pattern, Repository pattern), use abstract classes instead of tokens:

```typescript
// Define the contract
abstract class NotificationStrategy {
  abstract send(recipient: string, message: string): Promise<boolean>;
  abstract isAvailable(): boolean;
}

// Implement with @Implements and @Primary
@Injectable()
@Primary()
@Implements(NotificationStrategy)
export class EmailStrategy extends NotificationStrategy {
  async send(recipient: string, message: string): Promise<boolean> {
    // Email implementation
    return true;
  }
  
  isAvailable(): boolean {
    return true;
  }
}

// Inject the abstract class - auto-resolved to @Primary
@Injectable()
export class NotificationService {
  @Autowired()
  private strategy!: NotificationStrategy; // Gets EmailStrategy
}
```

See [Strategy Pattern with Factory](#strategy-pattern-with-factory) for a complete example.

### 4. Keep Services Focused

```typescript
// ✅ Good - single responsibility
@Injectable()
export class UserValidationService {}

@Injectable()
export class UserPersistenceService {}

// ❌ Avoid - too many responsibilities
@Injectable()
export class UserService {
  // validation, persistence, notifications, etc.
}
```

### 5. Avoid Service Locator Pattern

```typescript
// ❌ Anti-pattern - manually resolving
@Injectable()
export class BadService {
  doSomething() {
    const other = container.resolve(OtherService);
  }
}

// ✅ Good - proper injection
@Injectable()
export class GoodService {
  @Autowired()
  private other!: OtherService;
  
  doSomething() {
    this.other.method();
  }
}
```

## Strategy Pattern with Factory

The Strategy pattern allows you to define a family of algorithms and make them interchangeable at runtime. Rikta's Abstract Class DI makes this pattern elegant and type-safe.

### Define the Abstract Strategy

```typescript
// strategies/notification.strategy.ts
export abstract class NotificationStrategy {
  abstract send(recipient: string, message: string): Promise<boolean>;
  abstract isAvailable(): boolean;
  abstract getChannel(): string;
  
  // Shared utility method available to all implementations
  protected log(message: string): void {
    console.log(`[${this.constructor.name}] ${message}`);
  }
}
```

### Create Multiple Implementations

```typescript
// strategies/email.strategy.ts
import { Injectable, Implements, Primary } from '@riktajs/core';

@Injectable()
@Primary()  // This is the default
@Implements(NotificationStrategy)
export class EmailStrategy extends NotificationStrategy {
  async send(recipient: string, message: string): Promise<boolean> {
    this.log(`Sending email to ${recipient}`);
    return true;
  }
  
  isAvailable(): boolean {
    return true;
  }
  
  getChannel(): string {
    return 'email';
  }
}

// strategies/sms.strategy.ts
@Injectable()
@Implements(NotificationStrategy)
export class SmsStrategy extends NotificationStrategy {
  async send(recipient: string, message: string): Promise<boolean> {
    this.log(`Sending SMS to ${recipient}`);
    return true;
  }
  
  isAvailable(): boolean {
    return process.env.TWILIO_ENABLED === 'true';
  }
  
  getChannel(): string {
    return 'sms';
  }
}
```

### Create a Factory for Runtime Selection

```typescript
// strategies/notification.factory.ts
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
```

### Use in Your Service

```typescript
@Injectable()
export class NotificationService {
  // Default strategy (EmailStrategy - marked as @Primary)
  @Autowired()
  private defaultStrategy!: NotificationStrategy;
  
  // Factory for runtime selection
  @Autowired()
  private factory!: NotificationFactory;
  
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
  
  async broadcastToAll(recipient: string, message: string): Promise<void> {
    const strategies = this.factory.getAvailableStrategies();
    await Promise.all(strategies.map(s => s.send(recipient, message)));
  }
}
```

:::tip Multiple Implementations Rules
1. **Single implementation**: Automatically used, no `@Primary` needed
2. **Multiple with `@Primary`**: The `@Primary` is the default when injecting the abstract class
3. **Multiple without `@Primary`**: Throws error at resolution time
4. **Multiple with `@Named`**: Use qualified injection to select specific implementations
:::

## Named Implementations with @Named

When you have multiple implementations and need to inject specific ones by name (rather than just a default), use the `@Named` decorator:

### Define Named Implementations

```typescript
// mailers/smtp.mailer.ts
import { Injectable, Implements, Named, Primary } from '@riktajs/core';

abstract class Mailer {
  abstract send(to: string, body: string): Promise<void>;
}

@Injectable()
@Implements(Mailer)
@Named('smtp')
@Primary() // Also the default when no name is specified
export class SmtpMailer extends Mailer {
  async send(to: string, body: string): Promise<void> {
    console.log(`[SMTP] Sending to ${to}`);
  }
}

// mailers/sendgrid.mailer.ts
@Injectable()
@Implements(Mailer)
@Named('sendgrid')
export class SendGridMailer extends Mailer {
  async send(to: string, body: string): Promise<void> {
    console.log(`[SendGrid] Sending to ${to}`);
  }
}

// mailers/mailgun.mailer.ts
@Injectable()
@Implements(Mailer)
@Named('mailgun')
export class MailgunMailer extends Mailer {
  async send(to: string, body: string): Promise<void> {
    console.log(`[Mailgun] Sending to ${to}`);
  }
}
```

### Inject by Name

Use `@Autowired(Token, 'name')` to inject a specific named implementation:

```typescript
@Injectable()
export class MailService {
  // Default (Primary) - SmtpMailer
  @Autowired(Mailer)
  private defaultMailer!: Mailer;

  // Explicit named injection
  @Autowired(Mailer, 'smtp')
  private smtpMailer!: Mailer;

  @Autowired(Mailer, 'sendgrid')
  private sendgridMailer!: Mailer;

  @Autowired(Mailer, 'mailgun')
  private mailgunMailer!: Mailer;

  async sendWithFallback(to: string, body: string): Promise<void> {
    try {
      await this.sendgridMailer.send(to, body);
    } catch {
      // Fallback to SMTP
      await this.smtpMailer.send(to, body);
    }
  }
}
```

### Constructor Injection with Names

Named injection also works with constructor parameters:

```typescript
@Injectable()
export class EmailCampaignService {
  constructor(
    @Autowired(Mailer, 'sendgrid') private bulkMailer: Mailer,
    @Autowired(Mailer, 'smtp') private transactionalMailer: Mailer
  ) {}

  async sendCampaign(recipients: string[], body: string): Promise<void> {
    // Use SendGrid for bulk emails
    await Promise.all(recipients.map(r => this.bulkMailer.send(r, body)));
  }

  async sendReceipt(to: string, receipt: string): Promise<void> {
    // Use SMTP for transactional emails
    await this.transactionalMailer.send(to, receipt);
  }
}
```

:::note Error Handling
If you request a name that doesn't exist, Rikta will throw a descriptive error:
```
No implementation named 'unknown' found for abstract class Mailer.
Available names: smtp, sendgrid, mailgun
```
:::

## DI in Queue Processors

Queue processors (from `@riktajs/queue`) fully support dependency injection. You can inject services, repositories, or any other registered providers:

```typescript
import { Autowired } from '@riktajs/core';
import { Processor, Process, QueueService, QUEUE_SERVICE } from '@riktajs/queue';
import { Job } from 'bullmq';

@Processor('task-queue')
export class TaskProcessor {
  @Autowired(LoggerService)
  private logger!: LoggerService;

  @Autowired(DatabaseService)
  private database!: DatabaseService;

  @Autowired(QUEUE_SERVICE)
  private queueService!: QueueService;

  @Process('process-task')
  async handleTask(job: Job) {
    this.logger.info(`Processing task ${job.id}`);
    
    await this.database.save(job.data);
    
    // Trigger follow-up job in another queue
    await this.queueService.addJob('notification-queue', 'send', {
      message: 'Task completed!',
    });
  }
}
```

All injected services are resolved through the DI container, ensuring proper lifecycle management. For more details, see the [Queues documentation](/docs/techniques/queues#dependency-injection-in-processors).

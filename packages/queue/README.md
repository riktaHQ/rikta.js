# @riktajs/queue

BullMQ-based job queue integration for Rikta Framework with lifecycle management, event-driven processing, and optional Bull Board monitoring.

## Features

- 🚀 **High Performance** - Built on BullMQ for distributed job processing
- 🎯 **Decorator-based API** - `@Processor`, `@Process`, `@OnJobComplete`, etc.
- � **Full DI Support** - `@Autowired` works in processors for service injection
- �🔄 **Lifecycle Integration** - Seamless integration with Rikta's lifecycle hooks
- 📡 **Event System** - Queue events emitted via Rikta's EventBus
- ⚡ **Connection Pooling** - Shared Redis connections for optimal performance
- 📊 **Optional Monitoring** - Bull Board integration (bring your own dependency)
- 🛡️ **Type-safe** - Full TypeScript support with generics and Zod validation
- ⏰ **Scheduling** - Delayed jobs, repeatable jobs, cron patterns

## Installation

```bash
npm install @riktajs/queue bullmq
```

> **Note:** `ioredis` is included as a direct dependency and will be installed automatically.

### Optional: Bull Board Monitoring

```bash
npm install @bull-board/api @bull-board/fastify
```

## Quick Start

### 1. Create a Processor

Processors support **dependency injection** via `@Autowired`:

```typescript
import { Autowired } from '@riktajs/core';
import { Processor, Process, OnJobComplete, OnJobFailed } from '@riktajs/queue';
import { Job } from 'bullmq';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Processor('email-queue', { concurrency: 5 })
class EmailProcessor {
  // Inject services using @Autowired - fully supported!
  @Autowired(MailerService)
  private mailer!: MailerService;

  @Autowired(LoggerService)
  private logger!: LoggerService;

  @Process('send')
  async handleSendEmail(job: Job<EmailJobData>) {
    this.logger.info(`📧 Sending email to ${job.data.to}`);
    
    // Use injected services
    await this.mailer.send(job.data);
    
    return { sent: true, messageId: `msg-${job.id}` };
  }

  @Process('bulk-send')
  async handleBulkSend(job: Job<{ emails: EmailJobData[] }>) {
    for (const email of job.data.emails) {
      await this.mailer.send(email);
      await job.updateProgress(/* calculate progress */);
    }
    return { sent: job.data.emails.length };
  }

  @OnJobComplete()
  async onComplete(job: Job, result: unknown) {
    this.logger.info(`✅ Job ${job.id} completed:`, result);
  }

  @OnJobFailed()
  async onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`❌ Job ${job?.id} failed:`, error.message);
  }
}
```

### 2. Configure the Provider

```typescript
import { Rikta } from '@riktajs/core';
import { createQueueProvider } from '@riktajs/queue';

// Create and configure provider
const queueProvider = createQueueProvider({
  config: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    defaultConcurrency: 3,
    shutdownTimeout: 30000,
  },
});

// Register your processors
queueProvider.registerProcessors(EmailProcessor);

// Bootstrap your app
const app = await Rikta.create();
// Register the provider for lifecycle management
```

### 3. Add Jobs from Services

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { QueueService } from '@riktajs/queue';

@Injectable()
class NotificationService {
  @Autowired()
  private queueService!: QueueService;

  async sendWelcomeEmail(userEmail: string) {
    // Add a single job
    await this.queueService.addJob('email-queue', 'send', {
      to: userEmail,
      subject: 'Welcome!',
      body: 'Thanks for signing up!',
    });
  }

  async sendDelayedReminder(userEmail: string) {
    // Add a delayed job (sends after 1 hour)
    await this.queueService.addDelayedJob(
      'email-queue',
      'send',
      {
        to: userEmail,
        subject: 'Don\'t forget!',
        body: 'Complete your profile.',
      },
      60 * 60 * 1000 // 1 hour
    );
  }

  async sendDailyDigest() {
    // Add a repeatable job (runs daily at 9am)
    await this.queueService.addRepeatableJob(
      'email-queue',
      'bulk-send',
      { emails: [] }, // Data populated at runtime
      { pattern: '0 9 * * *' } // Cron pattern
    );
  }

  async sendBulkEmails(emails: EmailJobData[]) {
    // Add multiple jobs in bulk
    const jobs = emails.map(email => ({
      name: 'send',
      data: email,
    }));
    
    await this.queueService.addJobs('email-queue', jobs);
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QUEUE_REDIS_HOST` | Redis host | `localhost` |
| `QUEUE_REDIS_PORT` | Redis port | `6379` |
| `QUEUE_REDIS_PASSWORD` | Redis password | - |
| `QUEUE_REDIS_DB` | Redis database number | `0` |
| `QUEUE_REDIS_USERNAME` | Redis username (ACL) | - |
| `QUEUE_DEFAULT_CONCURRENCY` | Default worker concurrency | `1` |
| `QUEUE_SHUTDOWN_TIMEOUT` | Graceful shutdown timeout (ms) | `30000` |
| `QUEUE_DASHBOARD_PATH` | Bull Board path | `/admin/queues` |
| `QUEUE_DASHBOARD_ENABLED` | Enable Bull Board | `false` |

### Programmatic Configuration

```typescript
const provider = createQueueProvider({
  config: {
    redis: {
      host: 'redis.example.com',
      port: 6379,
      password: 'secret',
      tls: true,
    },
    defaultConcurrency: 5,
    defaultRateLimiter: {
      max: 100,
      duration: 60000, // 100 jobs per minute
    },
    shutdownTimeout: 60000,
  },
  retryAttempts: 3,
  retryDelay: 5000,
});
```

## Decorators

### `@Processor(queueName, options?)`

Marks a class as a job processor for a specific queue.

```typescript
@Processor('my-queue', {
  concurrency: 10,
  rateLimiter: { max: 100, duration: 60000 },
})
class MyProcessor { }
```

### `@Process(jobName?)`

Marks a method as a job handler. If no name is provided, uses the method name.

```typescript
@Process('send-email')
async handleSendEmail(job: Job) { }

@Process() // Uses 'processOrder' as job name
async processOrder(job: Job) { }
```

### Event Decorators

| Decorator | Event | Signature |
|-----------|-------|-----------|
| `@OnJobComplete()` | Job completed | `(job: Job, result: unknown)` |
| `@OnJobFailed()` | Job failed | `(job: Job \| undefined, error: Error)` |
| `@OnJobProgress()` | Job progress updated | `(job: Job, progress: number \| object)` |
| `@OnJobStalled()` | Job stalled | `(jobId: string)` |
| `@OnWorkerReady()` | Worker ready | `()` |
| `@OnWorkerError()` | Worker error | `(error: Error)` |

## Dependency Injection in Processors

Processors fully support Rikta's dependency injection. Use `@Autowired` to inject services:

```typescript
import { Autowired } from '@riktajs/core';
import { Processor, Process, QueueService, QUEUE_SERVICE } from '@riktajs/queue';
import { Job } from 'bullmq';

@Processor('order-queue')
class OrderProcessor {
  @Autowired(LoggerService)
  private logger!: LoggerService;

  @Autowired(DatabaseService)
  private db!: DatabaseService;

  @Autowired(QUEUE_SERVICE)
  private queueService!: QueueService;

  @Process('process-order')
  async handleOrder(job: Job) {
    this.logger.info(`Processing order ${job.data.orderId}`);
    
    await this.db.saveOrder(job.data);
    
    // Add a follow-up job to another queue
    await this.queueService.addJob('email-queue', 'send', {
      to: job.data.email,
      subject: 'Order Confirmed',
      body: `Order ${job.data.orderId} processed!`,
    });
  }
}
```

All injected services are resolved through Rikta's DI container, ensuring proper lifecycle management.

## Validation with Zod

Use built-in Zod utilities for type-safe job validation:

```typescript
import { createJobSchema, z, CommonJobSchemas } from '@riktajs/queue';

// Create custom schema
const OrderJobSchema = createJobSchema(z.object({
  orderId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })),
  total: z.number().positive(),
}));

// Validate in processor
@Processor('orders')
class OrderProcessor {
  @Process('process')
  async handleOrder(job: Job) {
    const data = OrderJobSchema.validate(job.data);
    // data is now typed as { orderId: string, items: [...], total: number }
  }
}

// Use common schemas
const emailData = CommonJobSchemas.email.parse({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'World',
});
```

### Common Job Schemas

- `CommonJobSchemas.email` - Email job with to, subject, body, attachments
- `CommonJobSchemas.notification` - User notifications
- `CommonJobSchemas.fileProcessing` - File operations
- `CommonJobSchemas.webhook` - HTTP webhook calls

## Event System

Queue events are emitted to Rikta's EventBus:

```typescript
import { EventBus } from '@riktajs/core';
import { QUEUE_EVENTS } from '@riktajs/queue';

@Injectable()
class MonitoringService {
  constructor(private eventBus: EventBus) {
    // Listen to queue events
    eventBus.on(QUEUE_EVENTS.JOB_COMPLETED, (payload) => {
      console.log(`Job ${payload.jobId} completed in ${payload.queueName}`);
    });

    eventBus.on(QUEUE_EVENTS.JOB_FAILED, (payload) => {
      console.error(`Job ${payload.jobId} failed: ${payload.error}`);
    });
  }
}
```

### Available Events

| Event | Description |
|-------|-------------|
| `queue:job:added` | Job added to queue |
| `queue:job:completed` | Job completed successfully |
| `queue:job:failed` | Job failed |
| `queue:job:progress` | Job progress updated |
| `queue:job:stalled` | Job stalled |
| `queue:job:delayed` | Job delayed |
| `queue:worker:ready` | Worker ready |
| `queue:worker:error` | Worker error |

## Bull Board Dashboard (Optional)

```typescript
import { registerBullBoard } from '@riktajs/queue';

// After app is created and queue provider initialized
await registerBullBoard(app.server, {
  queues: queueProvider.getAllQueues(),
  path: '/admin/queues',
  readOnly: false,
  auth: async (request) => {
    // Your authentication logic
    const token = request.headers.authorization;
    return validateAdminToken(token);
  },
});
```

**Note:** Bull Board packages must be installed separately:

```bash
npm install @bull-board/api @bull-board/fastify
```

## QueueService API

### Adding Jobs

```typescript
// Single job
await queueService.addJob(queueName, jobName, data, options?);

// Multiple jobs (bulk)
await queueService.addJobs(queueName, [{ name, data, options? }]);

// Delayed job
await queueService.addDelayedJob(queueName, jobName, data, delayMs, options?);

// Repeatable job
await queueService.addRepeatableJob(queueName, jobName, data, repeatOptions);
```

### Job Options

```typescript
await queueService.addJob('queue', 'job', data, {
  attempts: 3,              // Retry attempts
  backoff: {
    type: 'exponential',    // 'fixed' | 'exponential'
    delay: 1000,
  },
  priority: 1,              // Lower = higher priority
  delay: 5000,              // Delay in ms
  deduplicationKey: 'id',   // Prevent duplicates
  removeOnComplete: true,   // Clean up completed jobs
  removeOnFail: false,      // Keep failed jobs for debugging
});
```

### Queue Management

```typescript
// Get job by ID
const job = await queueService.getJob(queueName, jobId);

// Get queue statistics
const stats = await queueService.getQueueStats(queueName);
// { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1, paused: 0 }

// Pause/Resume
await queueService.pauseQueue(queueName);
await queueService.resumeQueue(queueName);

// Clear jobs
await queueService.clearQueue(queueName, 'completed');
await queueService.clearQueue(queueName); // Clear all

// Get all queue names
const names = queueService.getQueueNames();
```

## Error Handling

```typescript
import {
  QueueNotFoundError,
  QueueConnectionError,
  QueueInitializationError,
  JobSchemaValidationError,
} from '@riktajs/queue';

try {
  await queueService.addJob('unknown-queue', 'job', {});
} catch (error) {
  if (error instanceof QueueNotFoundError) {
    console.error('Queue does not exist:', error.message);
  }
}
```

## Best Practices

### 1. Use Type-Safe Job Data

```typescript
interface MyJobData {
  userId: string;
  action: 'create' | 'update' | 'delete';
}

@Process('my-job')
async handle(job: Job<MyJobData>) {
  const { userId, action } = job.data; // Fully typed
}
```

### 2. Handle Failures Gracefully

```typescript
@Process('risky-job')
async handle(job: Job) {
  try {
    await this.riskyOperation(job.data);
  } catch (error) {
    // Log for debugging
    console.error('Job failed:', error);
    // Re-throw to trigger retry
    throw error;
  }
}
```

### 3. Use Progress Updates for Long Jobs

```typescript
@Process('long-job')
async handle(job: Job<{ items: string[] }>) {
  const { items } = job.data;
  
  for (let i = 0; i < items.length; i++) {
    await this.processItem(items[i]);
    await job.updateProgress(Math.round((i + 1) / items.length * 100));
  }
}
```

### 4. Configure Appropriate Concurrency

```typescript
// CPU-intensive tasks: lower concurrency
@Processor('image-processing', { concurrency: 2 })

// I/O-bound tasks: higher concurrency
@Processor('api-calls', { concurrency: 20 })
```

## License

MIT

---
sidebar_position: 5
---

# Queues

Rikta provides a powerful job queue system through `@riktajs/queue`, built on top of [BullMQ](https://docs.bullmq.io/) for reliable background job processing.

## Introduction

Job queues are essential for:

- **Background Processing** - Offload heavy tasks from the main thread
- **Reliability** - Jobs persist in Redis and survive restarts
- **Scalability** - Distribute work across multiple workers
- **Scheduling** - Delayed jobs, repeatable jobs, cron patterns
- **Monitoring** - Track job status and progress

## Installation

```bash
npm install @riktajs/queue bullmq
```

> **Note:** `ioredis` is included as a direct dependency and will be installed automatically.

### Requirements

- Redis server (local or remote)
- Node.js >= 20.0.0

## Quick Start

### 1. Create a Processor

Processors handle jobs from a specific queue:

```typescript
import { Processor, Process, OnJobComplete, OnJobFailed } from '@riktajs/queue';
import { Job } from 'bullmq';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Processor('email-queue', { concurrency: 5 })
export class EmailProcessor {
  @Process('send')
  async handleSendEmail(job: Job<EmailJobData>) {
    console.log(`📧 Sending email to ${job.data.to}`);
    
    await this.sendEmail(job.data);
    
    return { sent: true, messageId: `msg-${job.id}` };
  }

  @OnJobComplete()
  async onComplete(job: Job, result: unknown) {
    console.log(`✅ Job ${job.id} completed:`, result);
  }

  @OnJobFailed()
  async onFailed(job: Job | undefined, error: Error) {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  }

  private async sendEmail(data: EmailJobData): Promise<void> {
    // Your email sending implementation
  }
}
```

### 2. Configure the Provider

```typescript
import { Rikta } from '@riktajs/core';
import { createQueueProvider } from '@riktajs/queue';
import { EmailProcessor } from './processors/email.processor';

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

// Register processors
queueProvider.registerProcessors(EmailProcessor);

// Bootstrap application
const app = await Rikta.create();
```

### 3. Add Jobs from Services

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { QueueService } from '@riktajs/queue';

@Injectable()
export class NotificationService {
  @Autowired()
  private queueService!: QueueService;

  async sendWelcomeEmail(userEmail: string) {
    await this.queueService.addJob('email-queue', 'send', {
      to: userEmail,
      subject: 'Welcome!',
      body: 'Thanks for signing up!',
    });
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

### @Processor

Marks a class as a job processor for a specific queue:

```typescript
@Processor('my-queue', {
  concurrency: 10,
  rateLimiter: { max: 100, duration: 60000 },
})
class MyProcessor { }
```

**Options:**
- `concurrency` - Number of concurrent jobs (default: 1)
- `rateLimiter` - Rate limiting options

### @Process

Marks a method as a job handler:

```typescript
// Named job handler
@Process('send-email')
async handleSendEmail(job: Job) { }

// Uses method name as job name
@Process()
async processOrder(job: Job) { }
```

### Event Decorators

| Decorator | Event | Signature |
|-----------|-------|-----------|
| `@OnJobComplete()` | Job completed | `(job: Job, result: unknown)` |
| `@OnJobFailed()` | Job failed | `(job: Job \| undefined, error: Error)` |
| `@OnJobProgress()` | Progress updated | `(job: Job, progress: number \| object)` |
| `@OnJobStalled()` | Job stalled | `(jobId: string)` |
| `@OnWorkerReady()` | Worker ready | `()` |
| `@OnWorkerError()` | Worker error | `(error: Error)` |

## QueueService API

### Adding Jobs

```typescript
// Single job
await queueService.addJob(queueName, jobName, data, options?);

// Multiple jobs (bulk)
await queueService.addJobs(queueName, [{ name, data, options? }]);

// Delayed job (runs after delay)
await queueService.addDelayedJob(queueName, jobName, data, delayMs, options?);

// Repeatable job (runs on schedule)
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

## Advanced Features

### Delayed Jobs

Schedule a job to run after a specific delay:

```typescript
// Send reminder after 1 hour
await queueService.addDelayedJob(
  'email-queue',
  'send',
  {
    to: 'user@example.com',
    subject: 'Reminder',
    body: 'Don\'t forget to complete your profile!',
  },
  60 * 60 * 1000 // 1 hour in milliseconds
);
```

### Repeatable Jobs

Schedule jobs to run on a recurring basis:

```typescript
// Daily digest at 9am
await queueService.addRepeatableJob(
  'email-queue',
  'daily-digest',
  { type: 'digest' },
  { pattern: '0 9 * * *' } // Cron pattern
);

// Every 5 minutes
await queueService.addRepeatableJob(
  'monitoring-queue',
  'health-check',
  {},
  { every: 5 * 60 * 1000 } // 5 minutes in milliseconds
);
```

### Progress Updates

Report progress for long-running jobs:

```typescript
@Process('bulk-send')
async handleBulkSend(job: Job<{ emails: string[] }>) {
  const { emails } = job.data;
  
  for (let i = 0; i < emails.length; i++) {
    await this.sendEmail(emails[i]);
    await job.updateProgress(Math.round((i + 1) / emails.length * 100));
  }
  
  return { sent: emails.length };
}
```

### Job Priorities

Higher priority jobs are processed first:

```typescript
// High priority (processed first)
await queueService.addJob('queue', 'job', data, { priority: 1 });

// Normal priority
await queueService.addJob('queue', 'job', data, { priority: 10 });

// Low priority (processed last)
await queueService.addJob('queue', 'job', data, { priority: 100 });
```

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

@Processor('orders')
class OrderProcessor {
  @Process('process')
  async handleOrder(job: Job) {
    // Validates and types the job data
    const data = OrderJobSchema.validate(job.data);
    // data is now typed as { orderId: string, items: [...], total: number }
  }
}
```

### Common Job Schemas

Pre-built schemas for common use cases:

```typescript
import { CommonJobSchemas } from '@riktajs/queue';

// Email job
const emailData = CommonJobSchemas.email.parse({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'World',
  attachments: [],
});

// Notification job
const notificationData = CommonJobSchemas.notification.parse({
  userId: 'user-123',
  type: 'info',
  title: 'New Message',
  message: 'You have a new message',
});

// File processing job
const fileData = CommonJobSchemas.fileProcessing.parse({
  fileId: 'file-123',
  operation: 'resize',
  options: { width: 800 },
});

// Webhook job
const webhookData = CommonJobSchemas.webhook.parse({
  url: 'https://api.example.com/webhook',
  method: 'POST',
  payload: { event: 'order.created' },
});
```

## Event System

Queue events are emitted to Rikta's EventBus for centralized monitoring:

```typescript
import { Injectable } from '@riktajs/core';
import { QUEUE_EVENTS } from '@riktajs/queue';

@Injectable()
export class MonitoringService {
  constructor(private eventBus: EventBus) {
    // Listen to queue events
    eventBus.on(QUEUE_EVENTS.JOB_COMPLETED, (payload) => {
      console.log(`Job ${payload.jobId} completed in ${payload.queueName}`);
    });

    eventBus.on(QUEUE_EVENTS.JOB_FAILED, (payload) => {
      console.error(`Job ${payload.jobId} failed: ${payload.error}`);
      // Send alert, log to monitoring service, etc.
    });
  }
}
```

### Available Events

| Event | Description | Payload |
|-------|-------------|---------|
| `queue:job:added` | Job added to queue | `{ queueName, jobId, jobName, data }` |
| `queue:job:completed` | Job completed | `{ queueName, jobId, result }` |
| `queue:job:failed` | Job failed | `{ queueName, jobId, error }` |
| `queue:job:progress` | Progress updated | `{ queueName, jobId, progress }` |
| `queue:job:stalled` | Job stalled | `{ queueName, jobId }` |
| `queue:job:delayed` | Job delayed | `{ queueName, jobId, delay }` |
| `queue:worker:ready` | Worker ready | `{ queueName }` |
| `queue:worker:error` | Worker error | `{ queueName, error }` |

## Bull Board Dashboard

For visual monitoring, you can optionally install Bull Board:

```bash
npm install @bull-board/api @bull-board/fastify
```

Then register it with your app:

```typescript
import { registerBullBoard } from '@riktajs/queue';

// After app is created
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

:::info
Bull Board packages are **optional** and must be installed separately. If not installed, a helpful error message will guide you.
:::

## Error Handling

The queue package provides specific error classes:

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
  if (error instanceof QueueConnectionError) {
    console.error('Redis connection failed:', error.host, error.port);
  }
}
```

### Retry Strategies

Configure retry behavior for failed jobs:

```typescript
await queueService.addJob('queue', 'job', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, 8s, 16s
  },
});
```

## Best Practices

### 1. Use Type-Safe Job Data

```typescript
interface OrderJobData {
  orderId: string;
  userId: string;
  action: 'process' | 'refund' | 'cancel';
}

@Process('handle-order')
async handle(job: Job<OrderJobData>) {
  const { orderId, userId, action } = job.data; // Fully typed
}
```

### 2. Handle Failures Gracefully

```typescript
@Process('risky-operation')
async handle(job: Job) {
  try {
    await this.riskyOperation(job.data);
  } catch (error) {
    // Log for debugging
    this.logger.error('Job failed', { jobId: job.id, error });
    // Re-throw to trigger retry
    throw error;
  }
}
```

### 3. Use Progress Updates for Long Jobs

```typescript
@Process('long-running-job')
async handle(job: Job<{ items: string[] }>) {
  const { items } = job.data;
  
  for (let i = 0; i < items.length; i++) {
    await this.processItem(items[i]);
    await job.updateProgress({
      current: i + 1,
      total: items.length,
      percentage: Math.round((i + 1) / items.length * 100),
    });
  }
}
```

### 4. Configure Appropriate Concurrency

```typescript
// CPU-intensive tasks: lower concurrency
@Processor('image-processing', { concurrency: 2 })

// I/O-bound tasks: higher concurrency
@Processor('api-calls', { concurrency: 20 })

// Rate-limited APIs: use rate limiter
@Processor('external-api', { 
  concurrency: 10,
  rateLimiter: { max: 100, duration: 60000 }
})
```

### 5. Clean Up Completed Jobs

```typescript
// Automatic cleanup
await queueService.addJob('queue', 'job', data, {
  removeOnComplete: {
    age: 3600,  // Keep for 1 hour
    count: 100, // Keep last 100
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours
  },
});
```

## Example: Complete Email Service

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { 
  Processor, 
  Process, 
  OnJobComplete, 
  OnJobFailed,
  QueueService,
  createJobSchema,
  z,
} from '@riktajs/queue';
import { Job } from 'bullmq';

// Define job schema
const EmailJobSchema = createJobSchema(z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string(),
  template: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
  })).optional(),
}));

type EmailJobData = z.infer<typeof EmailJobSchema.schema>;

@Processor('email-queue', { concurrency: 10 })
export class EmailProcessor {
  @Autowired()
  private mailer!: MailerService;

  @Process('send')
  async handleSend(job: Job<EmailJobData>) {
    const data = EmailJobSchema.validate(job.data);
    
    await this.mailer.send({
      to: data.to,
      subject: data.subject,
      html: data.body,
      attachments: data.attachments,
    });
    
    return { 
      sent: true, 
      to: data.to,
      timestamp: new Date().toISOString(),
    };
  }

  @Process('bulk-send')
  async handleBulkSend(job: Job<{ recipients: string[], template: string }>) {
    const { recipients, template } = job.data;
    
    for (let i = 0; i < recipients.length; i++) {
      await this.mailer.sendTemplate(recipients[i], template);
      await job.updateProgress(Math.round((i + 1) / recipients.length * 100));
    }
    
    return { sent: recipients.length };
  }

  @OnJobComplete()
  async onComplete(job: Job, result: { sent: boolean; to?: string }) {
    console.log(`✅ Email sent to ${result.to}`);
  }

  @OnJobFailed()
  async onFailed(job: Job | undefined, error: Error) {
    console.error(`❌ Email failed:`, error.message);
    // Could add to dead letter queue, send alert, etc.
  }
}

@Injectable()
export class EmailService {
  @Autowired()
  private queueService!: QueueService;

  async sendEmail(to: string, subject: string, body: string) {
    return this.queueService.addJob('email-queue', 'send', {
      to,
      subject,
      body,
    });
  }

  async sendDelayedEmail(to: string, subject: string, body: string, delayMs: number) {
    return this.queueService.addDelayedJob('email-queue', 'send', {
      to,
      subject,
      body,
    }, delayMs);
  }

  async sendBulkEmail(recipients: string[], template: string) {
    return this.queueService.addJob('email-queue', 'bulk-send', {
      recipients,
      template,
    });
  }

  async getEmailStats() {
    return this.queueService.getQueueStats('email-queue');
  }
}
```
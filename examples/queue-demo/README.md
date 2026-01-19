# Rikta Queue Demo

Demo project showcasing the `@riktajs/queue` package for background job processing with BullMQ.

## Prerequisites

- Node.js >= 20.0.0
- Redis server running on `localhost:6379`

## Quick Start

```bash
# Install dependencies
npm install

# Run the demo
npm run dev
```

## What This Demo Shows

1. **Processors** - Classes that handle jobs from specific queues
   - `EmailProcessor` - Handles email sending jobs
   - `TaskProcessor` - Handles background tasks with progress updates

2. **Services** - Inject `QueueService` to add jobs
   - `NotificationService` - Sends emails via queue
   - `TaskService` - Manages background tasks

3. **Features Demonstrated**
   - `@Processor` and `@Process` decorators
   - Job lifecycle events (`@OnJobComplete`, `@OnJobFailed`, `@OnWorkerReady`)
   - Progress updates for long-running jobs
   - Delayed job scheduling
   - Bulk job submission
   - Queue statistics

## Project Structure

```
queue-demo/
├── src/
│   ├── main.ts                 # Application bootstrap
│   ├── processors/
│   │   ├── email.processor.ts  # Email queue processor
│   │   ├── task.processor.ts   # Task queue processor
│   │   └── index.ts
│   └── services/
│       ├── notification.service.ts  # Email job submission
│       ├── task.service.ts          # Task job submission
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | - | Redis password (optional) |

## Expected Output

When you run the demo, you should see:

```
🚀 Starting Rikta Queue Demo...

📧 Email worker is ready and listening for jobs
⚙️  Task worker is ready and listening for jobs

📋 Registered queues: [ 'email-queue', 'task-queue' ]

--- Starting Demo Jobs ---

📧 Demo 1: Sending a simple email...
📬 Email job queued: 1

👋 Demo 2: Sending welcome email...
👋 Welcome email job queued for John Doe: 2

⏰ Demo 3: Scheduling delayed email (5 seconds)...
⏰ Delayed email job queued (5000ms delay): 3

... (more job processing output)

--- Queue Statistics ---
{
  "email-queue": { "waiting": 0, "active": 0, "completed": 6, ... },
  "task-queue": { "waiting": 0, "active": 0, "completed": 3, ... }
}

✅ Demo completed!
```

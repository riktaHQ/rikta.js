/**
 * Rikta Queue Demo
 * 
 * This example demonstrates the @riktajs/queue package:
 * - Creating processors with @Processor and @Process decorators
 * - Using QueueService to add jobs via @Autowired in services
 * - Job lifecycle events (@OnJobComplete, @OnJobFailed, etc.)
 * - REST API endpoints to trigger queue jobs
 * 
 * Prerequisites:
 * - Redis running on localhost:6379
 * 
 * Run with: npm run dev
 * 
 * API Endpoints:
 * - GET  /demo/health     - Check health and queue names
 * - GET  /demo/stats      - Get queue statistics
 * - GET  /demo/run-all    - Run all demo jobs at once
 * - POST /demo/email      - Send a single email
 * - POST /demo/welcome    - Send a welcome email
 * - POST /demo/delayed    - Send a delayed email
 * - POST /demo/bulk       - Send bulk emails
 * - POST /demo/process-data - Start data processing
 * - POST /demo/report     - Generate a report
 * - POST /demo/cleanup    - Schedule cleanup
 */

import { Rikta } from '@riktajs/core';
import { createQueueProvider } from '@riktajs/queue';
import { EmailProcessor } from './processors/email.processor';
import { TaskProcessor } from './processors/task.processor';


async function bootstrap() {
  console.log('🚀 Starting Rikta Queue Demo...\n');

  
  // Create queue provider with Redis configuration
  const queueProvider = createQueueProvider({
    config: {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultConcurrency: 2,
      shutdownTimeout: 10000,
    },
  });

  // Register all processors
  queueProvider.registerProcessors(EmailProcessor, TaskProcessor);

  // Initialize the queue provider BEFORE Rikta.create()
  // This registers QueueService in the Container singleton
  await queueProvider.onProviderInit();

  // Create the Rikta application
  // Autodiscovery finds controllers and services automatically
  const app = await Rikta.create({
    port: 3000,
    logger: false
  });

  // Start listening
  await app.listen();
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap error:', error);
  process.exit(1);
});

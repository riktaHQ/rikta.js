/**
 * Queue Demo Controller
 * 
 * REST API endpoints to demonstrate queue functionality.
 */

import { Controller, Get, Post, Body, Autowired } from '@riktajs/core';
import { NotificationService } from '../services/notification.service';
import { TaskService } from '../services/task.service';
import { EmailJobData } from '../processors/email.processor';

@Controller('/demo')
export class QueueDemoController {
  @Autowired()
  private notificationService!: NotificationService;

  @Autowired()
  private taskService!: TaskService;

  /**
   * GET /demo/health - Check if the demo is running
   */
  @Get('/health')
  async health() {
    return { 
      status: 'ok', 
      queues: this.taskService.getQueueNames(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * POST /demo/email - Send a single email
   */
  @Post('/email')
  async sendEmail(@Body() body: { to: string; subject: string; body: string }) {
    const jobId = await this.notificationService.sendEmail(
      body.to,
      body.subject,
      body.body
    );
    return { success: true, jobId };
  }

  /**
   * POST /demo/welcome - Send a welcome email
   */
  @Post('/welcome')
  async sendWelcome(@Body() body: { email: string; name: string }) {
    const jobId = await this.notificationService.sendWelcomeEmail(
      body.email,
      body.name
    );
    return { success: true, jobId };
  }

  /**
   * POST /demo/delayed - Send a delayed email
   */
  @Post('/delayed')
  async sendDelayed(@Body() body: { to: string; delayMs?: number }) {
    const jobId = await this.notificationService.sendDelayedReminder(
      body.to,
      body.delayMs || 5000
    );
    return { success: true, jobId, delayMs: body.delayMs || 5000 };
  }

  /**
   * POST /demo/bulk - Send bulk emails
   */
  @Post('/bulk')
  async sendBulk(@Body() body: { emails: EmailJobData[] }) {
    const jobIds = await this.notificationService.sendBulkEmails(body.emails);
    return { success: true, jobIds, count: jobIds.length };
  }

  /**
   * POST /demo/process-data - Start a data processing job
   */
  @Post('/process-data')
  async processData(@Body() body: { datasetId: string; operation: 'analyze' | 'transform' | 'export' }) {
    const jobId = await this.taskService.processData(
      body.datasetId,
      body.operation
    );
    return { success: true, jobId };
  }

  /**
   * POST /demo/report - Generate a report
   */
  @Post('/report')
  async generateReport(@Body() body: { reportType: string; parameters?: Record<string, unknown> }) {
    const jobId = await this.taskService.generateReport(
      body.reportType,
      body.parameters || {}
    );
    return { success: true, jobId };
  }

  /**
   * POST /demo/cleanup - Schedule a cleanup task
   */
  @Post('/cleanup')
  async scheduleCleanup(@Body() body: { olderThanDays: number; priority?: number }) {
    const jobId = await this.taskService.scheduleCleanup(
      body.olderThanDays,
      body.priority || 10
    );
    return { success: true, jobId };
  }

  /**
   * GET /demo/stats - Get queue statistics
   */
  @Get('/stats')
  async getStats() {
    const stats = await this.taskService.getQueueStats();
    return { stats, timestamp: new Date().toISOString() };
  }

  /**
   * GET /demo/run-all - Run all demo jobs at once
   */
  @Get('/run-all')
  async runAllDemos() {
    const results: Record<string, string> = {};

    // Demo 1: Send a simple email
    results['email'] = await this.notificationService.sendEmail(
      'user@example.com',
      'Hello from Rikta Queue!',
      'This is a test email sent through the queue system.'
    );

    // Demo 2: Send a welcome email
    results['welcome'] = await this.notificationService.sendWelcomeEmail(
      'newuser@example.com',
      'John Doe'
    );

    // Demo 3: Send a delayed email (5 seconds)
    results['delayed'] = await this.notificationService.sendDelayedReminder(
      'reminder@example.com',
      5000
    );

    // Demo 4: Send bulk emails
    const bulkIds = await this.notificationService.sendBulkEmails([
      { to: 'bulk1@example.com', subject: 'Bulk Email 1', body: 'First bulk email' },
      { to: 'bulk2@example.com', subject: 'Bulk Email 2', body: 'Second bulk email' },
      { to: 'bulk3@example.com', subject: 'Bulk Email 3', body: 'Third bulk email' },
    ]);
    results['bulk'] = bulkIds.join(', ');

    // Demo 5: Start a data processing job
    results['dataProcessing'] = await this.taskService.processData('dataset-001', 'analyze');

    // Demo 6: Generate a report
    results['report'] = await this.taskService.generateReport('monthly-sales', { month: 1, year: 2026 });

    // Demo 7: Schedule cleanup with priority
    results['cleanup'] = await this.taskService.scheduleCleanup(30, 5);

    return {
      success: true,
      message: 'All demo jobs queued!',
      jobIds: results,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Notification Service
 * 
 * Demonstrates how to inject QueueService and add jobs to queues.
 * This service can be used by controllers or other services.
 */

import { Injectable, Autowired } from '@riktajs/core';
import { QueueService, QUEUE_SERVICE } from '@riktajs/queue';
import { EmailJobData } from '../processors/email.processor.js';

@Injectable()
export class NotificationService {
  
  @Autowired(QUEUE_SERVICE)
  private queueService!: QueueService;

  /**
   * Send a single email via the queue
   */
  async sendEmail(to: string, subject: string, body: string): Promise<string> {
    const job = await this.queueService.addJob<EmailJobData>('email-queue', 'send', {
      to,
      subject,
      body,
    });
    
    console.log(`📬 Email job queued: ${job.id}`);
    return job.id!;
  }

  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(email: string, name: string): Promise<string> {
    const job = await this.queueService.addJob('email-queue', 'welcome', {
      email,
      name,
    });
    
    console.log(`👋 Welcome email job queued for ${name}: ${job.id}`);
    return job.id!;
  }

  /**
   * Send a delayed reminder email
   */
  async sendDelayedReminder(to: string, delayMs: number = 5000): Promise<string> {
    const job = await this.queueService.addDelayedJob<EmailJobData>(
      'email-queue',
      'send',
      {
        to,
        subject: 'Reminder',
        body: 'This is a delayed reminder email sent from the queue!',
      },
      delayMs
    );
    
    console.log(`⏰ Delayed email job queued (${delayMs}ms delay): ${job.id}`);
    return job.id!;
  }

  /**
   * Send multiple emails in bulk
   */
  async sendBulkEmails(emails: EmailJobData[]): Promise<string[]> {
    const jobs = emails.map(email => ({
      name: 'send',
      data: email,
    }));
    
    const addedJobs = await this.queueService.addJobs('email-queue', jobs);
    const jobIds = addedJobs.map(j => j.id!);
    
    console.log(`📦 Bulk email jobs queued: ${jobIds.length} jobs`);
    return jobIds;
  }
}

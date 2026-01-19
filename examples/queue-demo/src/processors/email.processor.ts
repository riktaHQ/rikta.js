/**
 * Email Processor
 * 
 * Handles email jobs from the 'email-queue'.
 * Demonstrates:
 * - @Processor decorator for queue binding
 * - @Process decorator for job handling
 * - Event decorators for job lifecycle
 */

import { Processor, Process, OnJobComplete, OnJobFailed, OnWorkerReady } from '@riktajs/queue';
import { Job } from 'bullmq';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Processor('email-queue', { concurrency: 3 })
export class EmailProcessor {
  
  @OnWorkerReady()
  onReady() {
    console.log('📧 Email worker is ready and listening for jobs');
  }

  @Process('send')
  async handleSendEmail(job: Job<EmailJobData>) {
    console.log(`📨 Processing email job ${job.id} to: ${job.data.to}`);
    
    // Simulate email sending (1-2 seconds)
    await this.simulateSendEmail(job.data);
    
    console.log(`✅ Email sent to ${job.data.to}`);
    return { 
      sent: true, 
      messageId: `msg-${job.id}`,
      timestamp: new Date().toISOString()
    };
  }

  @Process('welcome')
  async handleWelcomeEmail(job: Job<{ email: string; name: string }>) {
    console.log(`👋 Sending welcome email to ${job.data.name} (${job.data.email})`);
    
    await this.simulateSendEmail({
      to: job.data.email,
      subject: `Welcome ${job.data.name}!`,
      body: `Hello ${job.data.name}, welcome to our service!`
    });
    
    return { welcomed: true, user: job.data.name };
  }

  @OnJobComplete()
  async onComplete(job: Job, result: unknown) {
    console.log(`✅ Job ${job.id} (${job.name}) completed:`, JSON.stringify(result));
  }

  @OnJobFailed()
  async onFailed(job: Job | undefined, error: Error) {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  }

  private async simulateSendEmail(data: EmailJobData): Promise<void> {
    // Simulate async email sending
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Log the simulated email
    console.log(`  📬 [SIMULATED] Email Details:`);
    console.log(`     To: ${data.to}`);
    console.log(`     Subject: ${data.subject}`);
    console.log(`     Body: ${data.body.substring(0, 50)}...`);
  }
}

/**
 * Task Service
 * 
 * Demonstrates various queue operations including:
 * - Adding different job types
 * - Getting queue statistics
 * - Managing queues
 */

import { Injectable, Autowired } from '@riktajs/core';
import { QueueService, QUEUE_SERVICE } from '@riktajs/queue';
import { DataProcessingJobData, ReportJobData } from '../processors/task.processor.js';

@Injectable()
export class TaskService {
  
  @Autowired(QUEUE_SERVICE)
  private queueService!: QueueService;

  /**
   * Start a data processing job
   */
  async processData(
    datasetId: string, 
    operation: 'analyze' | 'transform' | 'export'
  ): Promise<string> {
    const job = await this.queueService.addJob<DataProcessingJobData>('task-queue', 'data-processing', {
      datasetId,
      operation,
      options: { timestamp: Date.now() }
    });
    
    console.log(`🔄 Data processing job queued: ${job.id}`);
    return job.id!;
  }

  /**
   * Generate a report
   */
  async generateReport(reportType: string, parameters: Record<string, unknown> = {}): Promise<string> {
    const job = await this.queueService.addJob<ReportJobData>('task-queue', 'generate-report', {
      reportType,
      parameters,
    });
    
    console.log(`📋 Report generation job queued: ${job.id}`);
    return job.id!;
  }

  /**
   * Schedule a cleanup task with priority
   */
  async scheduleCleanup(olderThanDays: number, priority: number = 10): Promise<string> {
    const job = await this.queueService.addJob('task-queue', 'cleanup', 
      { olderThanDays },
      { priority }
    );
    
    console.log(`🧹 Cleanup job queued with priority ${priority}: ${job.id}`);
    return job.id!;
  }

  /**
   * Get statistics for all queues
   */
  async getQueueStats(): Promise<Record<string, unknown>> {
    const emailStats = await this.queueService.getQueueStats('email-queue');
    const taskStats = await this.queueService.getQueueStats('task-queue');
    
    return {
      'email-queue': emailStats,
      'task-queue': taskStats,
    };
  }

  /**
   * Get all registered queue names
   */
  getQueueNames(): string[] {
    return this.queueService.getQueueNames();
  }
}

/**
 * Task Processor
 * 
 * Handles background tasks from the 'task-queue'.
 * Demonstrates:
 * - Multiple @Process handlers in one processor
 * - Progress updates for long-running jobs
 * - Different job types
 * - @Autowired dependency injection of services
 */

import { Autowired } from '@riktajs/core';
import { Processor, Process, OnJobComplete, OnJobProgress, OnWorkerReady } from '@riktajs/queue';
import { Job } from 'bullmq';
import { LoggerService } from '../services/logger.service';

export interface DataProcessingJobData {
  datasetId: string;
  operation: 'analyze' | 'transform' | 'export';
  options?: Record<string, unknown>;
}

export interface ReportJobData {
  reportType: string;
  parameters: Record<string, unknown>;
}

@Processor('task-queue', { concurrency: 2 })
export class TaskProcessor {
  
  @Autowired(LoggerService)
  private logger!: LoggerService;

  @OnWorkerReady()
  onReady() {
    this.logger.setContext('TaskProcessor');
    this.logger.success('Task worker is ready and listening for jobs');
  }

  @Process('data-processing')
  async handleDataProcessing(job: Job<DataProcessingJobData>) {
    this.logger.info(`Starting data processing job ${job.id}: ${job.data.operation}`);
    
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      // Simulate processing step
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update progress
      const progress = Math.round((i / steps) * 100);
      await job.updateProgress(progress);
      this.logger.debug(`Job ${job.id} progress: ${progress}%`);
    }
    
    return {
      datasetId: job.data.datasetId,
      operation: job.data.operation,
      rowsProcessed: Math.floor(Math.random() * 10000) + 1000,
      completedAt: new Date().toISOString()
    };
  }

  @Process('generate-report')
  async handleGenerateReport(job: Job<ReportJobData>) {
    this.logger.info(`Generating report: ${job.data.reportType}`);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      reportType: job.data.reportType,
      url: `https://reports.example.com/${job.id}.pdf`,
      generatedAt: new Date().toISOString()
    };
  }

  @Process('cleanup')
  async handleCleanup(job: Job<{ olderThanDays: number }>) {
    this.logger.info(`Running cleanup for items older than ${job.data.olderThanDays} days`);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const deletedCount = Math.floor(Math.random() * 100);
    return { deletedCount, cleanedAt: new Date().toISOString() };
  }

  @OnJobProgress()
  onProgress(job: Job, progress: number | object) {
    this.logger.debug(`Job ${job.id} progress update: ${progress}`);
  }

  @OnJobComplete()
  onComplete(job: Job, result: unknown) {
    this.logger.success(`Task job ${job.id} (${job.name}) completed: ${JSON.stringify(result)}`);
  }
}

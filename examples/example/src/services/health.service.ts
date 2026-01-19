import { Injectable, Autowired, OnApplicationListen } from '@riktajs/core';
import { APP_CONFIG, Logger, LOGGER } from '../config/app.config';
import {AppConfigProvider} from "../config/app-config.provider";

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  app: string;
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
}

/**
 * Health check service
 * 
 * Demonstrates OnApplicationListen hook
 */
@Injectable()
export class HealthService implements OnApplicationListen {
  private readonly startTime = Date.now();

  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;

  @Autowired(LOGGER)
  private logger!: Logger;

  /**
   * Called after the server starts listening
   */
  onApplicationListen(address: string): void {
    this.logger.info(`Health endpoint ready at ${address}/health`);
  }

  /**
   * Get current health status
   */
  getStatus(): HealthStatus {
    return {
      status: 'ok',
      app: this.config.name,
      version: this.config.version,
      environment: this.config.environment,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}


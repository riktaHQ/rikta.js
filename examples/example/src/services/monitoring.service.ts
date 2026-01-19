import { Injectable, On, Autowired } from '@riktajs/core';
import { Logger, LOGGER } from '../config/app.config';

/**
 * Monitoring Service
 * 
 * Demonstrates the @On() decorator for event-based lifecycle hooks.
 * This is an alternative to implementing interface hooks.
 */
@Injectable()
export class MonitoringService {
  private requestCount = 0;
  private startTime = 0;

  @Autowired(LOGGER)
  private logger!: Logger;

  /**
   * Called when the server starts listening
   */
  @On('app:listen')
  onServerStart({ address, port }: { address: string; port: number }) {
    this.startTime = Date.now();
    this.logger.info(`📊 Monitoring active - Server at ${address} (port ${port})`);
  }

  /**
   * Called when a provider is initialized
   */
  @On('provider:init')
  onProviderInitialized({ name, priority }: { name: string; priority: number }) {
    if (priority > 0) {
      this.logger.debug(`Provider ${name} initialized (priority: ${priority})`);
    }
  }

  /**
   * Called when the app is shutting down
   */
  @On('app:shutdown')
  onShutdown({ signal }: { signal?: string }) {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    this.logger.info(`📊 Shutting down - Uptime: ${uptime}s, Requests: ${this.requestCount}`);
    if (signal) {
      this.logger.info(`   Signal: ${signal}`);
    }
  }

  /**
   * Called when the app is fully destroyed
   */
  @On('app:destroy')
  onDestroy({ uptime }: { uptime: number }) {
    console.log(`\n📊 Final stats - Total uptime: ${uptime}ms`);
  }

  /**
   * Increment request counter (called by middleware/interceptor)
   */
  trackRequest(): void {
    this.requestCount++;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      uptime: Date.now() - this.startTime,
      requests: this.requestCount,
    };
  }
}


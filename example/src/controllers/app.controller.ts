import { Controller, Get, Autowired } from '../../../src';
import { HealthService, HealthStatus } from '../services/health.service';
import { AppConfig, APP_CONFIG } from '../config/app.config';

/**
 * Root Application Controller
 */
@Controller()
export class AppController {
  @Autowired()
  private healthService!: HealthService;

  @Autowired(APP_CONFIG)
  private config!: AppConfig;

  /**
   * GET /
   * Application info
   */
  @Get()
  getInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      environment: this.config.environment,
      endpoints: {
        health: 'GET /health',
        users: 'GET|POST /users',
        user: 'GET|PUT|DELETE /users/:id',
      },
    };
  }

  /**
   * GET /health
   * Health check endpoint
   */
  @Get('/health')
  getHealth(): HealthStatus {
    return this.healthService.getStatus();
  }
}


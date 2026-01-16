import {Controller, Get, Autowired, Req, RouteContext} from '@riktajs/core';
import {ApiTags, ApiOperation, ApiResponse} from '@riktajs/swagger';
import {HealthService, HealthStatus} from '../services/health.service';
import {APP_CONFIG} from '../config/app.config';
import {AppConfigProvider} from "../config/app-config.provider";

/**
 * Root Application Controller
 */
@ApiTags('Application')
@Controller()
export class AppController {
  @Autowired()
  private healthService!: HealthService;

  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;

  /**
   * GET /
   * Application info
   */
  @Get()
  @ApiOperation({ summary: 'Get application info', description: 'Returns basic application information and available endpoints' })
  @ApiResponse({ status: 200, description: 'Application information' })
  getInfo(@Req() request: Req): any {
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
  @ApiOperation({ summary: 'Health check', description: 'Returns the current health status of the application' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  getHealth(): HealthStatus {
    return this.healthService.getStatus();
  }
}


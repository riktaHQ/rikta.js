import { Controller, Get } from '@riktajs/core';

/**
 * Health Check Controller
 */
@Controller('/health')
export class HealthController {
  @Get('/')
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }
}

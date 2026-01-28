import { Autowired, Controller, Get, Query } from '@riktajs/core';
import { GreetingService } from '../services/greeting.service';

@Controller()
export class AppController {

  @Autowired()
  private greetingService!: GreetingService

  @Get()
  getHello(): { message: string; timestamp: string } {
    return {
      message: this.greetingService.getWelcomeMessage(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/greet')
  getGreeting(@Query('name') name: string = 'Guest'): { greeting: string } {
    return {
      greeting: this.greetingService.getGreeting(name),
    };
  }

  @Get('/health')
  getHealth(): { status: string; uptime: number } {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }
}

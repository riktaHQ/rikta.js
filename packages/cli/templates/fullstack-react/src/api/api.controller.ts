import { Controller, Get } from '@riktajs/core';

/**
 * API Controller - Example backend routes
 */
@Controller('/api')
export class ApiController {
  @Get('/hello')
  hello() {
    return {
      message: 'Hello from Rikta API!',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/data')
  getData() {
    return {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };
  }
}

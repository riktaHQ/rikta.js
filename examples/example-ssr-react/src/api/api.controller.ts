import { Controller, Get, Param } from '@riktajs/core';

/**
 * API Controller - Example backend routes
 * These routes return JSON data
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
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
      total: 3,
    };
  }

  @Get('/users/:id')
  getUser(@Param('id') id: string) {
    const users = [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
      { id: '3', name: 'Charlie', email: 'charlie@example.com' },
    ];
    return users.find((u) => u.id === id) || { error: 'User not found' };
  }
}

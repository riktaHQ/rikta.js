/**
 * Rikta Framework
 * 
 * A modern TypeScript backend framework with zero-config autowiring, powered by Fastify.
 * 
 * Features:
 * - Decorator-based routing (@Controller, @Get, @Post, etc.)
 * - Full Autowiring - No modules needed, everything is auto-discovered
 * - Single DI decorator - @Autowired() for constructor and property injection
 * - Hybrid Lifecycle - Interface hooks + EventBus
 * - Exception Handling - Built-in filters with standardized JSON responses
 * - Fastify under the hood for maximum performance
 * - Full TypeScript support
 * 
 * @example
 * ```typescript
 * import { Rikta, Controller, Get, Injectable, Autowired } from '@rikta/core';
 * 
 * @Injectable()
 * class GreetingService {
 *   getGreeting(): string {
 *     return 'Hello from Rikta!';
 *   }
 * }
 * 
 * @Controller()
 * class AppController {
 *   @Autowired()
 *   private greetingService!: GreetingService;
 * 
 *   @Get('/')
 *   getHello() {
 *     return this.greetingService.getGreeting();
 *   }
 * }
 * 
 * // No modules - just create and run!
 * const app = await Rikta.create({ port: 3000 });
 * await app.listen();
 * ```
 */

// Re-export everything from core
export * from './core/index.js';

// Default export for convenience
export { RiktaFactory as default } from './core/application.js';


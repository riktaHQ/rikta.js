import 'reflect-metadata';
import { INJECTABLE_METADATA } from '../constants.js';
import { container } from '../container/container.js';

/**
 * @Middleware() Decorator
 * 
 * Marks a class as a middleware that can be used with @UseMiddleware().
 * Classes decorated with @Middleware() are automatically registered as
 * injectable singletons in the DI container.
 * 
 * Middleware execute AFTER guards and BEFORE the route handler.
 * They have access to the raw Fastify Request and Reply objects.
 * 
 * @example Basic logger middleware
 * ```typescript
 * import { Middleware, RiktaMiddleware, NextFunction } from '@riktajs/core';
 * import type { FastifyRequest, FastifyReply } from 'fastify';
 * 
 * @Middleware()
 * export class LoggerMiddleware implements RiktaMiddleware {
 *   use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
 *     console.log(`${req.method} ${req.url}`);
 *     next();
 *   }
 * }
 * ```
 * 
 * @example Middleware with dependency injection
 * ```typescript
 * import { Middleware, RiktaMiddleware, NextFunction, Autowired } from '@riktajs/core';
 * 
 * @Middleware()
 * export class MetricsMiddleware implements RiktaMiddleware {
 *   constructor(@Autowired() private metricsService: MetricsService) {}
 * 
 *   use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
 *     const start = Date.now();
 *     res.raw.on('finish', () => {
 *       this.metricsService.recordLatency(req.url, Date.now() - start);
 *     });
 *     next();
 *   }
 * }
 * ```
 * 
 * @example Using middleware on controller
 * ```typescript
 * @Controller('/api')
 * @UseMiddleware(LoggerMiddleware, MetricsMiddleware)
 * export class ApiController {
 *   // Middleware runs for all routes in this controller
 * }
 * ```
 */
export function Middleware(): ClassDecorator {
  return (target: Function) => {
    // Mark as middleware
    Reflect.defineMetadata('middleware', true, target);

    // Also register as a singleton injectable in the DI container
    Reflect.defineMetadata(INJECTABLE_METADATA, { scope: 'singleton' }, target);
    container.register(target as new (...args: unknown[]) => unknown, { scope: 'singleton' });
  };
}

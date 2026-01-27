/**
 * Logger Middleware
 * 
 * Logs incoming HTTP requests with timing information.
 * Demonstrates the @Middleware decorator for cross-cutting concerns.
 */
import { Middleware, RiktaMiddleware, NextFunction, Autowired, FastifyRequest, FastifyReply } from '@riktajs/core';
import { MonitoringService } from '../services/monitoring.service.js';

@Middleware()
export class LoggerMiddleware implements RiktaMiddleware {
  @Autowired()
  private monitoringService!: MonitoringService;

  use(req: FastifyRequest, res: FastifyReply, next: NextFunction): void {
    const start = Date.now();
    const requestId = this.generateRequestId();
    
    // Attach request ID to the request object for use in handlers
    (req as any).requestId = requestId;
    
    // Add request ID to response headers for tracing
    res.header('X-Request-Id', requestId);
    
    // Log incoming request
    console.log(`[${this.getTimestamp()}] ➡️  ${req.method} ${req.url} (${requestId})`);
    
    // Record metrics
    this.monitoringService.trackRequest();
    
    // Log response when finished
    res.raw.on('finish', () => {
      const duration = Date.now() - start;
      const statusEmoji = res.statusCode < 400 ? '✅' : res.statusCode < 500 ? '⚠️' : '❌';
      
      console.log(
        `[${this.getTimestamp()}] ${statusEmoji} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
      );
    });
    
    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }
}

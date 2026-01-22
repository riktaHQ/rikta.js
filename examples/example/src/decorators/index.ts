/**
 * Custom Decorators Example
 * 
 * Demonstrates how to use createParamDecorator and applyDecorators
 * to create reusable, type-safe custom decorators.
 */

import { 
  createParamDecorator, 
  applyDecorators, 
  SetMetadata,
  ExecutionContext,
  FastifyRequest 
} from '@riktajs/core';
import { ApiHeader, ApiResponse } from '@riktajs/swagger';

// ============================================================================
// Custom Parameter Decorators using createParamDecorator
// ============================================================================

/**
 * User entity attached to request after authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

/**
 * Extended request type with user attached
 */
type AuthenticatedRequest = FastifyRequest & { user?: AuthUser };

/**
 * @User() - Custom parameter decorator to extract user from request
 * 
 * Usage:
 *   @Get('/profile')
 *   getProfile(@User() user: AuthUser) { ... }
 * 
 *   @Get('/email')
 *   getEmail(@User('email') email: string) { ... }
 */
export const User = createParamDecorator<keyof AuthUser | undefined, AuthUser | string | string[] | undefined>(
  (data, ctx: ExecutionContext) => {
    const request = ctx.getRequest<AuthenticatedRequest>();
    const user = request.user;
    
    // If a property name is provided, return that specific property
    if (data && user) {
      return user[data];
    }
    
    return user;
  }
);

/**
 * @ClientIp() - Extract client IP address from request
 * 
 * Usage:
 *   @Get('/track')
 *   track(@ClientIp() ip: string) { ... }
 */
export const ClientIp = createParamDecorator<void, string>((_, ctx) => {
  const request = ctx.getRequest<FastifyRequest>();
  return request.ip || 
         (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         'unknown';
});

/**
 * @UserAgent() - Extract user agent from request headers
 * 
 * Usage:
 *   @Get('/info')
 *   getInfo(@UserAgent() ua: string) { ... }
 */
export const UserAgent = createParamDecorator<void, string>((_, ctx) => {
  const request = ctx.getRequest<FastifyRequest>();
  return (request.headers['user-agent'] as string) || 'unknown';
});

/**
 * @RequestId() - Extract or generate request ID for tracing
 * 
 * Usage:
 *   @Get('/trace')
 *   trace(@RequestId() id: string) { ... }
 */
export const RequestId = createParamDecorator<void, string>((_, ctx) => {
  const request = ctx.getRequest<FastifyRequest>();
  return (request.headers['x-request-id'] as string) || 
         `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
});

/**
 * @Lang() - Extract preferred language with default fallback
 * 
 * Usage:
 *   @Get('/greeting')
 *   greet(@Lang('en') lang: string) { ... }
 */
export const Lang = createParamDecorator<string, string>((defaultLang, ctx) => {
  const request = ctx.getRequest<FastifyRequest>();
  const acceptLanguage = request.headers['accept-language'] as string;
  return acceptLanguage?.split(',')[0]?.split('-')[0] || defaultLang || 'en';
});

// ============================================================================
// Composed Decorators using applyDecorators
// ============================================================================

/**
 * @Roles() - Set required roles metadata for authorization
 * 
 * Usage:
 *   @Roles('admin', 'moderator')
 *   @Get('/admin')
 *   adminEndpoint() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * @Public() - Mark endpoint as public (no authentication required)
 * 
 * Usage:
 *   @Public()
 *   @Get('/health')
 *   healthCheck() { ... }
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * @Cached() - Mark endpoint response as cacheable
 * 
 * Usage:
 *   @Cached(300)
 *   @Get('/static')
 *   getStaticData() { ... }
 */
export const Cached = (ttlSeconds: number) => SetMetadata('cacheTTL', ttlSeconds);

/**
 * @ApiAuth() - Composed decorator for authenticated endpoints
 * 
 * Combines:
 * - Roles metadata
 * - Swagger documentation for auth header
 * - Unauthorized response documentation
 * 
 * Usage:
 *   @ApiAuth('admin')
 *   @Get('/secret')
 *   getSecret() { ... }
 */
export function ApiAuth(...roles: string[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    SetMetadata('authenticated', true),
    ApiHeader({
      name: 'Authorization',
      description: 'Bearer token',
      required: true,
    }),
    ApiResponse({ 
      status: 401, 
      description: 'Unauthorized - Invalid or missing token' 
    }),
    ApiResponse({ 
      status: 403, 
      description: 'Forbidden - Insufficient permissions' 
    })
  );
}

/**
 * @Tracked() - Composed decorator for request tracking
 * 
 * Adds metadata for analytics and swagger docs for request ID header
 * 
 * Usage:
 *   @Tracked()
 *   @Get('/important')
 *   importantEndpoint() { ... }
 */
export function Tracked() {
  return applyDecorators(
    SetMetadata('tracked', true),
    ApiHeader({
      name: 'X-Request-Id',
      description: 'Request correlation ID for tracing',
      required: false,
    })
  );
}

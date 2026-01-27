import type { ExecutionContext } from './execution-context.js';

/**
 * CanActivate Interface
 * 
 * Guards implementing this interface determine whether a given
 * request is allowed to be handled by the route handler.
 * 
 * Guards are executed BEFORE the route handler. If any guard
 * returns `false`, the request is rejected with a 403 Forbidden.
 * 
 * @example Basic authentication guard
 * ```typescript
 * import { Injectable } from '@riktajs/core';
 * import type { CanActivate, ExecutionContext } from '@riktajs/core';
 * 
 * @Injectable()
 * export class AuthGuard implements CanActivate {
 *   canActivate(context: ExecutionContext): boolean {
 *     const request = context.getRequest();
 *     return !!request.headers.authorization;
 *   }
 * }
 * ```
 * 
 * @example Async guard with service injection
 * ```typescript
 * @Injectable()
 * export class JwtGuard implements CanActivate {
 *   constructor(private authService: AuthService) {}
 * 
 *   async canActivate(context: ExecutionContext): Promise<boolean> {
 *     const request = context.getRequest();
 *     const token = request.headers.authorization?.replace('Bearer ', '');
 *     
 *     if (!token) return false;
 *     
 *     try {
 *       const user = await this.authService.verifyToken(token);
 *       request.user = user;
 *       return true;
 *     } catch {
 *       return false;
 *     }
 *   }
 * }
 * ```
 * 
 * @example Role-based guard
 * ```typescript
 * @Injectable()
 * export class RolesGuard implements CanActivate {
 *   canActivate(context: ExecutionContext): boolean {
 *     const request = context.getRequest();
 *     const user = request.user;
 *     const requiredRoles = context.getMetadata<string[]>('roles');
 *     
 *     if (!requiredRoles || requiredRoles.length === 0) {
 *       return true;
 *     }
 *     
 *     return requiredRoles.some(role => user?.roles?.includes(role));
 *   }
 * }
 * ```
 */
export interface CanActivate {
  /**
   * Determines whether the request can proceed to the handler.
   * 
   * @param context - The execution context containing request/reply
   * @returns `true` to allow access, `false` to deny (throws 403)
   * 
   * Can be synchronous or return a Promise for async operations.
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

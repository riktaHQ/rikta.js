import type { Guard, ExecutionContext } from '@riktajs/core';

/**
 * Example Auth Guard for SSR routes
 * 
 * This guard checks for an 'auth-token' header or cookie.
 * In a real application, you would validate the token against your auth system.
 */
export class AuthGuard implements Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check for auth token in header or cookie
    const authToken = request.headers['x-auth-token'] || request.cookies?.['auth-token'];
    
    // For demo purposes, accept any non-empty token
    // In production, validate the token properly
    if (authToken) {
      // Attach user info to request for use in controllers
      request.user = {
        id: 'user-123',
        name: 'Demo User',
        authenticated: true,
      };
      return true;
    }
    
    return false;
  }
}

/**
 * Admin Guard - checks for admin role
 * 
 * This guard requires the AuthGuard to run first to set the user on the request.
 */
export class AdminGuard implements Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check if user is an admin
    const isAdmin = request.headers['x-admin'] === 'true';
    
    if (isAdmin) {
      request.user = {
        ...request.user,
        role: 'admin',
      };
    }
    
    return isAdmin;
  }
}

/**
 * Optional Auth Guard - doesn't block, just sets user if available
 * 
 * Useful for pages that should render for everyone but show extra content for logged-in users.
 */
export class OptionalAuthGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    const authToken = request.headers['x-auth-token'] || request.cookies?.['auth-token'];
    
    if (authToken) {
      request.user = {
        id: 'user-123',
        name: 'Demo User',
        authenticated: true,
      };
    } else {
      request.user = null;
    }
    
    // Always allow - this guard just enriches the request
    return true;
  }
}

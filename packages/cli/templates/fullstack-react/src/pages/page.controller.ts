import { Get, Param, UseGuards, Req } from '@riktajs/core';
import type { FastifyRequest } from 'fastify';
import { SsrController, Ssr, Head } from '@riktajs/ssr';

/**
 * Example Auth Guard for SSR routes
 * Move this to a separate file in production: src/guards/auth.guard.ts
 */
class OptionalAuthGuard {
  canActivate(context: { switchToHttp: () => { getRequest: () => FastifyRequest } }): boolean {
    const request = context.switchToHttp().getRequest();
    const authToken = (request.headers as any)['x-auth-token'] || (request as any).cookies?.['auth-token'];
    
    if (authToken) {
      (request as any).user = { id: 'user-123', name: 'Demo User', authenticated: true };
    } else {
      (request as any).user = null;
    }
    
    return true; // Always allow - just enriches request
  }
}

/**
 * Page Controller - SSR-rendered pages
 *
 * Use @SsrController() to mark a class as an SSR controller.
 * The return value of each method becomes the context passed to React.
 *
 * The `defaults` option allows you to set common metadata for all routes
 * in this controller, which can be overridden by individual @Ssr() decorators.
 * 
 * SSR routes support @UseGuards(), @UseMiddleware(), and @UseInterceptors()
 * decorators just like regular controllers.
 */
@SsrController({
  defaults: {
    og: {
      siteName: 'Rikta App',
      type: 'website',
    },
    head: [
      Head.meta('author', 'Your Name'),
    ],
  },
})
export class PageController {
  /**
   * Home page
   * Uses OptionalAuthGuard to detect logged-in users without blocking access
   */
  @Get('/')
  @UseGuards(OptionalAuthGuard)
  @Ssr({
    title: 'Welcome to Rikta',
    description: 'A fullstack TypeScript framework with SSR',
    og: {
      title: 'Welcome to Rikta',
      description: 'Build fullstack TypeScript apps with ease',
    },
  })
  home(@Req() request: FastifyRequest) {
    const user = (request as any).user;
    return {
      page: 'home',
      user: user?.name || 'Guest',
      isAuthenticated: !!user?.authenticated,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Item detail page - Dynamic route with parameter
   * Inherits og and head from controller defaults
   */
  @Get('/item/:id')
  @Ssr({
    title: 'Item Details',
    description: 'View item details',
  })
  itemDetail(@Param('id') id: string) {
    // Simulate fetching data from database
    const items: Record<string, { id: string; title: string; description: string; price: number; category: string }> = {
      '1': { 
        id: '1', 
        title: 'Wireless Headphones', 
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
        price: 299.99,
        category: 'Electronics'
      },
      '2': { 
        id: '2', 
        title: 'Smart Watch', 
        description: 'Advanced fitness tracker with heart rate monitoring and GPS.',
        price: 399.99,
        category: 'Wearables'
      },
      '3': { 
        id: '3', 
        title: 'Laptop Stand', 
        description: 'Ergonomic aluminum laptop stand with adjustable height.',
        price: 49.99,
        category: 'Accessories'
      },
    };

    const item = items[id];

    return {
      page: 'item',
      item: item || null,
      notFound: !item,
    };
  }
}

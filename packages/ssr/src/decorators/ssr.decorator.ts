import 'reflect-metadata';
import { SSR_ROUTE_METADATA } from './constants.js';

/**
 * Head tag definition for SSR pages
 */
export interface HeadTag {
  /**
   * Tag name (e.g., 'meta', 'link', 'script')
   */
  tag: string;
  
  /**
   * Tag attributes
   */
  attrs: Record<string, string | boolean>;
  
  /**
   * Inner content (for script, style, etc.)
   */
  children?: string;
}

/**
 * SSR route options for method decorator
 */
export interface SsrRouteOptions {
  /**
   * Title for the page (used in <title> tag)
   */
  title?: string;

  /**
   * Meta description for SEO
   */
  description?: string;

  /**
   * Open Graph metadata
   */
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };

  /**
   * Twitter Card metadata
   */
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
  };

  /**
   * Canonical URL
   */
  canonical?: string;

  /**
   * Robots directive
   */
  robots?: string;

  /**
   * Additional head tags (meta, link, script, etc.)
   * 
   * @example
   * ```typescript
   * head: [
   *   { tag: 'meta', attrs: { name: 'author', content: 'John Doe' } },
   *   { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico' } },
   *   { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(schema) },
   * ]
   * ```
   */
  head?: HeadTag[];

  /**
   * Cache control settings
   */
  cache?: {
    /**
     * Cache duration in seconds
     */
    maxAge?: number;

    /**
     * Enable stale-while-revalidate
     */
    staleWhileRevalidate?: number;
  };
}

/**
 * SSR route metadata stored per method
 */
export interface SsrRouteMetadata {
  enabled: boolean;
  options: SsrRouteOptions;
}

/**
 * @Ssr() decorator
 *
 * Marks a route method as SSR-rendered.
 * The return value of the method becomes the context passed to the SSR template.
 *
 * This decorator can be used on both regular @Controller() and @SsrController() classes.
 * - On @SsrController: All methods are SSR by default, @Ssr() allows customization
 * - On @Controller: Use @Ssr() to make specific routes SSR-rendered
 *
 * @example
 * ```typescript
 * @Controller()
 * class MixedController {
 *   @Get('/api/users')
 *   getUsers() {
 *     return [{ id: 1, name: 'John' }]; // Returns JSON
 *   }
 *
 *   @Get('/users')
 *   @Ssr({ title: 'Users List' })
 *   usersPage() {
 *     return { users: this.users }; // Returns SSR HTML
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * @SsrController()
 * class PageController {
 *   @Get('/')
 *   @Ssr({
 *     title: 'Home Page',
 *     description: 'Welcome to our site',
 *     cache: { maxAge: 60, staleWhileRevalidate: 120 }
 *   })
 *   home() {
 *     return { featured: this.getFeatured() };
 *   }
 * }
 * ```
 */
export function Ssr(options: SsrRouteOptions = {}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const metadata: SsrRouteMetadata = {
      enabled: true,
      options,
    };

    Reflect.defineMetadata(SSR_ROUTE_METADATA, metadata, target.constructor, propertyKey);

    return descriptor;
  };
}

/**
 * Check if a method is decorated with @Ssr()
 */
export function isSsrRoute(target: Function, propertyKey: string | symbol): boolean {
  return Reflect.hasMetadata(SSR_ROUTE_METADATA, target, propertyKey);
}

/**
 * Get SSR route metadata for a method
 */
export function getSsrRouteMetadata(
  target: Function,
  propertyKey: string | symbol
): SsrRouteMetadata | undefined {
  return Reflect.getMetadata(SSR_ROUTE_METADATA, target, propertyKey);
}

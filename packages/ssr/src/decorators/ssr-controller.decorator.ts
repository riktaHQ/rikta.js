import 'reflect-metadata';
import {
  SSR_CONTROLLER_METADATA,
  SSR_OPTIONS_METADATA,
} from './constants.js';
import type { SsrOptions } from '../types.js';
import type { SsrRouteOptions } from './ssr.decorator.js';

// Import core decorators constants with Symbol.for for cross-package sharing
const CONTROLLER_METADATA = Symbol.for('rikta:controller:metadata');
const INJECTABLE_METADATA = Symbol.for('rikta:injectable:metadata');

/**
 * SSR Controller options
 */
export interface SsrControllerOptions extends Partial<SsrOptions> {
  /**
   * Route prefix for all SSR routes in this controller
   * @default ''
   */
  prefix?: string;

  /**
   * Default SSR route options for all routes in this controller.
   * These values will be merged with individual @Ssr() decorator options,
   * where the @Ssr() options take precedence.
   *
   * @example
   * ```typescript
   * @SsrController({
   *   defaults: {
   *     og: { siteName: 'My App', type: 'website' },
   *     head: [Head.meta('author', 'John Doe')],
   *   }
   * })
   * class PageController {
   *   @Get('/')
   *   @Ssr({ title: 'Home' }) // Will inherit og and head from defaults
   *   home() { return {}; }
   * }
   * ```
   */
  defaults?: SsrRouteOptions;
}

/**
 * SSR Controller metadata stored in Reflect
 */
export interface SsrControllerMetadata {
  prefix: string;
  ssrOptions: Partial<SsrOptions>;
  defaults: SsrRouteOptions;
}

/**
 * @SsrController() decorator
 *
 * Marks a class as an SSR controller that handles server-side rendered routes.
 * SSR Controllers automatically:
 * - Render the return value as context for the SSR template
 * - Return HTML responses instead of JSON
 * - Can override global SSR options per-controller
 *
 * @example
 * ```typescript
 * @SsrController()
 * class PageController {
 *   @Get('/')
 *   async home() {
 *     return {
 *       title: 'Welcome',
 *       posts: await this.postService.getLatest(),
 *     };
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With custom SSR options
 * @SsrController({
 *   prefix: '/app',
 *   entryServer: './src/admin-entry-server.tsx',
 * })
 * class AdminPagesController {
 *   @Get('/dashboard')
 *   dashboard() {
 *     return { page: 'admin-dashboard' };
 *   }
 * }
 * ```
 */
export function SsrController(options?: string | SsrControllerOptions): ClassDecorator {
  return (target: Function) => {
    // Handle both string prefix and options object
    let prefix = '';
    let ssrOptions: Partial<SsrOptions> = {};
    let defaults: SsrRouteOptions = {};

    if (typeof options === 'string') {
      prefix = options;
    } else if (options) {
      prefix = options.prefix ?? '';
      defaults = options.defaults ?? {};
      // Extract SSR options (everything except prefix and defaults)
      const { prefix: _, defaults: __, ...rest } = options;
      ssrOptions = rest;
    }

    // Normalize prefix (ensure it starts with / if not empty)
    const normalizedPrefix = prefix
      ? prefix.startsWith('/')
        ? prefix
        : `/${prefix}`
      : '';

    // Store SSR controller metadata
    const metadata: SsrControllerMetadata = {
      prefix: normalizedPrefix,
      ssrOptions,
      defaults,
    };
    Reflect.defineMetadata(SSR_CONTROLLER_METADATA, metadata, target);

    // Also store as regular controller for router compatibility
    Reflect.defineMetadata(CONTROLLER_METADATA, { prefix: normalizedPrefix }, target);

    // Mark as injectable
    Reflect.defineMetadata(INJECTABLE_METADATA, { scope: 'singleton' }, target);

    // Try to register in DI container and registry if available
    // We use dynamic import to avoid hard dependency on @riktajs/core
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { container, registry } = require('@riktajs/core');
      container.register(target as new (...args: unknown[]) => unknown, { scope: 'singleton' });
      registry.registerController(target as new (...args: unknown[]) => unknown);
    } catch {
      // Core not available, will be registered manually
    }
  };
}

/**
 * Check if a class is decorated with @SsrController()
 */
export function isSsrController(target: Function): boolean {
  return Reflect.hasMetadata(SSR_CONTROLLER_METADATA, target);
}

/**
 * Get SSR controller metadata from a class
 */
export function getSsrControllerMetadata(target: Function): SsrControllerMetadata | undefined {
  return Reflect.getMetadata(SSR_CONTROLLER_METADATA, target);
}

/**
 * Get SSR options from a class (controller level)
 */
export function getSsrOptions(target: Function): Partial<SsrOptions> | undefined {
  return Reflect.getMetadata(SSR_OPTIONS_METADATA, target);
}

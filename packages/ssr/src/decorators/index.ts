/**
 * SSR Decorators
 *
 * Provides decorator-based API for defining SSR routes in Rikta.
 *
 * @example
 * ```typescript
 * import { SsrController, Ssr } from '@riktajs/ssr';
 * import { Get } from '@riktajs/core';
 *
 * @SsrController()
 * class PageController {
 *   @Get('/')
 *   @Ssr({ title: 'Home' })
 *   home() {
 *     return { message: 'Welcome!' };
 *   }
 * }
 * ```
 */

export * from './constants.js';
export * from './ssr-controller.decorator.js';
export * from './ssr.decorator.js';

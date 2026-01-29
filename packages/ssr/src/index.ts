/**
 * @riktajs/ssr
 *
 * Server-Side Rendering (SSR) support for Rikta framework.
 * Enables rendering React, Vue, and other frontend frameworks on the server.
 *
 * @example Basic Plugin Usage
 * ```typescript
 * import { Rikta } from '@riktajs/core';
 * import { ssrPlugin } from '@riktajs/ssr';
 *
 * const app = await Rikta.create({ port: 3000 });
 *
 * await app.server.register(ssrPlugin, {
 *   root: process.cwd(),
 *   entryServer: './src/entry-server.tsx',
 *   template: './index.html',
 * });
 *
 * app.server.get('*', async (request, reply) => {
 *   const html = await app.server.ssr.render(request.url);
 *   return reply.type('text/html').send(html);
 * });
 * ```
 *
 * @example Decorator-Based Controllers
 * ```typescript
 * import { Rikta, Get, Param } from '@riktajs/core';
 * import { ssrPlugin, SsrController, Ssr } from '@riktajs/ssr';
 *
 * @SsrController()
 * class PageController {
 *   @Get('/')
 *   @Ssr({ title: 'Home Page' })
 *   home() {
 *     return { message: 'Welcome!' };
 *   }
 *
 *   @Get('/users/:id')
 *   @Ssr({ title: 'User Profile' })
 *   async userProfile(@Param('id') id: string) {
 *     const user = await this.userService.find(id);
 *     return { user };
 *   }
 * }
 *
 * const app = await Rikta.create({ port: 3000 });
 * await app.server.register(ssrPlugin, { ... });
 * app.server.registerSsrController(PageController);
 * ```
 */

// Export plugin
export { ssrPlugin, default } from './plugin.js';

// Export service and router
export { SsrService } from './ssr.service.js';
export { SsrRouter } from './ssr-router.js';

// Export decorators
export {
  SsrController,
  isSsrController,
  getSsrControllerMetadata,
  getSsrOptions,
} from './decorators/ssr-controller.decorator.js';
export type { SsrControllerOptions, SsrControllerMetadata } from './decorators/ssr-controller.decorator.js';

export {
  Ssr,
  isSsrRoute,
  getSsrRouteMetadata,
} from './decorators/ssr.decorator.js';
export type { SsrRouteOptions, SsrRouteMetadata, HeadTag } from './decorators/ssr.decorator.js';

// Export head builder utilities
export { HeadBuilder, buildHead, Head } from './head-builder.js';

// Export constants
export {
  SSR_CONTROLLER_METADATA,
  SSR_ROUTE_METADATA,
  SSR_OPTIONS_METADATA,
} from './decorators/constants.js';

// Export types
export type {
  SsrOptions,
  SsrRenderContext,
  SsrRenderResult,
  SsrExtendedContext,
  Constructor,
} from './types.js';

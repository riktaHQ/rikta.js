import fp from 'fastify-plugin';
import { resolve } from 'node:path';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SsrService } from './ssr.service.js';
import { SsrRouter } from './ssr-router.js';
import type { SsrOptions, Constructor } from './types.js';

// Augment FastifyInstance to include ssr
declare module 'fastify' {
  interface FastifyInstance {
    /**
     * SSR service for server-side rendering
     */
    ssr: SsrService;

    /**
     * SSR router for registering SSR controllers
     */
    ssrRouter: SsrRouter;

    /**
     * Register an SSR controller decorated with @SsrController()
     */
    registerSsrController: (controller: Constructor, silent?: boolean) => void;
  }
}

/**
 * SSR Plugin for Fastify/Rikta
 *
 * Registers the SSR service and sets up Vite middleware for development.
 *
 * @example
 * ```typescript
 * import { ssrPlugin } from '@riktajs/ssr';
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
 */
const ssrPluginImpl: FastifyPluginAsync<SsrOptions> = async (
  fastify: FastifyInstance,
  options: SsrOptions
) => {
  // Create and initialize SSR service
  const ssrService = new SsrService();
  await ssrService.init(options);

  // Decorate fastify with ssr service
  fastify.decorate('ssr', ssrService);

  // In development mode, register Vite middleware
  if (ssrService.isDev()) {
    const middlewares = ssrService.getMiddlewares();

    if (middlewares) {
      // Register @fastify/middie to handle connect-style middleware
      try {
        const middie = await import('@fastify/middie');
        await fastify.register(middie.default);

        // Use Vite's dev middleware - middie adds use method
        const fastifyWithMiddie = fastify as typeof fastify & { use?: (handler: unknown) => void };
        if (typeof fastifyWithMiddie.use === 'function') {
          fastifyWithMiddie.use(middlewares);
        }
      } catch (error) {
        // Middie might fail in test environments, continue without middleware
        fastify.log.warn?.(`Could not setup middleware: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    // In production, serve static assets
    const resolvedOptions = ssrService.getOptions();
    if (resolvedOptions) {
      const clientPath = resolve(resolvedOptions.root, resolvedOptions.buildDir, 'client');
      const assetsPath = resolve(clientPath, 'assets');

      try {
        const fastifyStatic = await import('@fastify/static');
        // Serve assets from /assets/ path
        await fastify.register(fastifyStatic.default, {
          root: assetsPath,
          prefix: '/assets/',
          decorateReply: false,
        });
      } catch (error) {
        // Static plugin might already be registered or path doesn't exist
        fastify.log.warn(`Could not register static plugin: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Create SSR router for decorator-based controllers
  // Pass container for DI support (guards, middleware, interceptors)
  const ssrRouter = new SsrRouter(fastify, ssrService, options, options.container);
  fastify.decorate('ssrRouter', ssrRouter);

  // Convenience method to register SSR controllers
  fastify.decorate('registerSsrController', (controller: Constructor, silent?: boolean) => {
    ssrRouter.registerController(controller, silent);
  });

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    await ssrService.close();
  });
};

/**
 * SSR Plugin with proper encapsulation
 */
export const ssrPlugin = fp(ssrPluginImpl, {
  name: '@riktajs/ssr',
  fastify: '5.x',
});

export default ssrPlugin;

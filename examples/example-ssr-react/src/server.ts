import { Rikta } from '@riktajs/core';
import { ssrPlugin } from '@riktajs/ssr';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ApiController, HealthController } from './api/index.js';
import { PageController } from './pages/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

// =============================================================================
// Application Bootstrap
// =============================================================================

async function bootstrap() {
  // Create Rikta application with API controllers
  const app = await Rikta.create({
    port: 3000,
    host: '0.0.0.0',
    controllers: [ApiController, HealthController],
  });

  // Register SSR plugin with container for guards/middleware/interceptors support
  await app.server.register(ssrPlugin, {
    root: isDev ? resolve(__dirname, '..') : __dirname,
    entryServer: isDev ? './src/entry-server.tsx' : './server/entry-server.js',
    template: isDev ? './index.html' : './client/index.html',
    buildDir: isDev ? 'dist' : '.',
    dev: isDev,
    // Pass the container to enable @UseGuards, @UseMiddleware, @UseInterceptors on SSR routes
    container: app.container,
  });

  // Register SSR controller (separate from regular controllers)
  app.server.registerSsrController(PageController);

  // Start the server
  await app.listen();

  console.log(`
  🚀 Rikta SSR React Example (Decorator-Based)

  Server running at: http://localhost:3000

  Features:
  - SSR-rendered React pages using @SsrController() and @Ssr() decorators
  - Hot Module Replacement (HMR) in development
  - API routes at /api/* using @Controller()
  - Health check at /health
  - Guards, Middleware, and Interceptors support on SSR routes

  SSR Pages:
  - http://localhost:3000/           (Home page - uses OptionalAuthGuard)
  - http://localhost:3000/about      (About page)
  - http://localhost:3000/user/1     (User profile)
  - http://localhost:3000/search?q=rikta (Search page)
  - http://localhost:3000/dashboard  (Protected - requires auth header)

  API Endpoints:
  - http://localhost:3000/api/hello  (JSON response)
  - http://localhost:3000/api/data   (Data endpoint)
  - http://localhost:3000/api/users/1 (Get user by ID)
  - http://localhost:3000/health     (Health check)

  Testing Guards:
  - Dashboard requires 'x-auth-token' header:
    curl -H "x-auth-token: demo" http://localhost:3000/dashboard
  `);
}

bootstrap().catch(console.error);

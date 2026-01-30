import { Rikta } from '@riktajs/core';
import { ssrPlugin } from '@riktajs/ssr';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ApiController } from './api/index.js';
import { PageController } from './pages/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

// =============================================================================
// Application Bootstrap
// =============================================================================

async function bootstrap() {
  const app = await Rikta.create({
    port: 3000,
    host: '0.0.0.0',
    controllers: [ApiController],
  });

  // Register SSR plugin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (app.server.register as any)(ssrPlugin, {
    root: isDev ? resolve(__dirname, '..') : __dirname,
    entryServer: isDev ? './src/entry-server.tsx' : './server/entry-server.js',
    template: isDev ? './index.html' : './client/index.html',
    buildDir: isDev ? 'dist' : '.',
    dev: isDev,
  });

  // Register SSR controller
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app.server as any).registerSsrController(PageController);

  await app.listen();

  console.log(`
  🚀 Rikta Fullstack React App

  Server: http://localhost:3000

  Features:
  - SSR with React 19 and Vite
  - Decorator-based routing (@SsrController, @Ssr)
  - API routes with @Controller
  - Hot Module Replacement (HMR) in dev

  Routes:
  - http://localhost:3000/          (SSR Home Page)
  - http://localhost:3000/api/hello (API Endpoint)
  - http://localhost:3000/api/data  (API Endpoint)
  `);
}

bootstrap().catch(console.error);

# @riktajs/ssr

Server-Side Rendering (SSR) support for Rikta framework. Enable your Rikta application to render React, Vue, and other frontend frameworks on the server, making it a fullstack framework.

## Features

- 🚀 **Vite-powered** - Leverages Vite for blazing fast HMR and builds
- ⚛️ **React & Vue support** - First-class support for React and Vue frameworks
- 🔥 **Hot Module Replacement** - Full HMR support in development mode
- 📦 **Zero Config** - Works out of the box with sensible defaults
- 🛠️ **Fastify Integration** - Seamlessly integrates with Fastify server
- 💎 **TypeScript Ready** - Full TypeScript support with proper types

## Installation

```bash
# Using npm
npm install @riktajs/ssr vite

# Using pnpm
pnpm add @riktajs/ssr vite

# For React
npm install react react-dom
npm install -D @vitejs/plugin-react

# For Vue
npm install vue
npm install -D @vitejs/plugin-vue
```

## Quick Start

### 1. Create your Vite config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        client: './src/entry-client.tsx',
      },
    },
  },
  ssr: {
    noExternal: ['@riktajs/core'],
  },
});
```

### 2. Create entry files

**Server Entry (`src/entry-server.tsx`):**

```tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';

export function render(url: string, context: Record<string, any> = {}) {
  const html = renderToString(<App url={url} context={context} />);
  return html;
}
```

**Client Entry (`src/entry-client.tsx`):**

```tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

hydrateRoot(document.getElementById('app')!, <App />);
```

### 3. Register the SSR plugin

```typescript
import { Rikta } from '@riktajs/core';
import { ssrPlugin } from '@riktajs/ssr';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  // Register SSR plugin
  await app.server.register(ssrPlugin, {
    root: resolve(__dirname, '..'),
    entryServer: './src/entry-server.tsx',
    template: './index.html',
  });

  // Serve all routes with SSR
  app.server.get('*', async (request, reply) => {
    const html = await app.server.ssr.render(request.url, {
      user: request.user,
    });
    return reply.type('text/html').send(html);
  });

  await app.listen();
  console.log('🚀 Server running at http://localhost:3000');
}

bootstrap();
```

## Configuration

### SSR Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `process.cwd()` | Project root directory |
| `entryServer` | `string` | `'./src/entry-server'` | Path to server entry file |
| `template` | `string` | `'./index.html'` | Path to HTML template |
| `dev` | `boolean` | `auto` | Enable development mode (auto-detected from NODE_ENV) |
| `buildDir` | `string` | `'dist'` | Build output directory |
| `ssrManifest` | `string` | `'ssr-manifest.json'` | SSR manifest filename |

### HTML Template

Your `index.html` should include placeholders for SSR content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Rikta App</title>
  <!--head-tags-->
</head>
<body>
  <div id="app"><!--ssr-outlet--></div>
  <script type="module" src="/src/entry-client.tsx"></script>
</body>
</html>
```

## API Reference

### Decorators

#### `@SsrController(options?)`

Marks a class as an SSR controller with optional route prefix and default options.

```typescript
import { SsrController, Ssr, Get, Head } from '@riktajs/ssr';

@SsrController({
  prefix: '/pages',
  defaults: {
    og: { siteName: 'My Site', type: 'website' },
    twitter: { site: '@mysite' },
    head: [Head.meta('author', 'Your Name')],
  },
})
export class PageController {
  @Get('/')
  @Ssr({ title: 'Home Page', description: 'Welcome to our site' })
  home() {
    return { page: 'home', features: ['fast', 'secure'] };
  }
}
```

The `defaults` option allows setting common metadata for all routes in the controller. Individual `@Ssr()` decorators can override or extend these defaults:
- Simple properties: route overrides defaults
- Nested objects (`og`, `twitter`, `cache`): merged (route takes precedence)
- Arrays (`head`): concatenated

#### `@Ssr(options)`

Configures SSR metadata for a route handler.

```typescript
@Ssr({
  title: 'Page Title',
  description: 'SEO description',
  og: { image: '/og-image.png', type: 'website' },
  twitter: { card: 'summary_large_image' },
  canonical: 'https://example.com/page',
  robots: 'index, follow',
  cache: { maxAge: 60, staleWhileRevalidate: 120 },
})
```

### Client-Side Navigation Data Fetching

When using `@riktajs/react` with SSR, the framework supports automatic data fetching for client-side navigation. When a client navigates to a new page, the `RiktaProvider` fetches the SSR data via a special header:

```
X-Rikta-Data: 1
```

The server responds with JSON instead of full HTML:

```json
{
  "data": { "page": "about", "features": [...] },
  "url": "/about",
  "title": "About - My App",
  "description": "Learn more about our company"
}
```

This enables:
- **Seamless navigation** without page reloads
- **Consistent data** between SSR and client navigation
- **SEO metadata** passed to client for title updates

### `ssrPlugin`

Fastify plugin that enables SSR capabilities.

```typescript
import { ssrPlugin, SsrOptions } from '@riktajs/ssr';

await app.server.register(ssrPlugin, options);
```

### SSR Plugin Options

| Option | Type | Description |
|--------|------|-------------|
| `root` | `string` | Project root directory |
| `entryServer` | `string` | Path to server entry file |
| `template` | `string` | Path to HTML template |
| `dev` | `boolean` | Enable development mode |
| `buildDir` | `string` | Build output directory |
| `container` | `Container` | DI container for guards, middleware, interceptors support |

## Guards, Middleware, and Interceptors

SSR routes fully support Rikta's decorator-based guards, middleware, and interceptors. To enable this functionality, pass the `container` option when registering the plugin:

```typescript
const app = await Rikta.create({
  port: 3000,
  controllers: [ApiController],
});

await app.server.register(ssrPlugin, {
  root: resolve(__dirname, '..'),
  entryServer: './src/entry-server.tsx',
  template: './index.html',
  // Enable guards, middleware, interceptors on SSR routes
  container: app.container,
});

app.server.registerSsrController(PageController);
```

### Using Guards on SSR Routes

```typescript
import { Get, UseGuards, Req } from '@riktajs/core';
import type { FastifyRequest } from 'fastify';
import { SsrController, Ssr } from '@riktajs/ssr';
import { AuthGuard } from './guards/auth.guard.js';

@SsrController()
export class PageController {
  // Public page - no guard
  @Get('/')
  @Ssr({ title: 'Home' })
  home() {
    return { page: 'home' };
  }

  // Protected page - requires authentication
  @Get('/dashboard')
  @UseGuards(AuthGuard)
  @Ssr({ title: 'Dashboard', robots: 'noindex' })
  dashboard(@Req() request: FastifyRequest) {
    const user = (request as any).user;
    return {
      page: 'dashboard',
      user: { id: user.id, name: user.name },
    };
  }
}
```

### Example Guard Implementation

```typescript
import type { Guard, ExecutionContext } from '@riktajs/core';

export class AuthGuard implements Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const authToken = request.headers['x-auth-token'];
    
    if (authToken) {
      // Validate token and attach user to request
      request.user = { id: 'user-123', name: 'John Doe' };
      return true;
    }
    
    return false; // Returns 403 Forbidden
  }
}
```

### Using Middleware on SSR Routes

```typescript
import { Get, UseMiddleware } from '@riktajs/core';
import { SsrController, Ssr } from '@riktajs/ssr';
import { LoggingMiddleware } from './middleware/logging.middleware.js';

@SsrController()
export class PageController {
  @Get('/tracked')
  @UseMiddleware(LoggingMiddleware)
  @Ssr({ title: 'Tracked Page' })
  trackedPage() {
    return { page: 'tracked' };
  }
}
```

### Using Interceptors on SSR Routes

```typescript
import { Get, UseInterceptors } from '@riktajs/core';
import { SsrController, Ssr } from '@riktajs/ssr';
import { CacheInterceptor } from './interceptors/cache.interceptor.js';

@SsrController()
export class PageController {
  @Get('/cached')
  @UseInterceptors(CacheInterceptor)
  @Ssr({ title: 'Cached Page' })
  cachedPage() {
    return { page: 'cached', timestamp: Date.now() };
  }
}
```

### `SsrService`

Injectable service for programmatic SSR control.

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { SsrService } from '@riktajs/ssr';

@Injectable()
class MyController {
  @Autowired()
  private ssr!: SsrService;

  async render(url: string) {
    return this.ssr.render(url, { data: 'context' });
  }
}
```

### Methods

#### `render(url: string, context?: Record<string, any>): Promise<string>`

Renders the application for the given URL and returns the full HTML.

#### `transformIndexHtml(url: string, html: string): Promise<string>`

Transforms the HTML template with Vite's transformations (in dev mode).

## Production Build

### 1. Build for production

```bash
# Build client
vite build --outDir dist/client

# Build server
vite build --outDir dist/server --ssr src/entry-server.tsx
```

### 2. Start production server

```typescript
const app = await Rikta.create({ port: 3000 });

await app.server.register(ssrPlugin, {
  root: resolve(__dirname, '..'),
  entryServer: './dist/server/entry-server.js',
  template: './dist/client/index.html',
  dev: false,
  buildDir: 'dist/client',
});
```

## Vue Support

For Vue applications, the setup is similar:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

```typescript
// src/entry-server.ts
import { createApp } from './main';
import { renderToString } from 'vue/server-renderer';

export async function render(url: string, context: Record<string, any> = {}) {
  const { app } = createApp();
  const html = await renderToString(app);
  return html;
}
```

## License

MIT

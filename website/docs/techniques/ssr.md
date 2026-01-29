---
title: Server-Side Rendering (SSR)
sidebar_label: SSR
description: Enable fullstack applications with React, Vue, and other frontend frameworks using @riktajs/ssr
---

# Server-Side Rendering (SSR)

The `@riktajs/ssr` package enables Rikta to serve server-rendered frontend applications, transforming it into a true fullstack framework. Powered by Vite, it supports React, Vue, and other modern frontend frameworks with full Hot Module Replacement (HMR) in development.

## Overview

`@riktajs/ssr` provides:

- **Vite Integration** - Leverages Vite for blazing fast development and optimized production builds
- **React & Vue Support** - First-class support for popular frontend frameworks
- **Hot Module Replacement** - Full HMR support in development mode
- **Seamless Fastify Integration** - Works naturally with Rikta's Fastify-based architecture
- **TypeScript Ready** - Full TypeScript support with proper types
- **Zero Config** - Sensible defaults that work out of the box

## Installation

```bash
# Using npm
npm install @riktajs/ssr vite

# Using pnpm
pnpm add @riktajs/ssr vite

# For React applications
npm install react react-dom
npm install -D @vitejs/plugin-react @types/react @types/react-dom

# For Vue applications
npm install vue
npm install -D @vitejs/plugin-vue
```

## Quick Start

### 1. Create your Vite configuration

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        client: resolve(__dirname, 'index.html'),
      },
    },
  },
  ssr: {
    noExternal: ['@riktajs/core'],
  },
});
```

### 2. Create the HTML template

```html title="index.html"
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

### 3. Create entry files

**Server Entry (`src/entry-server.tsx`):**

```tsx title="src/entry-server.tsx"
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';

export function render(url: string, context: Record<string, unknown> = {}) {
  const html = renderToString(
    <App url={url} serverData={context} />
  );
  
  return {
    html,
    head: `<meta name="description" content="My Rikta app" />`,
  };
}
```

**Client Entry (`src/entry-client.tsx`):**

```tsx title="src/entry-client.tsx"
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('app');

if (container) {
  hydrateRoot(
    container,
    <App url={window.location.pathname} />
  );
}
```

### 4. Create your React App

```tsx title="src/App.tsx"
import React, { useState } from 'react';

interface AppProps {
  url?: string;
  serverData?: Record<string, unknown>;
}

export function App({ url = '/', serverData = {} }: AppProps) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Welcome to Rikta SSR</h1>
      <p>Current route: {url}</p>
      
      <div>
        <p>Count: {count}</p>
        <button onClick={() => setCount(c => c + 1)}>Increment</button>
      </div>
      
      <pre>{JSON.stringify(serverData, null, 2)}</pre>
    </div>
  );
}
```

### 5. Register the SSR plugin

```typescript title="src/server.ts"
import { Rikta, Controller, Get } from '@riktajs/core';
import { ssrPlugin } from '@riktajs/ssr';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API Controller
@Controller('/api')
class ApiController {
  @Get('/hello')
  hello() {
    return { message: 'Hello from Rikta!' };
  }
}

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  // Register SSR plugin
  await app.server.register(ssrPlugin, {
    root: resolve(__dirname, '..'),
    entryServer: './src/entry-server.tsx',
    template: './index.html',
    dev: process.env.NODE_ENV !== 'production',
  });

  // Handle all non-API routes with SSR
  app.server.get('*', async (request, reply) => {
    if (request.url.startsWith('/api')) {
      return; // Let Rikta handle API routes
    }

    const html = await app.server.ssr.render(request.url, {
      user: null,
      timestamp: new Date().toISOString(),
    });

    return reply.type('text/html').send(html);
  });

  await app.listen();
  console.log('🚀 Server running at http://localhost:3000');
}

bootstrap();
```

## Configuration Options

The `ssrPlugin` accepts the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `process.cwd()` | Project root directory where vite.config.ts is located |
| `entryServer` | `string` | `'./src/entry-server'` | Path to server entry file (relative to root) |
| `template` | `string` | `'./index.html'` | Path to HTML template (relative to root) |
| `dev` | `boolean` | `auto` | Enable development mode (auto-detected from NODE_ENV) |
| `buildDir` | `string` | `'dist'` | Build output directory (relative to root) |
| `ssrManifest` | `string` | `'.vite/ssr-manifest.json'` | SSR manifest filename |
| `viteConfig` | `object` | `{}` | Custom Vite configuration overrides |

## Server Entry Return Types

The `render` function in your server entry can return either a string or an object:

```typescript
// Simple string return
export function render(url: string) {
  return '<div>Hello World</div>';
}

// Object return with head tags
export function render(url: string, context: Record<string, unknown>) {
  return {
    html: '<div>Hello World</div>',
    head: '<meta name="description" content="..." />',
    preloadLinks: '<link rel="modulepreload" href="..." />',
  };
}
```

## HTML Template Placeholders

Your `index.html` template can include these placeholders:

- `<!--ssr-outlet-->` or `<!--app-->` - Where the rendered HTML will be inserted
- `<!--head-tags-->` - Where head tags from render result will be inserted
- `<!--preload-links-->` - Where preload links will be inserted

## API Reference

### ssrPlugin

Fastify plugin that enables SSR capabilities.

```typescript
import { ssrPlugin, SsrOptions } from '@riktajs/ssr';

await app.server.register(ssrPlugin, options);
```

### SsrService Methods

The plugin adds an `ssr` property to the Fastify instance:

#### render(url, context?)

Renders the application for the given URL.

```typescript
const html = await app.server.ssr.render('/about', {
  user: currentUser,
  data: additionalData,
});
```

#### transformIndexHtml(url, html)

Transforms HTML with Vite's transformations (dev mode only).

```typescript
const transformedHtml = await app.server.ssr.transformIndexHtml('/page', rawHtml);
```

#### isDev()

Returns whether the service is in development mode.

```typescript
if (app.server.ssr.isDev()) {
  // Development-specific logic
}
```

## Vue Support

For Vue applications, the setup is similar with Vue-specific entry files:

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

```typescript title="src/entry-server.ts"
import { createApp } from './main';
import { renderToString } from 'vue/server-renderer';

export async function render(url: string, context: Record<string, unknown>) {
  const { app, router } = createApp();
  
  await router.push(url);
  await router.isReady();
  
  const html = await renderToString(app);
  return { html };
}
```

```typescript title="src/entry-client.ts"
import { createApp } from './main';

const { app, router } = createApp();

router.isReady().then(() => {
  app.mount('#app');
});
```

## Production Build

### Build Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist/client",
    "build:server": "vite build --outDir dist/server --ssr src/entry-server.tsx",
    "start": "NODE_ENV=production node dist/server.js"
  }
}
```

### Production Configuration

```typescript
await app.server.register(ssrPlugin, {
  root: resolve(__dirname, '..'),
  entryServer: './dist/server/entry-server.js',
  template: './dist/client/index.html',
  dev: false,
  buildDir: 'dist/client',
});
```

## CLI Template

You can scaffold a new fullstack React application using the Rikta CLI:

```bash
# Create a new fullstack React project
npx @riktajs/cli new my-app --template fullstack-react

# Or use interactive selection
npx @riktajs/cli new my-app
```

The template includes:
- React 19 with SSR support
- Vite configuration
- TypeScript setup
- Example API routes
- Development and production scripts

## Best Practices

### 1. Separate API Routes from SSR

Keep your API routes clearly separated from SSR routes:

```typescript
app.server.get('*', async (request, reply) => {
  // Skip API and static routes
  if (request.url.startsWith('/api') || 
      request.url.startsWith('/static')) {
    return;
  }
  
  const html = await app.server.ssr.render(request.url);
  return reply.type('text/html').send(html);
});
```

### 2. Error Handling

Always wrap SSR rendering in try-catch:

```typescript
app.server.get('*', async (request, reply) => {
  try {
    const html = await app.server.ssr.render(request.url);
    return reply.type('text/html').send(html);
  } catch (error) {
    console.error('SSR Error:', error);
    return reply.status(500).send('Internal Server Error');
  }
});
```

### 3. Pass Server Data

Use the context parameter to pass server-side data to your components:

```typescript
const html = await app.server.ssr.render(request.url, {
  user: request.user,
  session: request.session,
  env: process.env.NODE_ENV,
});
```

### 4. Optimize for Production

Enable proper caching headers in production:

```typescript
app.server.get('*', async (request, reply) => {
  const html = await app.server.ssr.render(request.url);
  
  return reply
    .header('Cache-Control', 'public, max-age=3600')
    .type('text/html')
    .send(html);
});
```

## Troubleshooting

### Module not found errors

Ensure your `vite.config.ts` includes the `ssr.noExternal` option for any packages that need to be bundled:

```typescript
ssr: {
  noExternal: ['@riktajs/core', 'other-package'],
}
```

### HMR not working

Make sure you're running in development mode and the Vite dev server is properly initialized:

```typescript
await app.server.register(ssrPlugin, {
  // ...
  dev: true, // Explicitly enable dev mode
});
```

### Build errors

Verify that both client and server builds complete successfully:

```bash
npm run build:client  # Should create dist/client/
npm run build:server  # Should create dist/server/
```

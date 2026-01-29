# Server-Side Rendering (SSR)

This guide covers Server-Side Rendering in Rikta using the `@riktajs/ssr` package, which provides Vite-powered SSR support with decorator-based routing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Decorator-Based SSR](#decorator-based-ssr)
- [Head Management](#head-management)
- [Configuration](#configuration)
- [Production Build](#production-build)
- [API Reference](#api-reference)

## Overview

`@riktajs/ssr` provides:

- **Decorator-Based Routing** - Define SSR routes like API routes
- **Vite Integration** - Blazing fast development with HMR
- **React & Vue Support** - First-class support for popular frameworks
- **Head Management** - Built-in support for meta tags, Open Graph, Twitter Cards
- **TypeScript Ready** - Full TypeScript support
- **Automatic Hydration** - SSR data automatically passed to client

## Installation

```bash
npm install @riktajs/ssr vite react react-dom
npm install -D @vitejs/plugin-react @types/react @types/react-dom
```

## Quick Start

### 1. Create Vite config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  ssr: {
    noExternal: ['@riktajs/core'],
  },
});
```

### 2. Create HTML template

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><!--ssr-title--></title>
  <!--head-tags-->
</head>
<body>
  <div id="app"><!--ssr-outlet--></div>
  <script type="module" src="/src/entry-client.tsx"></script>
</body>
</html>
```

### 3. Create entry files

**Server Entry:**
```tsx
// src/entry-server.tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { HeadBuilder } from '@riktajs/ssr';

export function render(url: string, context: Record<string, unknown> = {}) {
  const html = renderToString(<App url={url} serverData={context} />);

  // Build head tags
  const head = new HeadBuilder();
  const title = (context.title as string) || 'My Rikta App';
  head.title(title);

  if (context.description) {
    head.description(context.description as string);
  }
  if (context.og) head.og(context.og as any);
  if (context.twitter) head.twitter(context.twitter as any);
  if (context.canonical) head.canonical(context.canonical as string);
  if (context.robots) head.robots(context.robots as string);
  if (context.head) head.addTags(context.head as any);

  head.withSsrData(context);
  
  return {
    html,
    title: head.getTitle(),
    head: head.build(),
  };
}
```

**Client Entry:**
```tsx
// src/entry-client.tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

declare global {
  interface Window {
    __SSR_DATA__?: Record<string, unknown>;
  }
}

const container = document.getElementById('app');
const serverData = window.__SSR_DATA__ || {};

if (container) {
  hydrateRoot(
    container,
    <App url={window.location.pathname + window.location.search} serverData={serverData} />
  );
}
```

### 4. Create SSR Controller

```typescript
// src/server.ts
import { Rikta, Controller, Get, Param } from '@riktajs/core';
import { ssrPlugin, SsrController, Ssr, Head } from '@riktajs/ssr';

// API Controller
@Controller('/api')
class ApiController {
  @Get('/hello')
  hello() {
    return { message: 'Hello!' };
  }
}

// SSR Controller
@SsrController()
class PageController {
  @Get('/')
  @Ssr({
    title: 'Home - My App',
    description: 'Welcome to my application',
    og: {
      title: 'Home',
      description: 'Welcome to my application',
      image: '/og-image.png',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Home',
    },
    head: [
      Head.meta('author', 'Your Name'),
      Head.favicon('/favicon.ico'),
    ],
    cache: { maxAge: 60 },
  })
  home() {
    return {
      page: 'home',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/user/:id')
  @Ssr({
    title: 'User Profile',
    description: 'View user profile',
  })
  async userProfile(@Param('id') id: string) {
    const user = await this.userService.find(id);
    return { page: 'user', user };
  }
}

async function bootstrap() {
  const app = await Rikta.create({
    port: 3000,
    controllers: [ApiController],
  });

  await app.server.register(ssrPlugin, {
    root: process.cwd(),
    entryServer: './src/entry-server.tsx',
    template: './index.html',
  });

  // Register SSR controller
  app.server.registerSsrController(PageController);

  await app.listen();
}

bootstrap();
```

## Decorator-Based SSR

### @SsrController()

Marks a class as an SSR controller:

```typescript
@SsrController(options?)
class PageController {
  // ...
}
```

Options:
- `prefix?: string` - URL prefix for all routes
- `ssrOptions?: SsrOptions` - Default SSR options for all routes

### @Ssr()

Configures SSR for a specific route:

```typescript
@Ssr({
  title?: string,
  description?: string,
  og?: OpenGraphOptions,
  twitter?: TwitterCardOptions,
  canonical?: string,
  robots?: string,
  head?: HeadTag[],
  cache?: CacheOptions,
})
```

## Head Management

### Using @Ssr decorator

```typescript
@Ssr({
  title: 'My Page',
  description: 'Page description',
  
  // Open Graph
  og: {
    title: 'OG Title',
    description: 'OG Description',
    image: '/og-image.png',
    url: 'https://example.com/page',
    type: 'website',
    siteName: 'My Site',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    site: '@mysite',
    creator: '@creator',
    title: 'Twitter Title',
    description: 'Twitter Description',
    image: '/twitter-image.png',
  },
  
  // SEO
  canonical: 'https://example.com/page',
  robots: 'index, follow',
  
  // Custom head tags
  head: [
    Head.meta('author', 'John Doe'),
    Head.meta('keywords', 'rikta, ssr, react'),
    Head.link('icon', '/favicon.ico'),
    Head.preload('/font.woff2', 'font', { crossorigin: 'anonymous' }),
    Head.preconnect('https://fonts.googleapis.com'),
    Head.jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'My Page',
    }),
  ],
})
```

### Head Helper API

```typescript
import { Head } from '@riktajs/ssr';

// Meta tags
Head.meta('name', 'content')
Head.property('og:title', 'Title')

// Links
Head.link('rel', 'href', { ...attrs })
Head.favicon('/favicon.ico')
Head.preload('/font.woff2', 'font')
Head.preconnect('https://cdn.com')

// Scripts
Head.script({ type: 'text/javascript' }, 'code')
Head.jsonLd({ '@type': 'Article', ... })

// Apple
Head.appleTouchIcon('/icon.png', '180x180')
```

### HeadBuilder (Programmatic)

```typescript
import { HeadBuilder } from '@riktajs/ssr';

const head = new HeadBuilder()
  .title('My Page')
  .description('Description')
  .og({ title: 'OG Title', image: '/og.png' })
  .twitter({ card: 'summary_large_image' })
  .canonical('https://example.com/page')
  .robots('index, follow')
  .meta('author', 'John Doe')
  .link('icon', '/favicon.ico')
  .jsonLd({ '@type': 'WebPage' })
  .withSsrData(context)
  .build();
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `process.cwd()` | Project root directory |
| `entryServer` | `string` | `'./src/entry-server'` | Server entry file path |
| `template` | `string` | `'./index.html'` | HTML template path |
| `dev` | `boolean` | `auto` | Development mode (auto-detected) |
| `buildDir` | `string` | `'dist'` | Build output directory |
| `ssrManifest` | `string` | `'.vite/ssr-manifest.json'` | SSR manifest filename |
| `viteConfig` | `object` | `{}` | Custom Vite configuration overrides |

## Production Build

### Build Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "npm run build:client && npm run build:server && npm run build:ssr",
    "build:client": "vite build --outDir dist/client --ssrManifest",
    "build:server": "vite build --outDir dist/server --ssr src/entry-server.tsx",
    "build:ssr": "tsc && tsc-alias",
    "start": "NODE_ENV=production node dist/server/server.js"
  }
}
```

### Production Server

```typescript
import { Rikta } from '@riktajs/core';
import { ssrPlugin, SsrController, Ssr } from '@riktajs/ssr';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = await Rikta.create({
    port: process.env.PORT || 3000,
    controllers: [ApiController],
  });

  await app.server.register(ssrPlugin, {
    root: resolve(__dirname, isProd ? '..' : '../..'),
    entryServer: './src/entry-server.tsx',
    template: './index.html',
    dev: !isProd,
    buildDir: 'dist',
  });

  app.server.registerSsrController(PageController);

  await app.listen();
}

bootstrap();
```

## API Reference

### registerSsrController(controller)

Registers an SSR controller:

```typescript
app.server.registerSsrController(PageController);
```

### @SsrController(options?)

Class decorator for SSR controllers.

**Options:**
- `prefix?: string` - URL prefix for all routes
- `ssrOptions?: SsrOptions` - Default SSR options

### @Ssr(options?)

Method decorator for SSR configuration.

**Options:**
- `title?: string` - Page title
- `description?: string` - Meta description
- `og?: OpenGraphOptions` - Open Graph tags
- `twitter?: TwitterCardOptions` - Twitter Card tags
- `canonical?: string` - Canonical URL
- `robots?: string` - Robots directive
- `head?: HeadTag[]` - Custom head tags
- `cache?: CacheOptions` - Cache control

### HeadBuilder

Programmatic head tag builder.

**Methods:**
- `.title(value)` - Set page title
- `.description(value)` - Set meta description
- `.og(options)` - Add Open Graph tags
- `.twitter(options)` - Add Twitter Card tags
- `.canonical(url)` - Set canonical URL
- `.robots(directive)` - Set robots directive
- `.meta(name, content)` - Add meta tag
- `.metaProperty(property, content)` - Add meta property tag
- `.link(rel, href, attrs?)` - Add link tag
- `.script(attrs, content?)` - Add script tag
- `.jsonLd(data)` - Add JSON-LD structured data
- `.withSsrData(data)` - Add SSR data for hydration
- `.build()` - Build final HTML string

### Head Helper

Static helper for creating head tags.

**Methods:**
- `Head.meta(name, content)` - Create meta tag
- `Head.property(property, content)` - Create meta property tag
- `Head.link(rel, href, attrs?)` - Create link tag
- `Head.favicon(href, type?)` - Create favicon link
- `Head.preload(href, as, attrs?)` - Create preload link
- `Head.preconnect(href, crossorigin?)` - Create preconnect link
- `Head.script(attrs, content?)` - Create script tag
- `Head.jsonLd(data)` - Create JSON-LD script
- `Head.appleTouchIcon(href, sizes?)` - Create Apple touch icon

## Best Practices

### 1. Use Decorator-Based Controllers

```typescript
// ✅ Good - Declarative, clean
@SsrController()
class PageController {
  @Get('/')
  @Ssr({ title: 'Home' })
  home() {
    return { page: 'home' };
  }
}

// ❌ Avoid - Imperative, harder to maintain
app.server.get('*', async (request, reply) => {
  const html = await app.server.ssr.render(request.url);
  return reply.send(html);
});
```

### 2. Separate API from SSR

```typescript
const app = await Rikta.create({
  controllers: [ApiController], // API routes handled by core
});

app.server.registerSsrController(PageController); // SSR routes
```

### 3. Use Head Management

```typescript
// ✅ Good - SEO optimized
@Ssr({
  title: 'Product Page',
  description: 'Buy amazing products',
  og: { image: '/product.jpg' },
  canonical: 'https://example.com/products/1',
})
```

### 4. Cache Strategically

```typescript
// Static pages
@Ssr({ cache: { maxAge: 3600 } })

// Dynamic pages
@Ssr({ cache: { maxAge: 60, staleWhileRevalidate: 120 } })
```

### 5. Handle Errors

```typescript
@Get('/:id')
@Ssr({ title: 'User Profile' })
async userProfile(@Param('id') id: string) {
  try {
    const user = await this.userService.find(id);
    if (!user) {
      return { page: 'not-found', statusCode: 404 };
    }
    return { page: 'user', user };
  } catch (error) {
    return { page: 'error', error: error.message };
  }
}
```

## CLI Template

Scaffold a new fullstack React project with SSR:

```bash
npx @riktajs/cli new my-app --template fullstack-react
cd my-app
npm install
npm run dev
```

The template includes:
- Pre-configured Vite setup
- React with SSR support
- Decorator-based controllers
- HeadBuilder integration
- Development and production scripts

---
title: Introduction to SSR
sidebar_label: Introduction
description: Server-Side Rendering in Rikta - Transform your API server into a fullstack application
---

# Server-Side Rendering (SSR)

The `@riktajs/ssr` package enables Rikta to serve server-rendered frontend applications, transforming it into a true fullstack framework. Powered by Vite, it supports React, Vue, and other modern frontend frameworks with full Hot Module Replacement (HMR) in development.

## Overview

`@riktajs/ssr` provides:

- **Vite Integration** - Leverages Vite for blazing fast development and optimized production builds
- **Framework Support** - First-class support for React, Vue, and other modern frameworks
- **Hot Module Replacement** - Full HMR support in development mode
- **Decorator-Based** - Use `@SsrController()` and `@Ssr()` decorators for SSR routes
- **Seamless Fastify Integration** - Works naturally with Rikta's Fastify-based architecture
- **TypeScript Ready** - Full TypeScript support with proper types
- **Client-Side Navigation** - Automatic data fetching for SPA-like navigation

## Installation

```bash
# Core SSR package
npm install @riktajs/ssr vite

# For React applications
npm install @riktajs/react react react-dom
npm install -D @vitejs/plugin-react @types/react @types/react-dom

# For Vue applications
npm install vue
npm install -D @vitejs/plugin-vue
```

## Quick Start with CLI

The fastest way to get started is using the Rikta CLI:

```bash
npx @riktajs/cli create my-app
# Select: fullstack-react template
```

This creates a fully configured SSR application with:
- Vite configuration
- Entry files (client & server)
- Example pages and components
- Development and production scripts

## Architecture

### Server-Side Flow

1. Client requests a URL (e.g., `/about`)
2. `@SsrController` route handler executes
3. Method returns data for the page
4. `@Ssr` decorator adds metadata (title, description, etc.)
5. Server entry renders React/Vue to HTML string
6. HTML is injected into template with `window.__SSR_DATA__`
7. Full HTML response sent to client

### Client-Side Flow (Hydration)

1. Browser receives HTML with rendered content
2. JavaScript bundle loads
3. React/Vue hydrates the DOM (attaches event handlers)
4. `RiktaProvider` reads `window.__SSR_DATA__`
5. App is now interactive

### Client-Side Navigation

1. User clicks a `<Link>` component
2. `RiktaProvider` intercepts navigation
3. Fetches new page data via `X-Rikta-Data` header
4. Server returns JSON instead of HTML
5. Updates `ssrData` and re-renders
6. No page reload, smooth SPA experience

## Supported Frameworks

### React

- ✅ React 19 with Suspense
- ✅ @riktajs/react hooks and components
- ✅ Full TypeScript support
- ✅ Hot Module Replacement

### Vue

- ✅ Vue 3 with Composition API
- ✅ Server-side rendering
- ✅ Full TypeScript support
- ✅ Hot Module Replacement

## Key Concepts

### SSR Controllers

Use `@SsrController()` to define SSR routes:

```typescript
import { SsrController, Ssr, Get, Head } from '@riktajs/ssr';

@SsrController({
  defaults: {
    og: { siteName: 'My App', type: 'website' },
    head: [Head.meta('author', 'Your Name')],
  },
})
export class PageController {
  @Get('/')
  @Ssr({ title: 'Home' }) // Inherits og and head from defaults
  home() {
    return { page: 'home' };
  }
}
```

The `defaults` option allows you to set common metadata for all routes, avoiding repetition.

### SSR Metadata

The `@Ssr()` decorator configures page metadata:

```typescript
@Ssr({
  title: 'My Page',
  description: 'SEO description',
  og: { image: '/og.png', type: 'website' },
  twitter: { card: 'summary_large_image' },
  canonical: 'https://example.com/page',
  robots: 'index, follow',
})
```

### Data Injection

Data flows from server to client via `window.__SSR_DATA__`:

```typescript
// Server returns this structure
{
  data: { page: 'home', items: [...] },
  url: '/home',
  title: 'Home Page',
  description: 'Welcome to our site'
}
```

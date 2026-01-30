---
title: SSR Configuration
sidebar_label: Configuration
description: Configure Vite and SSR options for your application
---

# SSR Configuration

Learn how to configure Vite and SSR options for optimal development and production performance.

## Vite Configuration

Create a `vite.config.ts` file in your project root:

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
    noExternal: ['@riktajs/core', '@riktajs/ssr'],
  },
});
```

### Vue Configuration

For Vue applications:

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  
  ssr: {
    noExternal: ['@riktajs/core', '@riktajs/ssr'],
  },
});
```

## SSR Plugin Options

Configure the SSR plugin in your server bootstrap:

```typescript title="src/server.ts"
import { Rikta } from '@riktajs/core';
import { ssrPlugin } from '@riktajs/ssr';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  await app.server.register(ssrPlugin, {
    root: resolve(__dirname, '..'),
    entryServer: './src/entry-server.tsx',
    template: './index.html',
    dev: process.env.NODE_ENV !== 'production',
    buildDir: 'dist',
    ssrManifest: '.vite/ssr-manifest.json',
  });

  await app.listen();
}

bootstrap();
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `process.cwd()` | Project root directory |
| `entryServer` | `string` | `'./src/entry-server'` | Path to server entry file |
| `template` | `string` | `'./index.html'` | Path to HTML template |
| `dev` | `boolean` | Auto-detected | Enable development mode with HMR |
| `buildDir` | `string` | `'dist'` | Build output directory |
| `ssrManifest` | `string` | `'ssr-manifest.json'` | SSR manifest filename |
| `viteConfig` | `object` | `{}` | Additional Vite config overrides |

## HTML Template

Your `index.html` serves as the template for SSR:

```html title="index.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Default description" />
  <title>My App</title>
  <!--head-tags-->
</head>
<body>
  <div id="app"><!--ssr-outlet--></div>
  <script type="module" src="/src/entry-client.tsx"></script>
</body>
</html>
```

### Placeholders

- `<!--head-tags-->` - Replaced with generated head tags (meta, og, twitter, etc.)
- `<!--ssr-outlet-->` - Replaced with rendered HTML
- `<!--preload-links-->` - Replaced with preload links in production

## Environment Variables

### Development

```bash
NODE_ENV=development npm run dev
```

- Enables HMR
- Uses Vite dev server
- No build required
- Fast refresh

### Production

```bash
NODE_ENV=production npm start
```

- Loads pre-built assets
- Optimized bundles
- No HMR
- Production performance

## TypeScript Configuration

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Build Scripts

Add these scripts to your `package.json`:

```json title="package.json"
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist/client",
    "build:server": "vite build --outDir dist/server --ssr src/entry-server.tsx",
    "start": "NODE_ENV=production node dist/server.js",
    "preview": "npm run build && npm start"
  }
}
```

## Asset Handling

### Static Assets

Place static assets in `public/` directory:

```
public/
  ├── favicon.ico
  ├── logo.png
  └── fonts/
      └── custom.woff2
```

Reference them in your code:

```tsx
<img src="/logo.png" alt="Logo" />
<link rel="icon" href="/favicon.ico" />
```

### CSS

Import CSS files directly:

```tsx
// Global styles
import './styles/global.css';

// Component styles
import './Button.css';
```

### CSS Modules

```tsx
import styles from './Button.module.css';

function Button() {
  return <button className={styles.button}>Click</button>;
}
```

### Tailwind CSS

Install and configure:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
});
```

```css title="src/index.css"
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Advanced Configuration

### Custom Vite Plugin

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function myCustomPlugin() {
  return {
    name: 'my-plugin',
    transformIndexHtml(html) {
      return html.replace(
        '<!--custom-inject-->',
        '<script>console.log("Injected!")</script>'
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), myCustomPlugin()],
});
```

### Environment-Specific Config

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  
  build: {
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
  },
}));
```

### Code Splitting

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ui': ['./src/components/Button', './src/components/Input'],
        },
      },
    },
  },
});
```

## Performance Optimization

### Preload Critical Assets

```typescript
@Ssr({
  title: 'Home',
  head: [
    {
      tag: 'link',
      attrs: {
        rel: 'preload',
        href: '/fonts/main.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
    },
  ],
})
```

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Bundle Analysis

```bash
npm install -D rollup-plugin-visualizer
```

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
    }),
  ],
});
```

## Troubleshooting

### Module Not Found Errors

Ensure `ssr.noExternal` includes necessary packages:

```typescript
export default defineConfig({
  ssr: {
    noExternal: ['@riktajs/core', '@riktajs/ssr', 'your-package'],
  },
});
```

### Hydration Mismatches

Use `useHydration()` for client-only content:

```tsx
import { useHydration } from '@riktajs/react';

const { isHydrated } = useHydration();
if (!isHydrated) return <Placeholder />;
```

### Build Errors

Check that all imports have correct extensions:

```tsx
// ✅ Good
import { Button } from './Button.js';

// ❌ Bad (might fail in production)
import { Button } from './Button';
```
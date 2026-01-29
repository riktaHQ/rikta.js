# Rikta SSR React Example

A fullstack application demonstrating Server-Side Rendering (SSR) with React using the Rikta framework.

## Features

- 🚀 **Server-Side Rendering** - React components rendered on the server
- ⚡ **Vite-powered** - Lightning fast HMR in development
- 🔄 **Hydration** - Seamless client-side hydration
- 🛠️ **API Routes** - Backend API endpoints alongside SSR
- 💎 **TypeScript** - Full type safety throughout

## Quick Start

```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
example-ssr-react/
├── src/
│   ├── App.tsx           # Main React component
│   ├── entry-client.tsx  # Client-side hydration entry
│   ├── entry-server.tsx  # Server-side render entry
│   └── server.ts         # Rikta server with SSR
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

### Server Entry (`src/entry-server.tsx`)

Exports a `render` function that is called by `@riktajs/ssr` to render React to HTML:

```tsx
export function render(url: string, context: Record<string, unknown>) {
  const html = renderToString(<App url={url} serverData={context} />);
  return { html };
}
```

### Client Entry (`src/entry-client.tsx`)

Hydrates the server-rendered HTML with React interactivity:

```tsx
hydrateRoot(document.getElementById('app')!, <App />);
```

### Server (`src/server.ts`)

Registers the SSR plugin and handles requests:

```typescript
await app.server.register(ssrPlugin, {
  root: resolve(__dirname, '..'),
  entryServer: './src/entry-server.tsx',
  template: './index.html',
});

app.server.get('*', async (request, reply) => {
  const html = await app.server.ssr.render(request.url);
  return reply.type('text/html').send(html);
});
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/hello` | Returns a greeting message |
| `GET /api/data` | Returns sample user data |
| `GET /health` | Health check endpoint |

## Production Build

```bash
# Build both client and server
npm run build

# Start production server
NODE_ENV=production npm start
```

The build process creates:
- `dist/client/` - Client-side assets
- `dist/server/` - Server-side bundle

## License

MIT

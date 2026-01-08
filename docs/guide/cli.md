# 🛠️ CLI Guide

The Rikta CLI (`@riktajs/cli`) provides commands to scaffold, develop, and build Rikta applications.

## Installation

```bash
# Global installation (recommended)
npm install -g @riktajs/cli

# Or use npx (no installation)
npx @riktajs/cli <command>
```

## Commands Overview

| Command | Description |
|---------|-------------|
| `rikta new <name>` | Create a new Rikta project |
| `rikta dev` | Start development server with hot reload |
| `rikta build` | Build for production |

## Creating a New Project

The `new` command scaffolds a complete Rikta project:

```bash
rikta new my-api
cd my-api
```

This creates:

```
my-api/
├── src/
│   ├── controllers/
│   │   └── app.controller.ts    # REST controller with @Controller
│   ├── services/
│   │   └── greeting.service.ts  # Injectable service
│   └── index.ts                 # Entry point
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Example Controller

```typescript
// src/controllers/app.controller.ts
import { Controller, Get } from '@riktajs/core';
import { Autowired } from '@riktajs/core';
import { GreetingService } from '../services/greeting.service.js';

@Controller()
export class AppController {
  @Autowired()
  private greetingService!: GreetingService;

  @Get('/')
  index() {
    return { message: this.greetingService.getGreeting() };
  }

  @Get('/health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### Example Service

```typescript
// src/services/greeting.service.ts
import { Injectable } from '@riktajs/core';

@Injectable()
export class GreetingService {
  getGreeting(): string {
    return 'Welcome to Rikta! 🚀';
  }
}
```

### Entry Point

```typescript
// src/index.ts
import 'reflect-metadata';
import { Rikta, Container } from '@riktajs/core';
import { GreetingService } from './services/greeting.service.js';

const container = new Container();
container.register(GreetingService);

const app = await Rikta.create({
  port: 3000,
  autowired: ['./src/controllers'],
  container,
});

await app.listen();
console.log('🚀 Server running on http://localhost:3000');
```

## Development Server

The `dev` command provides a full development experience:

```bash
rikta dev
```

### Features

- **TypeScript Watch Mode**: Automatically recompiles on file changes
- **Hot Reload**: Server restarts when compilation completes
- **Error Display**: Clear TypeScript error messages
- **Dependency Check**: Warns if `node_modules` is missing

### Options

```bash
# Custom port
rikta dev --port 8080

# Bind to specific host
rikta dev --host 127.0.0.1

# Disable watch mode
rikta dev --no-watch

# Verbose output
rikta dev --verbose
```

### How It Works

1. Checks for `node_modules` (prompts to run `npm install` if missing)
2. Starts `tsc --watch` for continuous compilation
3. Monitors TypeScript output for compilation completion
4. Starts/restarts the Node.js server on successful compilation
5. Displays errors on compilation failure

## Production Build

The `build` command creates optimized production output:

```bash
rikta build
```

### Features

- **Clean Build**: Removes old `dist/` files first
- **Optimized Output**: Removes comments, no source maps by default
- **Build Analytics**: Reports file count, size, and build time
- **Deploy Suggestions**: Shows commands for deployment

### Options

```bash
# With source maps (for debugging production issues)
rikta build --sourcemap

# Custom output directory
rikta build --outDir build

# Keep previous files
rikta build --no-clean

# Skip comment removal
rikta build --no-minify

# Verbose mode
rikta build --verbose
```

### Build Output

```
───────────────────────────
│  Rikta Production Build │
───────────────────────────

[1/5] Checking project...
✔ Rikta project detected

[2/5] Detecting TypeScript configuration...
✔ Using tsconfig.json

[3/5] Cleaning dist folder...
✔ Output folder cleaned

[4/5] Compiling TypeScript...
✔ TypeScript compilation complete

[5/5] Build summary...

✔ Build completed successfully!

⏱️  Build time: 1.23s
📦 Output: /path/to/dist
📄 Files: 5 JavaScript files
📊 Size: 12.34 KB

✨ Optimizations: no source maps, comments removed

📦 Estimated deploy size:
   dist:         12.34 KB
   node_modules: 2.45 MB
   ─────────────────────
   Total:        2.46 MB

🚀 Deploy commands:

  # Create deployment package
  zip -r deploy.zip dist node_modules package.json

  # Or use Docker
  docker build -t my-app .
```

## tsconfig.build.json

For production-specific settings, create `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "sourceMap": false,
    "removeComments": true
  },
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "tests/**/*"
  ]
}
```

The CLI automatically uses this file if it exists.

## Deployment

### Serverless

```bash
# Build
rikta build

# Package
zip -r deploy.zip dist node_modules package.json

# Deploy to AWS Lambda, Vercel, etc.
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

### Traditional Server

```bash
# Build
rikta build

# Start in production
NODE_ENV=production node dist/index.js

# Or with PM2
pm2 start dist/index.js --name my-app
```

## Troubleshooting

### "Not a Rikta project"

Make sure your `package.json` includes `@riktajs/core` as a dependency:

```json
{
  "dependencies": {
    "@riktajs/core": "^0.4.0"
  }
}
```

### "node_modules not found"

Run `npm install` before using `rikta dev` or `rikta build`:

```bash
npm install
rikta dev
```

### TypeScript compilation errors

The CLI will display errors from TypeScript. Fix the reported issues in your code and the server will automatically restart (in dev mode).

### Port already in use

Use a different port:

```bash
rikta dev --port 3001
```

Or kill the process using the port:

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

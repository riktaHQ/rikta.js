---
sidebar_position: 1
---

# Overview

The `@riktajs/cli` package provides a command-line interface for creating and managing Rikta projects.

## Installation

Install globally:

```bash
npm install -g @riktajs/cli
```

Or use with npx:

```bash
npx @riktajs/cli <command>
```

## Quick Start

Create a new Rikta project:

```bash
rikta new my-app
cd my-app
npm run dev
```

That's it! Your new Rikta application is running at `http://localhost:3000`.

## Available Commands

| Command | Description |
|---------|-------------|
| `new <name>` | Create a new Rikta project |
| `generate <type> <name>` | Generate a component (controller, service, etc.) |
| `build` | Build the project for production |
| `start` | Start the application |
| `dev` | Start in development mode with hot reload |

## Project Structure

When you create a new project, you get this structure:

```
my-app/
├── src/
│   ├── controllers/
│   │   └── app.controller.ts
│   ├── services/
│   │   └── greeting.service.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Directory Structure Explained

| Directory | Purpose |
|-----------|---------|
| `src/` | Source code |
| `src/controllers/` | HTTP controllers |
| `src/services/` | Business logic services |
| `src/index.ts` | Application entry point |

## Configuration

The generated project includes these configuration files:

### package.json

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@riktajs/core": "latest"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"]
}
```

## Starter Application

The generated application includes a simple example:

### Entry Point (src/index.ts)

```typescript
import { Rikta } from '@riktajs/core';

async function bootstrap() {
  const app = await Rikta.create({
    port: 3000,
    autowired: ['./src'],
  });

  await app.listen();
  console.log('🚀 Server running at http://localhost:3000');
}

bootstrap();
```

### Controller (src/controllers/app.controller.ts)

```typescript
import { Controller, Get, Autowired } from '@riktajs/core';
import { GreetingService } from '../services/greeting.service';

@Controller('/')
export class AppController {
  @Autowired()
  private greetingService!: GreetingService;

  @Get()
  hello() {
    return this.greetingService.getGreeting();
  }

  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
```

### Service (src/services/greeting.service.ts)

```typescript
import { Injectable } from '@riktajs/core';

@Injectable()
export class GreetingService {
  getGreeting(): string {
    return 'Hello from Rikta! 👋';
  }
}
```

## Development Workflow

### Start Development Server

```bash
npm run dev
```

This starts the server with hot reload - changes to your code are automatically detected and the server restarts.

### Build for Production

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### Run in Production

```bash
npm run start
```

Runs the compiled application.

## Next Steps

- [First Steps](/docs/overview/first-steps) - Deep dive into Rikta concepts
- [API Reference](/docs/api-reference) - Complete API documentation

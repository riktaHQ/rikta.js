# My Rikta Application

A fast and modern TypeScript backend built with [Rikta](https://github.com/riktahq/rikta).

## Getting Started

### Setup

```bash
# Copy environment variables
cp .env.example .env

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

This will start the development server with hot reload at `http://localhost:3000`.

### Production Build

```bash
npm run build
```

This creates an optimized build in the `dist/` folder, ready for serverless deployment.

### Start Production Server

```bash
npm start
```

## Project Structure

```
├── src/
│   ├── controllers/        # Route controllers
│   │   └── app.controller.ts
│   ├── services/           # Business logic services
│   │   └── greeting.service.ts
│   └── index.ts            # Application entry point
├── dist/                   # Compiled output
├── .env.example            # Environment variables template
├── .editorconfig           # Editor configuration
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Welcome message |
| GET | `/greet?name=John` | Personalized greeting |
| GET | `/health` | Health check with uptime |

## Adding New Features

### Creating a Service

```typescript
import { Injectable } from '@riktajs/core';

@Injectable()
export class UserService {
  private users: any[] = [];

  findAll() {
    return this.users;
  }

  create(data: any) {
    this.users.push(data);
    return data;
  }
}
```

### Creating a Controller

```typescript
import { Controller, Get, Post, Body } from '@riktajs/core';

@Controller('/users')
export class UserController {
  @Get()
  getUsers() {
    return { users: [] };
  }

  @Post()
  createUser(@Body() data: any) {
    return { created: true, data };
  }
}
```

## Learn More

- [Rikta Documentation](https://github.com/riktahq/rikta)
- [TypeScript](https://www.typescriptlang.org/)
- [Fastify](https://www.fastify.io/)

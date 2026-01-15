---
sidebar_position: 5
---

# Configuration

Configure your MCP server with advanced options including Redis for horizontal scaling, SSE settings, and more.

## Basic Configuration

```typescript
import { Rikta } from '@riktajs/core';
import { registerMCPServer } from '@riktajs/mcp';

const app = await Rikta.create({ port: 3000 });

await registerMCPServer(app, {
  serverInfo: {
    name: 'my-mcp-server',
    version: '1.0.0',
  },
  instructions: 'This server provides tools for...',
  enableSSE: true,
  path: '/mcp',
});

await app.listen();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverInfo` | `{ name: string; version: string }` | `{ name: 'rikta-mcp', version: '1.0.0' }` | Server identification |
| `instructions` | `string` | - | Instructions for AI assistants |
| `enableSSE` | `boolean` | `true` | Enable Server-Sent Events |
| `path` | `string` | `/mcp` | MCP endpoint path |
| `redis` | `RedisConfig` | - | Redis configuration for scaling |
| `sessionTTL` | `number` | `3600` | Session TTL in seconds |
| `heartbeat` | `boolean` | `true` | Enable heartbeat for SSE |
| `heartbeatInterval` | `number` | `30000` | Heartbeat interval in ms |

## Server Information

Provide details about your MCP server:

```typescript
await registerMCPServer(app, {
  serverInfo: {
    name: 'acme-backend',     // Unique server name
    version: '2.1.0',          // Semantic version
  },
  instructions: `
    This MCP server provides access to ACME Corp's backend services.
    
    Available capabilities:
    - User management (CRUD operations)
    - File storage (read/write/list)
    - Data analytics queries
    
    Authentication is handled via session tokens.
    Rate limits: 100 requests per minute.
  `,
});
```

## Redis Configuration

For production deployments with multiple instances, use Redis for session management and message broadcasting:

```typescript
await registerMCPServer(app, {
  serverInfo: { name: 'scaled-server', version: '1.0.0' },
  redis: {
    host: 'redis.example.com',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
  },
  sessionTTL: 7200, // 2 hours
});
```

### Redis Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `string` | - | Redis host |
| `port` | `number` | `6379` | Redis port |
| `password` | `string` | - | Redis password |
| `db` | `number` | `0` | Redis database number |

### Why Redis?

Without Redis, each Rikta instance maintains its own session state. This works fine for single-instance deployments, but causes issues with load balancing:

```
Without Redis:
┌─────────────┐     ┌─────────────┐
│  Instance 1 │     │  Instance 2 │
│  Sessions A │     │  Sessions B │
└─────────────┘     └─────────────┘
     ↑                    ↑
     └────── Client ──────┘
         (session loss!)

With Redis:
┌─────────────┐     ┌─────────────┐
│  Instance 1 │     │  Instance 2 │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               ▼
        ┌───────────┐
        │   Redis   │
        │ (shared)  │
        └───────────┘
```

## SSE Configuration

Server-Sent Events allow real-time communication:

```typescript
await registerMCPServer(app, {
  serverInfo: { name: 'realtime-server', version: '1.0.0' },
  enableSSE: true,           // Enable SSE endpoint
  heartbeat: true,           // Send periodic heartbeats
  heartbeatInterval: 30000,  // Every 30 seconds
});
```

### SSE Endpoints

When SSE is enabled:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mcp` | JSON-RPC endpoint |
| GET | `/mcp` | SSE stream endpoint |

### Connecting via SSE

```javascript
const eventSource = new EventSource('http://localhost:3000/mcp');

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

## Custom Endpoint Path

Change the MCP endpoint path:

```typescript
await registerMCPServer(app, {
  serverInfo: { name: 'my-server', version: '1.0.0' },
  path: '/api/mcp',  // Now available at /api/mcp
});
```

## Environment-Based Configuration

Use environment variables for flexible configuration:

```typescript
import { registerMCPServer } from '@riktajs/mcp';

await registerMCPServer(app, {
  serverInfo: {
    name: process.env.MCP_SERVER_NAME || 'default-server',
    version: process.env.npm_package_version || '1.0.0',
  },
  instructions: process.env.MCP_INSTRUCTIONS,
  enableSSE: process.env.MCP_ENABLE_SSE !== 'false',
  path: process.env.MCP_PATH || '/mcp',
  
  // Redis (only if REDIS_HOST is set)
  ...(process.env.REDIS_HOST && {
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
  }),
  
  sessionTTL: parseInt(process.env.MCP_SESSION_TTL || '3600'),
});
```

### Example .env File

```env
# MCP Configuration
MCP_SERVER_NAME=acme-backend
MCP_INSTRUCTIONS="ACME Corp backend services"
MCP_ENABLE_SSE=true
MCP_PATH=/mcp
MCP_SESSION_TTL=7200

# Redis (optional)
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secret
REDIS_DB=0
```

## Full Configuration Example

```typescript
import { Rikta } from '@riktajs/core';
import { registerMCPServer } from '@riktajs/mcp';

async function bootstrap() {
  const app = await Rikta.create({
    port: parseInt(process.env.PORT || '3000'),
  });

  await registerMCPServer(app, {
    // Server identity
    serverInfo: {
      name: 'production-backend',
      version: '2.5.0',
    },
    
    // AI instructions
    instructions: `
      Production backend MCP server.
      
      Tools:
      - user_search: Search users by name/email
      - user_create: Create new users
      - file_read: Read files from storage
      - analytics_query: Run analytics queries
      
      Resources:
      - config://app: Current configuration
      - db://schema: Database schema
      
      Rate limits apply. Contact admin for increased limits.
    `,
    
    // SSE configuration
    enableSSE: true,
    heartbeat: true,
    heartbeatInterval: 30000,
    
    // Endpoint
    path: '/mcp',
    
    // Session management
    sessionTTL: 7200,
    
    // Redis for horizontal scaling
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
  });

  await app.listen();
  
  console.log(`🤖 MCP Server: http://localhost:${process.env.PORT || 3000}/mcp`);
}

bootstrap();
```

## Accessing Configuration Programmatically

Use the `createMCPConfig` helper for type-safe configuration:

```typescript
import { registerMCPServer, createMCPConfig } from '@riktajs/mcp';

const mcpConfig = createMCPConfig({
  serverInfo: { name: 'my-server', version: '1.0.0' },
  enableSSE: true,
});

// mcpConfig is fully typed with defaults applied
await registerMCPServer(app, mcpConfig);
```

## Next Steps

- [Tools](./tools) - Create callable functions
- [Resources](./resources) - Expose data sources
- [Prompts](./prompts) - Create prompt templates

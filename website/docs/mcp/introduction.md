---
sidebar_position: 1
---

# Introduction

The `@riktajs/mcp` package provides seamless integration with the **Model Context Protocol (MCP)** for your Rikta applications. MCP enables AI assistants like Claude, GPT, and other LLM-powered tools to interact with your backend services.

## What is MCP?

The Model Context Protocol is an open standard that allows AI applications to securely connect to external data sources and tools. With MCP, you can expose your Rikta services as:

- **Tools** - Functions that AI can call to perform actions
- **Resources** - Data sources that AI can read from
- **Prompts** - Template prompts that guide AI interactions

## Key Features

- 🤖 **Decorator-based API** - Define MCP handlers with `@MCPTool`, `@MCPResource`, `@MCPPrompt`
- 🔍 **Auto-discovery** - Automatically discovers MCP handlers from `@Injectable` classes
- 📝 **Zod Integration** - Full Zod support for input schema validation
- 📡 **SSE Support** - Server-Sent Events for real-time notifications
- 🔄 **Horizontal Scaling** - Redis support for multi-instance deployments
- 🔒 **Type Safe** - Complete TypeScript definitions

## Installation

```bash
npm install @riktajs/mcp zod
```

## Quick Start

### Basic Setup

```typescript
import { Rikta, Injectable } from '@riktajs/core';
import { registerMCPServer, MCPTool, z } from '@riktajs/mcp';

@Injectable()
class CalculatorService {
  @MCPTool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
  })
  async add(params: { a: number; b: number }) {
    return {
      content: [{
        type: 'text',
        text: `Result: ${params.a + params.b}`,
      }],
    };
  }
}

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  await registerMCPServer(app, {
    serverInfo: { name: 'calculator', version: '1.0.0' },
    instructions: 'A calculator service for basic math operations',
  });

  await app.listen();
  console.log('MCP server available at http://localhost:3000/mcp');
}

bootstrap();
```

### Test Your MCP Server

Once running, you can test your MCP server using curl:

```bash
# Initialize connection
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "clientInfo": { "name": "test", "version": "1.0.0" },
      "capabilities": {}
    }
  }'

# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# Call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": { "a": 5, "b": 3 }
    }
  }'
```

## MCP Inspector

For a visual testing experience, use the official MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Assistant                              │
│                   (Claude, GPT, etc.)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol (JSON-RPC)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     @riktajs/mcp                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  registerMCPServer()                      │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │   │
│  │  │  @MCPTool   │  │ @MCPResource │  │  @MCPPrompt   │   │   │
│  │  └─────────────┘  └──────────────┘  └───────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               @platformatic/mcp (Core)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Your Rikta Services                          │
│             (Database, APIs, Business Logic)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Next Steps

- Learn about [Tools](./tools) - Create callable functions for AI
- Learn about [Resources](./resources) - Expose data sources
- Learn about [Prompts](./prompts) - Create prompt templates
- Explore [Configuration](./configuration) - Advanced setup options

---
slug: introducing-rikta-mcp
title: "Introducing @riktajs/mcp: Connect AI Assistants to Your Backend"
authors: [rikta]
tags: [rikta, mcp, ai, llm, release]
image: /img/blog/mcp-banner.png
---

# Introducing @riktajs/mcp: Connect AI Assistants to Your Backend 🤖

We're thrilled to announce `@riktajs/mcp` - seamless integration of the **Model Context Protocol (MCP)** for Rikta applications. Now you can expose your backend services to AI assistants like Claude, GPT, and other LLM-powered tools with just a few decorators.

<!--truncate-->

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard that allows AI applications to securely connect to external data sources and tools. Think of it as a universal API that AI assistants can use to interact with your services.

With MCP, your backend becomes an intelligent assistant's toolkit - whether it's reading files, querying databases, or executing business logic.

## Why @riktajs/mcp?

Building MCP servers from scratch can be complex. `@riktajs/mcp` brings Rikta's philosophy of simplicity to MCP integration:

- 🤖 **Decorator-based API** - Define tools with `@MCPTool`, `@MCPResource`, `@MCPPrompt`
- 🔍 **Auto-discovery** - No manual registration needed
- 📝 **Zod Integration** - Type-safe schemas that convert automatically
- 📡 **Production Ready** - SSE support, Redis scaling, full TypeScript
- ⚡ **Zero Config** - Works out of the box

## Quick Start

Install the package:

```bash
npm install @riktajs/mcp zod
```

Create a simple calculator service:

```typescript
import { Injectable } from '@riktajs/core';
import { MCPTool, z } from '@riktajs/mcp';

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
```

Register the MCP server in your app:

```typescript
import { Rikta } from '@riktajs/core';
import { registerMCPServer } from '@riktajs/mcp';

const app = await Rikta.create({ port: 3000 });

await registerMCPServer(app, {
  serverInfo: { name: 'calculator', version: '1.0.0' },
  instructions: 'A calculator service for basic math operations',
});

await app.listen();
// MCP server available at http://localhost:3000/mcp
```

That's it! Your backend is now accessible to AI assistants.

## Real-World Use Cases

### 1. File System Assistant

Give AI the ability to read and list files:

```typescript
@Injectable()
class FileSystemService {
  @MCPTool({
    name: 'list_files',
    description: 'List files in a directory',
    inputSchema: z.object({
      path: z.string().describe('Directory path'),
      showHidden: z.boolean().optional().default(false),
    }),
  })
  async listFiles(params: { path: string; showHidden?: boolean }) {
    const files = await fs.readdir(params.path);
    const filtered = params.showHidden 
      ? files 
      : files.filter(f => !f.startsWith('.'));
    
    return {
      content: [{
        type: 'text',
        text: `Files in ${params.path}:\n${filtered.join('\n')}`,
      }],
    };
  }

  @MCPResource({
    uriPattern: 'file://read',
    name: 'Read File',
    description: 'Read file contents. Use ?path=<filepath>',
    mimeType: 'text/plain',
  })
  async readFile(uri: string) {
    const url = new URL(uri);
    const path = url.searchParams.get('path');
    const content = await fs.readFile(path, 'utf-8');
    
    return {
      contents: [{
        uri,
        text: content,
        mimeType: 'text/plain',
      }],
    };
  }
}
```

Now AI assistants can navigate your file system and read files!

### 2. Database Query Assistant

Let AI query your database:

```typescript
@Injectable()
class DatabaseService {
  @Autowired()
  private userRepository!: UserRepository;

  @MCPTool({
    name: 'search_users',
    description: 'Search users by name or email',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      limit: z.number().min(1).max(100).default(10),
    }),
  })
  async searchUsers(params: { query: string; limit: number }) {
    const users = await this.userRepository.search(params.query, params.limit);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${users.length} users:\n` +
              users.map(u => `- ${u.name} <${u.email}>`).join('\n'),
      }],
    };
  }

  @MCPResource({
    uriPattern: 'db://users',
    name: 'Users Database',
    description: 'Get all users. Use ?limit=N for pagination',
    mimeType: 'application/json',
  })
  async getAllUsers(uri: string) {
    const url = new URL(uri);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const users = await this.userRepository.find({ take: limit });
    
    return {
      contents: [{
        uri,
        text: JSON.stringify(users, null, 2),
        mimeType: 'application/json',
      }],
    };
  }
}
```

AI can now intelligently query and analyze your data!

### 3. Code Review Assistant

Create prompt templates for common tasks:

```typescript
@Injectable()
class CodeReviewService {
  @MCPPrompt({
    name: 'code_review',
    description: 'Generate a code review prompt',
    arguments: [
      { name: 'language', description: 'Programming language', required: true },
      { name: 'code', description: 'Code to review', required: true },
      { name: 'focus', description: 'Specific focus (security, performance)' },
    ],
  })
  async codeReview(args: { language: string; code: string; focus?: string }) {
    const focusArea = args.focus ? `\nFocus on: ${args.focus}` : '';
    
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Review this ${args.language} code:${focusArea}\n\n\`\`\`${args.language}\n${args.code}\n\`\`\``,
        },
      }],
    };
  }
}
```

## Testing Your MCP Server

Use the official MCP Inspector for visual testing:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

Or test with curl:

```bash
# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": { "a": 5, "b": 3 }
    }
  }'
```

## Production Features

### Horizontal Scaling with Redis

Deploy across multiple instances with Redis:

```typescript
await registerMCPServer(app, {
  serverInfo: { name: 'production-server', version: '1.0.0' },
  redis: {
    host: 'redis.example.com',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
  },
  sessionTTL: 7200,
});
```

### Real-time Updates with SSE

Enable Server-Sent Events for real-time communication:

```typescript
await registerMCPServer(app, {
  serverInfo: { name: 'realtime-server', version: '1.0.0' },
  enableSSE: true,
  heartbeat: true,
  heartbeatInterval: 30000,
});
```

## The Power of Zod

All input schemas use Zod, giving you:

- **Type safety** - Schemas are validated at runtime
- **Auto-conversion** - Zod schemas convert to JSON Schema for MCP
- **Rich validation** - Email, UUID, min/max, custom validators

```typescript
const schema = z.object({
  email: z.string().email().describe('User email address'),
  age: z.number().min(18).max(120).describe('User age'),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
  tags: z.array(z.string()).optional(),
});
```

## Three Ways to Expose Functionality

### 1. Tools - Functions AI Can Call

```typescript
@MCPTool({
  name: 'send_email',
  description: 'Send an email',
  inputSchema: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
})
async sendEmail(params) { /* ... */ }
```

### 2. Resources - Data AI Can Read

```typescript
@MCPResource({
  uriPattern: 'config://app',
  name: 'App Configuration',
  description: 'Current app configuration',
  mimeType: 'application/json',
})
async getConfig(uri: string) { /* ... */ }
```

### 3. Prompts - Template Conversations

```typescript
@MCPPrompt({
  name: 'debug_help',
  description: 'Get debugging assistance',
  arguments: [
    { name: 'error', required: true },
  ],
})
async debugHelp(args) { /* ... */ }
```

## Architecture

```
┌─────────────────────────────────────┐
│     AI Assistant (Claude, GPT)      │
└───────────────┬─────────────────────┘
                │ MCP Protocol (JSON-RPC)
                ▼
┌─────────────────────────────────────┐
│           @riktajs/mcp              │
│  ┌─────────────────────────────┐   │
│  │  Auto-discovery Registry    │   │
│  │  @MCPTool  @MCPResource     │   │
│  │  @MCPPrompt                 │   │
│  └─────────────────────────────┘   │
│                │                    │
│                ▼                    │
│  ┌─────────────────────────────┐   │
│  │   @platformatic/mcp (Core)  │   │
│  └─────────────────────────────┘   │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      Your Rikta Services            │
│   (Database, APIs, Business Logic)  │
└─────────────────────────────────────┘
```

## Getting Started

Install the package:

```bash
npm install @riktajs/mcp zod
```

Check out the [documentation](/docs/mcp/introduction) for complete guides and examples.

## What's Next?

We're excited to see what you'll build with `@riktajs/mcp`! Here are some ideas:

- 🗄️ **Database Assistant** - Let AI query and analyze your data
- 📁 **File Manager** - AI-powered file operations
- 🔍 **Code Analyzer** - Automated code reviews and analysis
- 📊 **Analytics Dashboard** - Natural language queries for metrics
- 🛠️ **DevOps Helper** - Manage deployments and infrastructure

## Community

Join our growing community:

- 💬 [Discord](https://discord.gg/rikta)
- 🐙 [GitHub](https://github.com/riktahq/rikta)
- 🐦 [Twitter](https://twitter.com/riktajs)

We can't wait to see what you build! Share your MCP servers with us on Twitter using **#RiktaMCP**.

---

*Happy coding! 🚀*

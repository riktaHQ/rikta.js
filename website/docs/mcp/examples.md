---
sidebar_position: 6
---

# Examples

Complete examples demonstrating `@riktajs/mcp` integration patterns.

## File System Server

A complete MCP server for file system operations:

```typescript
import { Rikta, Injectable } from '@riktajs/core';
import { registerMCPServer, MCPTool, MCPResource, MCPPrompt, z } from '@riktajs/mcp';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

@Injectable()
class FileSystemService {
  private basePath = process.cwd();

  @MCPTool({
    name: 'list_files',
    description: 'List files and directories in a path',
    inputSchema: z.object({
      path: z.string().optional().default('.').describe('Directory path'),
      showHidden: z.boolean().optional().default(false).describe('Show hidden files'),
      recursive: z.boolean().optional().default(false).describe('List recursively'),
    }),
  })
  async listFiles(params: { path?: string; showHidden?: boolean; recursive?: boolean }) {
    const { path = '.', showHidden = false, recursive = false } = params;
    const fullPath = join(this.basePath, path);

    try {
      const items = await this.readDirectory(fullPath, showHidden, recursive);
      return {
        content: [{
          type: 'text' as const,
          text: `Files in ${path}:\n\n${items.join('\n')}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }

  private async readDirectory(dir: string, showHidden: boolean, recursive: boolean): Promise<string[]> {
    const items = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const item of items) {
      if (!showHidden && item.name.startsWith('.')) continue;

      const icon = item.isDirectory() ? '📁' : '📄';
      results.push(`${icon} ${item.name}`);

      if (recursive && item.isDirectory()) {
        const subItems = await this.readDirectory(join(dir, item.name), showHidden, recursive);
        results.push(...subItems.map(i => `  ${i}`));
      }
    }

    return results;
  }

  @MCPTool({
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: z.object({
      path: z.string().describe('File path to read'),
      encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
    }),
  })
  async readFile(params: { path: string; encoding?: string }) {
    const fullPath = join(this.basePath, params.path);

    try {
      const content = await fs.readFile(fullPath, params.encoding as BufferEncoding);
      return {
        content: [{ type: 'text' as const, text: content }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }

  @MCPTool({
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: z.object({
      path: z.string().describe('File path to write'),
      content: z.string().describe('Content to write'),
      createDirs: z.boolean().optional().default(true).describe('Create parent directories'),
    }),
  })
  async writeFile(params: { path: string; content: string; createDirs?: boolean }) {
    const fullPath = join(this.basePath, params.path);

    try {
      if (params.createDirs) {
        await fs.mkdir(dirname(fullPath), { recursive: true });
      }
      await fs.writeFile(fullPath, params.content);
      return {
        content: [{ type: 'text' as const, text: `Successfully wrote to ${params.path}` }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }

  @MCPResource({
    uriPattern: 'file://content',
    name: 'File Content',
    description: 'Read file content. Use ?path=<filepath>',
    mimeType: 'text/plain',
  })
  async getFileContent(uri: string) {
    const url = new URL(uri);
    const filePath = url.searchParams.get('path');

    if (!filePath) {
      return {
        contents: [{ uri, text: 'Error: path parameter required', mimeType: 'text/plain' }],
      };
    }

    try {
      const content = await fs.readFile(join(this.basePath, filePath), 'utf-8');
      return {
        contents: [{ uri, text: content, mimeType: 'text/plain' }],
      };
    } catch (error) {
      return {
        contents: [{ uri, text: `Error: ${(error as Error).message}`, mimeType: 'text/plain' }],
      };
    }
  }
}

// Bootstrap
async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  await registerMCPServer(app, {
    serverInfo: { name: 'file-system-server', version: '1.0.0' },
    instructions: 'File system operations: list, read, write files.',
  });

  await app.listen();
  console.log('🤖 File System MCP Server: http://localhost:3000/mcp');
}

bootstrap();
```

## Database Query Server

An MCP server for database operations:

```typescript
import { Rikta, Injectable, Autowired } from '@riktajs/core';
import { registerMCPServer, MCPTool, MCPResource, z } from '@riktajs/mcp';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
class DatabaseMCPService {
  @Autowired()
  private dataSource!: DataSource;

  private get userRepo(): Repository<User> {
    return this.dataSource.getRepository(User);
  }

  @MCPTool({
    name: 'search_users',
    description: 'Search users by name or email',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      field: z.enum(['name', 'email', 'all']).optional().default('all'),
      limit: z.number().min(1).max(100).optional().default(10),
    }),
  })
  async searchUsers(params: { query: string; field?: string; limit?: number }) {
    const { query, field = 'all', limit = 10 } = params;

    let qb = this.userRepo.createQueryBuilder('user');

    if (field === 'name') {
      qb = qb.where('user.name ILIKE :query', { query: `%${query}%` });
    } else if (field === 'email') {
      qb = qb.where('user.email ILIKE :query', { query: `%${query}%` });
    } else {
      qb = qb.where('user.name ILIKE :query OR user.email ILIKE :query', { query: `%${query}%` });
    }

    const users = await qb.take(limit).getMany();

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${users.length} users:\n\n` +
              users.map(u => `- ${u.name} <${u.email}> (ID: ${u.id})`).join('\n'),
      }],
    };
  }

  @MCPTool({
    name: 'get_user',
    description: 'Get user details by ID',
    inputSchema: z.object({
      id: z.string().uuid().describe('User ID'),
    }),
  })
  async getUser(params: { id: string }) {
    const user = await this.userRepo.findOne({ where: { id: params.id } });

    if (!user) {
      return {
        content: [{ type: 'text' as const, text: `User not found: ${params.id}` }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(user, null, 2),
      }],
    };
  }

  @MCPTool({
    name: 'create_user',
    description: 'Create a new user',
    inputSchema: z.object({
      name: z.string().min(1).describe('User name'),
      email: z.string().email().describe('Email address'),
    }),
  })
  async createUser(params: { name: string; email: string }) {
    try {
      const user = this.userRepo.create(params);
      await this.userRepo.save(user);

      return {
        content: [{
          type: 'text' as const,
          text: `Created user: ${user.name} (${user.id})`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }

  @MCPResource({
    uriPattern: 'db://users',
    name: 'Users List',
    description: 'Get all users. Use ?limit=N&offset=M for pagination.',
    mimeType: 'application/json',
  })
  async getAllUsers(uri: string) {
    const url = new URL(uri);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const users = await this.userRepo.find({ take: limit, skip: offset });

    return {
      contents: [{
        uri,
        text: JSON.stringify(users, null, 2),
        mimeType: 'application/json',
      }],
    };
  }

  @MCPResource({
    uriPattern: 'db://schema',
    name: 'Database Schema',
    description: 'Get database table schemas',
    mimeType: 'application/json',
  })
  async getSchema(uri: string) {
    const entities = this.dataSource.entityMetadatas.map(entity => ({
      name: entity.tableName,
      columns: entity.columns.map(col => ({
        name: col.propertyName,
        type: col.type,
        nullable: col.isNullable,
        primary: col.isPrimary,
      })),
    }));

    return {
      contents: [{
        uri,
        text: JSON.stringify(entities, null, 2),
        mimeType: 'application/json',
      }],
    };
  }
}
```

## Code Analysis Server

An MCP server for code analysis:

```typescript
import { Rikta, Injectable } from '@riktajs/core';
import { registerMCPServer, MCPTool, MCPPrompt, z } from '@riktajs/mcp';
import { promises as fs } from 'fs';
import { glob } from 'glob';

@Injectable()
class CodeAnalysisService {
  @MCPTool({
    name: 'find_files',
    description: 'Find files matching a pattern',
    inputSchema: z.object({
      pattern: z.string().describe('Glob pattern (e.g., **/*.ts)'),
      exclude: z.array(z.string()).optional().default(['node_modules/**']),
    }),
  })
  async findFiles(params: { pattern: string; exclude?: string[] }) {
    const files = await glob(params.pattern, {
      ignore: params.exclude,
      cwd: process.cwd(),
    });

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${files.length} files:\n\n${files.join('\n')}`,
      }],
    };
  }

  @MCPTool({
    name: 'analyze_dependencies',
    description: 'Analyze project dependencies from package.json',
    inputSchema: z.object({
      path: z.string().optional().default('package.json'),
    }),
  })
  async analyzeDependencies(params: { path?: string }) {
    try {
      const content = await fs.readFile(params.path || 'package.json', 'utf-8');
      const pkg = JSON.parse(content);

      const deps = Object.entries(pkg.dependencies || {});
      const devDeps = Object.entries(pkg.devDependencies || {});

      return {
        content: [{
          type: 'text' as const,
          text: `📦 ${pkg.name}@${pkg.version}\n\n` +
                `Dependencies (${deps.length}):\n` +
                deps.map(([name, version]) => `  - ${name}: ${version}`).join('\n') +
                `\n\nDev Dependencies (${devDeps.length}):\n` +
                devDeps.map(([name, version]) => `  - ${name}: ${version}`).join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }

  @MCPTool({
    name: 'count_lines',
    description: 'Count lines of code in files',
    inputSchema: z.object({
      pattern: z.string().describe('Glob pattern'),
      exclude: z.array(z.string()).optional().default(['node_modules/**', 'dist/**']),
    }),
  })
  async countLines(params: { pattern: string; exclude?: string[] }) {
    const files = await glob(params.pattern, {
      ignore: params.exclude,
      cwd: process.cwd(),
    });

    let totalLines = 0;
    let totalFiles = 0;
    const breakdown: Record<string, number> = {};

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n').length;
        totalLines += lines;
        totalFiles++;

        const ext = file.split('.').pop() || 'unknown';
        breakdown[ext] = (breakdown[ext] || 0) + lines;
      } catch {
        // Skip unreadable files
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: `📊 Code Statistics\n\n` +
              `Total Files: ${totalFiles}\n` +
              `Total Lines: ${totalLines}\n\n` +
              `By Extension:\n` +
              Object.entries(breakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([ext, lines]) => `  .${ext}: ${lines} lines`)
                .join('\n'),
      }],
    };
  }

  @MCPPrompt({
    name: 'refactor_code',
    description: 'Generate a refactoring prompt',
    arguments: [
      { name: 'code', description: 'Code to refactor', required: true },
      { name: 'goal', description: 'Refactoring goal (performance, readability, etc.)' },
    ],
  })
  async refactorPrompt(args: { code: string; goal?: string }) {
    const goalInstruction = args.goal 
      ? `Focus on improving: ${args.goal}` 
      : 'Improve overall code quality';

    return {
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please refactor this code. ${goalInstruction}

Provide:
1. The refactored code
2. Explanation of changes
3. Benefits of the refactoring

\`\`\`
${args.code}
\`\`\``,
        },
      }],
    };
  }

  @MCPPrompt({
    name: 'add_types',
    description: 'Generate TypeScript types for code',
    arguments: [
      { name: 'code', description: 'JavaScript or TypeScript code', required: true },
    ],
  })
  async addTypesPrompt(args: { code: string }) {
    return {
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please add proper TypeScript types to this code:

1. Add type annotations to function parameters and return types
2. Create interfaces/types for complex objects
3. Use generics where appropriate
4. Ensure strict type safety

\`\`\`typescript
${args.code}
\`\`\``,
        },
      }],
    };
  }
}

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  await registerMCPServer(app, {
    serverInfo: { name: 'code-analysis-server', version: '1.0.0' },
    instructions: 'Code analysis tools: find files, analyze dependencies, count lines.',
  });

  await app.listen();
  console.log('🤖 Code Analysis MCP Server: http://localhost:3000/mcp');
}

bootstrap();
```

## Multi-Service Application

Combining multiple MCP services in one application:

```typescript
import { Rikta } from '@riktajs/core';
import { registerMCPServer } from '@riktajs/mcp';
import { swaggerPlugin } from '@riktajs/swagger';

// Import your MCP services (auto-discovered via @Injectable)
import './services/file.mcp-service';
import './services/database.mcp-service';
import './services/analytics.mcp-service';

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  // Swagger for REST API docs
  await app.server.register(swaggerPlugin, {
    info: { title: 'My API', version: '1.0.0' },
  });

  // MCP for AI integration
  await registerMCPServer(app, {
    serverInfo: { name: 'full-stack-backend', version: '1.0.0' },
    instructions: `
      Complete backend server with:
      - File operations
      - Database queries
      - Analytics
    `,
    enableSSE: true,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
    },
  });

  await app.listen();
  
  console.log('🚀 Server running on http://localhost:3000');
  console.log('📚 Swagger: http://localhost:3000/docs');
  console.log('🤖 MCP: http://localhost:3000/mcp');
}

bootstrap();
```

## Testing Your MCP Server

### Using MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

### Using curl

```bash
# Initialize
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0.0"},"capabilities":{}}}'

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_files","arguments":{"path":"."}}}'
```

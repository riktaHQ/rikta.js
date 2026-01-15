---
sidebar_position: 3
---

# Resources

MCP Resources expose data sources that AI assistants can read from. They are ideal for providing context, documentation, or structured data to AI.

## The @MCPResource Decorator

Use `@MCPResource` to mark a method as an MCP resource provider:

```typescript
import { Injectable } from '@riktajs/core';
import { MCPResource } from '@riktajs/mcp';

@Injectable()
class DocumentService {
  @MCPResource({
    uriPattern: 'docs://readme',
    name: 'README',
    description: 'Project README documentation',
    mimeType: 'text/markdown',
  })
  async getReadme(uri: string) {
    const content = await fs.readFile('README.md', 'utf-8');
    return {
      contents: [{
        uri,
        text: content,
        mimeType: 'text/markdown',
      }],
    };
  }
}
```

## Resource Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `uriPattern` | `string` | ✅ | URI pattern for the resource |
| `name` | `string` | ✅ | Human-readable name |
| `description` | `string` | ✅ | Description of the resource |
| `mimeType` | `string` | ❌ | MIME type of the content |

## Return Format

Resources must return a `ReadResourceResult` object:

```typescript
interface ReadResourceResult {
  contents: Array<{
    uri: string;              // The resource URI
    text?: string;            // Text content
    blob?: string;            // Base64 binary content
    mimeType?: string;        // Content MIME type
  }>;
}
```

## URI Patterns

Resources use URI patterns to identify them. The pattern can include query parameters:

```typescript
// Simple URI
@MCPResource({ uriPattern: 'config://app', ... })

// URI with query parameters
@MCPResource({ uriPattern: 'file://read', ... })
// Access via: file://read?path=/etc/hosts

// Dynamic segments  
@MCPResource({ uriPattern: 'user://profile', ... })
// Access via: user://profile?id=123
```

## Complete Examples

### File Reader

```typescript
import { Injectable } from '@riktajs/core';
import { MCPResource } from '@riktajs/mcp';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
class FileResourceService {
  @MCPResource({
    uriPattern: 'file://read',
    name: 'Read File',
    description: 'Read file contents. Use ?path=<filepath> query parameter.',
    mimeType: 'text/plain',
  })
  async readFile(uri: string) {
    const url = new URL(uri);
    const filePath = url.searchParams.get('path');

    if (!filePath) {
      return {
        contents: [{
          uri,
          text: 'Error: No path specified. Use ?path=<filepath>',
          mimeType: 'text/plain',
        }],
      };
    }

    try {
      const fullPath = join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      // Detect MIME type
      let mimeType = 'text/plain';
      if (filePath.endsWith('.json')) mimeType = 'application/json';
      if (filePath.endsWith('.md')) mimeType = 'text/markdown';
      if (filePath.endsWith('.ts')) mimeType = 'text/typescript';
      if (filePath.endsWith('.js')) mimeType = 'text/javascript';

      return {
        contents: [{
          uri,
          text: content,
          mimeType,
        }],
      };
    } catch (error) {
      return {
        contents: [{
          uri,
          text: `Error reading file: ${(error as Error).message}`,
          mimeType: 'text/plain',
        }],
      };
    }
  }
}
```

### Database Resource

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { MCPResource } from '@riktajs/mcp';
import { UserRepository } from './user.repository';

@Injectable()
class DatabaseResourceService {
  @Autowired()
  private userRepository!: UserRepository;

  @MCPResource({
    uriPattern: 'db://users',
    name: 'Users Database',
    description: 'Query users. Use ?limit=N&offset=M for pagination.',
    mimeType: 'application/json',
  })
  async getUsers(uri: string) {
    const url = new URL(uri);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const users = await this.userRepository.find({
      take: limit,
      skip: offset,
    });

    return {
      contents: [{
        uri,
        text: JSON.stringify(users, null, 2),
        mimeType: 'application/json',
      }],
    };
  }

  @MCPResource({
    uriPattern: 'db://user',
    name: 'User Details',
    description: 'Get user by ID. Use ?id=<userId>',
    mimeType: 'application/json',
  })
  async getUser(uri: string) {
    const url = new URL(uri);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return {
        contents: [{
          uri,
          text: JSON.stringify({ error: 'No user ID specified' }),
          mimeType: 'application/json',
        }],
      };
    }

    const user = await this.userRepository.findById(userId);

    return {
      contents: [{
        uri,
        text: JSON.stringify(user, null, 2),
        mimeType: 'application/json',
      }],
    };
  }
}
```

### Configuration Resource

```typescript
import { Injectable } from '@riktajs/core';
import { MCPResource } from '@riktajs/mcp';

@Injectable()
class ConfigResourceService {
  @MCPResource({
    uriPattern: 'config://app',
    name: 'Application Configuration',
    description: 'Current application configuration (sanitized)',
    mimeType: 'application/json',
  })
  async getConfig(uri: string) {
    // Return sanitized config (no secrets!)
    const safeConfig = {
      appName: process.env.APP_NAME || 'MyApp',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      features: {
        caching: process.env.ENABLE_CACHE === 'true',
        rateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
      },
    };

    return {
      contents: [{
        uri,
        text: JSON.stringify(safeConfig, null, 2),
        mimeType: 'application/json',
      }],
    };
  }

  @MCPResource({
    uriPattern: 'config://routes',
    name: 'API Routes',
    description: 'List of all available API routes',
    mimeType: 'application/json',
  })
  async getRoutes(uri: string) {
    const routes = [
      { method: 'GET', path: '/users', description: 'List users' },
      { method: 'GET', path: '/users/:id', description: 'Get user by ID' },
      { method: 'POST', path: '/users', description: 'Create user' },
      { method: 'PUT', path: '/users/:id', description: 'Update user' },
      { method: 'DELETE', path: '/users/:id', description: 'Delete user' },
    ];

    return {
      contents: [{
        uri,
        text: JSON.stringify(routes, null, 2),
        mimeType: 'application/json',
      }],
    };
  }
}
```

### API Documentation Resource

```typescript
import { Injectable } from '@riktajs/core';
import { MCPResource } from '@riktajs/mcp';

@Injectable()
class DocsResourceService {
  @MCPResource({
    uriPattern: 'docs://api',
    name: 'API Documentation',
    description: 'OpenAPI specification for the API',
    mimeType: 'application/json',
  })
  async getApiDocs(uri: string) {
    // Fetch the OpenAPI spec
    const response = await fetch('http://localhost:3000/docs/json');
    const spec = await response.json();

    return {
      contents: [{
        uri,
        text: JSON.stringify(spec, null, 2),
        mimeType: 'application/json',
      }],
    };
  }

  @MCPResource({
    uriPattern: 'docs://changelog',
    name: 'Changelog',
    description: 'Project changelog and release notes',
    mimeType: 'text/markdown',
  })
  async getChangelog(uri: string) {
    const content = await fs.readFile('CHANGELOG.md', 'utf-8');

    return {
      contents: [{
        uri,
        text: content,
        mimeType: 'text/markdown',
      }],
    };
  }
}
```

## Reading Resources from AI

AI assistants read resources using the `resources/read` method:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/read",
    "params": {
      "uri": "file://read?path=package.json"
    }
  }'
```

## Best Practices

1. **Meaningful URIs** - Use descriptive URI patterns like `db://users`, `config://app`
2. **Query parameters** - Use query params for filtering and pagination
3. **Proper MIME types** - Set correct MIME types for content
4. **Error handling** - Return error messages in the content, not exceptions
5. **Security** - Never expose sensitive data like passwords or API keys
6. **Documentation** - Describe how to use query parameters in the description

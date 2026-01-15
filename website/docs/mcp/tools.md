---
sidebar_position: 2
---

# Tools

MCP Tools are functions that AI assistants can call to perform actions. They are the primary way for AI to interact with your backend services.

## The @MCPTool Decorator

Use `@MCPTool` to mark a method as an MCP tool:

```typescript
import { Injectable } from '@riktajs/core';
import { MCPTool, z } from '@riktajs/mcp';

@Injectable()
class FileService {
  @MCPTool({
    name: 'list_files',
    description: 'List files in a directory',
    inputSchema: z.object({
      path: z.string().describe('Directory path to list'),
      showHidden: z.boolean().optional().default(false),
    }),
  })
  async listFiles(params: { path: string; showHidden?: boolean }) {
    // Implementation
    return {
      content: [{
        type: 'text',
        text: `Files in ${params.path}...`,
      }],
    };
  }
}
```

## Tool Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | ✅ | Unique identifier for the tool |
| `description` | `string` | ✅ | Human-readable description |
| `inputSchema` | `ZodSchema` | ❌ | Zod schema for input validation |

## Return Format

Tools must return a `CallToolResult` object:

```typescript
interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;           // For type: 'text'
    data?: string;           // For type: 'image' (base64)
    mimeType?: string;       // For type: 'image'
    resource?: {             // For type: 'resource'
      uri: string;
      text?: string;
      blob?: string;
      mimeType?: string;
    };
  }>;
  isError?: boolean;  // Set to true if the operation failed
}
```

## Zod Schema Examples

### Basic Types

```typescript
import { z } from '@riktajs/mcp';

// String with description
z.string().describe('File path to read')

// Optional with default
z.boolean().optional().default(false)

// Number with constraints
z.number().min(1).max(100).describe('Page number')

// Enum
z.enum(['asc', 'desc']).describe('Sort order')
```

### Object Schemas

```typescript
@MCPTool({
  name: 'create_user',
  description: 'Create a new user',
  inputSchema: z.object({
    name: z.string().min(1).describe('User name'),
    email: z.string().email().describe('Email address'),
    age: z.number().optional().describe('User age'),
    role: z.enum(['admin', 'user', 'guest']).default('user'),
  }),
})
async createUser(params: { name: string; email: string; age?: number; role: string }) {
  // ...
}
```

### Array Schemas

```typescript
@MCPTool({
  name: 'bulk_delete',
  description: 'Delete multiple items',
  inputSchema: z.object({
    ids: z.array(z.string()).min(1).describe('IDs to delete'),
    force: z.boolean().optional().default(false),
  }),
})
async bulkDelete(params: { ids: string[]; force?: boolean }) {
  // ...
}
```

## Complete Examples

### File Operations

```typescript
import { Injectable } from '@riktajs/core';
import { MCPTool, z } from '@riktajs/mcp';
import { promises as fs } from 'fs';

@Injectable()
class FileToolsService {
  @MCPTool({
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: z.object({
      path: z.string().describe('Path to the file to read'),
      encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
    }),
  })
  async readFile(params: { path: string; encoding?: string }) {
    try {
      const content = await fs.readFile(params.path, params.encoding as BufferEncoding);
      return {
        content: [{
          type: 'text' as const,
          text: content,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  @MCPTool({
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: z.object({
      path: z.string().describe('Path to write to'),
      content: z.string().describe('Content to write'),
      append: z.boolean().optional().default(false),
    }),
  })
  async writeFile(params: { path: string; content: string; append?: boolean }) {
    try {
      if (params.append) {
        await fs.appendFile(params.path, params.content);
      } else {
        await fs.writeFile(params.path, params.content);
      }
      return {
        content: [{
          type: 'text' as const,
          text: `Successfully wrote to ${params.path}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }
}
```

### Database Operations

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { MCPTool, z } from '@riktajs/mcp';
import { UserRepository } from './user.repository';

@Injectable()
class UserToolsService {
  @Autowired()
  private userRepository!: UserRepository;

  @MCPTool({
    name: 'search_users',
    description: 'Search for users by name or email',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      limit: z.number().min(1).max(100).optional().default(10),
      offset: z.number().min(0).optional().default(0),
    }),
  })
  async searchUsers(params: { query: string; limit?: number; offset?: number }) {
    const users = await this.userRepository.search(
      params.query,
      params.limit,
      params.offset
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${users.length} users:\n\n` +
              users.map(u => `- ${u.name} (${u.email})`).join('\n'),
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
    const user = await this.userRepository.findById(params.id);
    
    if (!user) {
      return {
        content: [{
          type: 'text' as const,
          text: `User not found: ${params.id}`,
        }],
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
}
```

### API Integration

```typescript
import { Injectable } from '@riktajs/core';
import { MCPTool, z } from '@riktajs/mcp';

@Injectable()
class WeatherService {
  @MCPTool({
    name: 'get_weather',
    description: 'Get current weather for a location',
    inputSchema: z.object({
      city: z.string().describe('City name'),
      country: z.string().length(2).optional().describe('Country code (ISO 3166-1)'),
      units: z.enum(['metric', 'imperial']).optional().default('metric'),
    }),
  })
  async getWeather(params: { city: string; country?: string; units?: string }) {
    const location = params.country 
      ? `${params.city}, ${params.country}` 
      : params.city;

    // Call external weather API
    const response = await fetch(
      `https://api.weather.example.com/current?q=${encodeURIComponent(location)}&units=${params.units}`
    );
    
    if (!response.ok) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to fetch weather for ${location}`,
        }],
        isError: true,
      };
    }

    const data = await response.json();

    return {
      content: [{
        type: 'text' as const,
        text: `Weather in ${location}:\n` +
              `🌡️ Temperature: ${data.temp}°${params.units === 'imperial' ? 'F' : 'C'}\n` +
              `💧 Humidity: ${data.humidity}%\n` +
              `🌤️ Conditions: ${data.description}`,
      }],
    };
  }
}
```

## Error Handling

Always handle errors gracefully and set `isError: true`:

```typescript
@MCPTool({
  name: 'risky_operation',
  description: 'An operation that might fail',
  inputSchema: z.object({
    input: z.string(),
  }),
})
async riskyOperation(params: { input: string }) {
  try {
    const result = await this.performRiskyTask(params.input);
    return {
      content: [{
        type: 'text' as const,
        text: `Success: ${result}`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: ${(error as Error).message}`,
      }],
      isError: true,
    };
  }
}
```

## Best Practices

1. **Descriptive names** - Use clear, action-oriented names like `create_user`, `search_files`
2. **Helpful descriptions** - Explain what the tool does and when to use it
3. **Schema descriptions** - Add `.describe()` to all schema fields
4. **Error handling** - Always catch errors and return `isError: true`
5. **Reasonable defaults** - Use `.optional().default()` for non-essential parameters
6. **Validation** - Use Zod constraints (`.min()`, `.max()`, `.email()`, etc.)

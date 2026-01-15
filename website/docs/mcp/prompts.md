---
sidebar_position: 4
---

# Prompts

MCP Prompts are template prompts that guide AI interactions. They help structure conversations and provide consistent starting points for common tasks.

## The @MCPPrompt Decorator

Use `@MCPPrompt` to mark a method as an MCP prompt template:

```typescript
import { Injectable } from '@riktajs/core';
import { MCPPrompt } from '@riktajs/mcp';

@Injectable()
class PromptService {
  @MCPPrompt({
    name: 'code_review',
    description: 'Generate a code review prompt',
    arguments: [
      { name: 'language', description: 'Programming language', required: true },
      { name: 'code', description: 'Code to review', required: true },
    ],
  })
  async codeReview(args: { language: string; code: string }) {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please review this ${args.language} code:\n\n\`\`\`${args.language}\n${args.code}\n\`\`\``,
        },
      }],
    };
  }
}
```

## Prompt Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | ✅ | Unique identifier for the prompt |
| `description` | `string` | ✅ | Description of what the prompt does |
| `arguments` | `MCPPromptArgument[]` | ❌ | List of prompt arguments |

### MCPPromptArgument

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Argument name |
| `description` | `string` | ❌ | Argument description |
| `required` | `boolean` | ❌ | Whether the argument is required |

## Return Format

Prompts must return a `GetPromptResult` object:

```typescript
interface GetPromptResult {
  description?: string;  // Optional description of the generated prompt
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;       // Base64 for images
      mimeType?: string;
      resource?: { uri: string; text?: string; blob?: string; mimeType?: string; };
    };
  }>;
}
```

## Complete Examples

### Code Review Prompt

```typescript
import { Injectable } from '@riktajs/core';
import { MCPPrompt } from '@riktajs/mcp';

@Injectable()
class CodeReviewPromptsService {
  @MCPPrompt({
    name: 'code_review',
    description: 'Generate a comprehensive code review prompt',
    arguments: [
      { name: 'language', description: 'Programming language', required: true },
      { name: 'code', description: 'Code to review', required: true },
      { name: 'focus', description: 'Specific areas to focus on (security, performance, style)' },
    ],
  })
  async codeReview(args: { language: string; code: string; focus?: string }) {
    const focusArea = args.focus 
      ? `\n\nPlease focus specifically on: ${args.focus}` 
      : '';

    return {
      description: `Code review request for ${args.language} code`,
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please review the following ${args.language} code and provide feedback on:
- Code quality and readability
- Potential bugs or issues
- Best practices adherence
- Suggestions for improvement${focusArea}

\`\`\`${args.language}
${args.code}
\`\`\``,
        },
      }],
    };
  }

  @MCPPrompt({
    name: 'security_review',
    description: 'Generate a security-focused code review prompt',
    arguments: [
      { name: 'code', description: 'Code to review', required: true },
      { name: 'context', description: 'Application context (web, API, CLI)' },
    ],
  })
  async securityReview(args: { code: string; context?: string }) {
    const contextInfo = args.context 
      ? `\n\nApplication context: ${args.context}` 
      : '';

    return {
      description: 'Security code review request',
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please perform a security review of this code. Look for:
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication/authorization issues
- Sensitive data exposure
- Input validation problems
- Insecure dependencies${contextInfo}

\`\`\`
${args.code}
\`\`\``,
        },
      }],
    };
  }
}
```

### Code Explanation Prompt

```typescript
@Injectable()
class ExplainCodePromptsService {
  @MCPPrompt({
    name: 'explain_code',
    description: 'Generate a prompt to explain code',
    arguments: [
      { name: 'code', description: 'Code to explain', required: true },
      { name: 'detail_level', description: 'Level of detail: brief, normal, detailed' },
      { name: 'audience', description: 'Target audience: beginner, intermediate, expert' },
    ],
  })
  async explainCode(args: { code: string; detail_level?: string; audience?: string }) {
    const level = args.detail_level || 'normal';
    const audience = args.audience || 'intermediate';

    const detailInstruction = {
      brief: 'Provide a brief, high-level explanation in 2-3 sentences.',
      normal: 'Provide a clear and comprehensive explanation.',
      detailed: 'Provide a detailed, line-by-line explanation.',
    }[level];

    const audienceInstruction = {
      beginner: 'Explain as if to someone new to programming. Avoid jargon.',
      intermediate: 'Assume the reader has basic programming knowledge.',
      expert: 'You can use technical terms and assume deep knowledge.',
    }[audience];

    return {
      description: `Code explanation request (${level} detail, ${audience} audience)`,
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please explain what the following code does.

${detailInstruction}
${audienceInstruction}

\`\`\`
${args.code}
\`\`\``,
        },
      }],
    };
  }
}
```

### Documentation Prompt

```typescript
@Injectable()
class DocumentationPromptsService {
  @MCPPrompt({
    name: 'generate_docs',
    description: 'Generate documentation for code',
    arguments: [
      { name: 'code', description: 'Code to document', required: true },
      { name: 'style', description: 'Documentation style: jsdoc, markdown, readme' },
    ],
  })
  async generateDocs(args: { code: string; style?: string }) {
    const style = args.style || 'jsdoc';

    const styleInstruction = {
      jsdoc: 'Generate JSDoc comments for all functions, classes, and methods.',
      markdown: 'Generate markdown documentation with examples.',
      readme: 'Generate a README.md style documentation.',
    }[style] || 'Generate appropriate documentation.';

    return {
      description: `Documentation generation request (${style} style)`,
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please generate documentation for this code.

${styleInstruction}

Include:
- Description of purpose
- Parameter descriptions
- Return value descriptions
- Usage examples

\`\`\`
${args.code}
\`\`\``,
        },
      }],
    };
  }

  @MCPPrompt({
    name: 'generate_tests',
    description: 'Generate test cases for code',
    arguments: [
      { name: 'code', description: 'Code to test', required: true },
      { name: 'framework', description: 'Test framework: jest, vitest, mocha' },
    ],
  })
  async generateTests(args: { code: string; framework?: string }) {
    const framework = args.framework || 'vitest';

    return {
      description: `Test generation request (${framework})`,
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please generate comprehensive test cases for this code using ${framework}.

Include:
- Unit tests for all functions
- Edge case testing
- Error handling tests
- Mock setup if needed

\`\`\`
${args.code}
\`\`\``,
        },
      }],
    };
  }
}
```

### Conversation Starters

```typescript
@Injectable()
class ConversationPromptsService {
  @MCPPrompt({
    name: 'project_overview',
    description: 'Start a conversation about the project',
    arguments: [],
  })
  async projectOverview() {
    return {
      description: 'Project overview conversation starter',
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I'd like to understand this project better. Can you:

1. Summarize the project's purpose and main features
2. Explain the technology stack being used
3. Describe the folder structure and architecture
4. Identify the main entry points and key files
5. Highlight any interesting patterns or best practices used`,
        },
      }],
    };
  }

  @MCPPrompt({
    name: 'debug_help',
    description: 'Get help debugging an issue',
    arguments: [
      { name: 'error', description: 'Error message or description', required: true },
      { name: 'context', description: 'What you were trying to do' },
    ],
  })
  async debugHelp(args: { error: string; context?: string }) {
    const contextInfo = args.context 
      ? `\n\nContext: ${args.context}` 
      : '';

    return {
      description: 'Debugging assistance request',
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I'm encountering an error and need help debugging it.${contextInfo}

Error:
\`\`\`
${args.error}
\`\`\`

Please:
1. Explain what this error means
2. Identify the likely cause
3. Suggest how to fix it
4. Provide code examples if helpful`,
        },
      }],
    };
  }
}
```

## Using Prompts from AI

AI assistants get prompts using the `prompts/get` method:

```bash
# List available prompts
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "prompts/list",
    "params": {}
  }'

# Get a specific prompt
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "prompts/get",
    "params": {
      "name": "code_review",
      "arguments": {
        "language": "typescript",
        "code": "function add(a, b) { return a + b; }"
      }
    }
  }'
```

## Best Practices

1. **Clear descriptions** - Describe what the prompt does and when to use it
2. **Structured output** - Use consistent message formatting
3. **Flexible arguments** - Make non-essential arguments optional
4. **Context inclusion** - Include relevant context in the prompt
5. **Actionable requests** - End with clear asks/instructions
6. **Examples** - Include examples when helpful

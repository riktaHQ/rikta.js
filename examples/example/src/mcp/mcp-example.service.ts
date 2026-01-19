/**
 * Example MCP Service for Rikta
 * 
 * Demonstrates how to use @MCPTool, @MCPResource, and @MCPPrompt decorators
 * to expose your services to AI assistants via Model Context Protocol.
 */
import { Injectable, z } from '@riktajs/core';
import { MCPTool, MCPResource, MCPPrompt} from '@riktajs/mcp';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class MCPExampleService {
  /**
   * MCP Tool: List files in a directory
   */
  @MCPTool({
    name: 'list_files',
    description: 'List files and directories in a given path',
    inputSchema: z.object({
      path: z.string()
        .describe('The directory path to list files from (defaults to current directory)')
        .optional()
        .default('.'),
      showHidden: z.boolean()
        .describe('Whether to show hidden files (files starting with .)')
        .optional()
        .default(false),
    }),
  })
  async listFiles(params: { path?: string; showHidden?: boolean }) {
    const { path = '.', showHidden = false } = params;

    try {
      const fullPath = join(process.cwd(), path);
      const items = await fs.readdir(fullPath, { withFileTypes: true });

      const filteredItems = items.filter(item => {
        if (!showHidden && item.name.startsWith('.')) {
          return false;
        }
        return true;
      });

      const fileList = filteredItems.map(item => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
      }));

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${fileList.length} items in ${path}:\n\n` +
                fileList.map(item => 
                  `${item.type === 'directory' ? '📁' : '📄'} ${item.name}`
                ).join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing files: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * MCP Tool: Get file information
   */
  @MCPTool({
    name: 'get_file_info',
    description: 'Get detailed information about a file or directory',
    inputSchema: z.object({
      path: z.string().describe('The file or directory path to get info about'),
    }),
  })
  async getFileInfo(params: { path: string }) {
    const { path } = params;

    try {
      const fullPath = join(process.cwd(), path);
      const stats = await fs.stat(fullPath);

      return {
        content: [{
          type: 'text' as const,
          text: `File info for ${path}:\n\n` +
                `Type: ${stats.isDirectory() ? 'Directory' : 'File'}\n` +
                `Size: ${stats.size} bytes\n` +
                `Modified: ${stats.mtime.toISOString()}\n` +
                `Created: ${stats.birthtime.toISOString()}\n` +
                `Permissions: ${stats.mode.toString(8)}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting file info: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * MCP Resource: Read file contents
   */
  @MCPResource({
    uriPattern: 'file://read',
    name: 'Read File',
    description: 'Read the contents of a file. Use ?path=<filepath> to specify the file.',
    mimeType: 'text/plain',
  })
  async readFile(uri: string) {
    const url = new URL(uri);
    const filePath = url.searchParams.get('path');

    if (!filePath) {
      return {
        contents: [{
          uri,
          text: 'Error: No file path specified. Use ?path=<filepath>',
          mimeType: 'text/plain',
        }],
      };
    }

    try {
      const fullPath = join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      return {
        contents: [{
          uri,
          text: content,
          mimeType: 'text/plain',
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

  /**
   * MCP Prompt: Code review template
   */
  @MCPPrompt({
    name: 'code_review',
    description: 'Generate a code review prompt for a piece of code',
    arguments: [
      { name: 'language', description: 'Programming language of the code', required: true },
      { name: 'code', description: 'The code to review', required: true },
      { name: 'focus', description: 'Specific areas to focus on (e.g., security, performance)' },
    ],
  })
  async codeReviewPrompt(args: { language: string; code: string; focus?: string }) {
    const focusArea = args.focus 
      ? `\n\nPlease focus specifically on: ${args.focus}` 
      : '';

    return {
      description: `Code review request for ${args.language} code`,
      messages: [
        {
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
        },
      ],
    };
  }

  /**
   * MCP Prompt: Explain code template
   */
  @MCPPrompt({
    name: 'explain_code',
    description: 'Generate a prompt to explain what a piece of code does',
    arguments: [
      { name: 'code', description: 'The code to explain', required: true },
      { name: 'detail_level', description: 'Level of detail: brief, normal, or detailed' },
    ],
  })
  async explainCodePrompt(args: { code: string; detail_level?: string }) {
    const detailInstruction = args.detail_level === 'brief' 
      ? 'Provide a brief, high-level explanation.'
      : args.detail_level === 'detailed'
      ? 'Provide a detailed, line-by-line explanation.'
      : 'Provide a clear and comprehensive explanation.';

    return {
      description: 'Code explanation request',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please explain what the following code does. ${detailInstruction}

\`\`\`
${args.code}
\`\`\``,
          },
        },
      ],
    };
  }
}

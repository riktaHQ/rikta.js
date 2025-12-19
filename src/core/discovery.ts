import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';

/**
 * Default patterns to exclude from discovery
 */
const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts',
];

/**
 * Regex patterns to detect Rikta decorators
 */
const DECORATOR_PATTERNS = [
  /@Controller\s*\(/,    // @Controller() or @Controller('/path')
  /@Injectable\s*\(/,    // @Injectable() or @Injectable({ scope: 'singleton' })
  /@Provider\s*\(/,      // @Provider(TOKEN)
];

/**
 * Check if a file contains Rikta decorators (@Controller, @Injectable, or @Provider)
 */
async function containsRiktaDecorators(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return DECORATOR_PATTERNS.some(pattern => pattern.test(content));
  } catch {
    return false;
  }
}

/**
 * Discover and import modules matching the given patterns
 * 
 * Only imports files that contain @Controller, @Injectable, or @Provider decorators.
 * 
 * @param patterns - Glob patterns to search for files (default: ['./**'])
 * @param cwd - Base directory for pattern matching (default: process.cwd())
 * @returns Promise resolving to list of imported files
 * 
 * @example
 * ```typescript
 * // Scan specific directories
 * await discoverModules(['./src/controllers', './src/services']);
 * 
 * // Scan everything (default)
 * await discoverModules();
 * ```
 */
export async function discoverModules(
  patterns: string[] = ['./**/*.{ts,js}'],
  cwd: string = process.cwd()
): Promise<string[]> {
  // Normalize patterns to include file extensions if not present
  const normalizedPatterns = patterns.map(pattern => {
    // If pattern already has extension, use as-is
    if (/\.\w+$/.test(pattern) || pattern.endsWith('*')) {
      return pattern;
    }
    // Add file extension pattern
    return pattern.endsWith('/') 
      ? `${pattern}**/*.{ts,js}` 
      : `${pattern}/**/*.{ts,js}`;
  });

  // Find all matching files
  const files = await fg(normalizedPatterns, {
    cwd,
    absolute: true,
    ignore: DEFAULT_IGNORE_PATTERNS,
    onlyFiles: true,
  });

  // Filter files that contain Rikta decorators
  const riktaFiles: string[] = [];
  
  for (const file of files) {
    if (await containsRiktaDecorators(file)) {
      riktaFiles.push(file);
    }
  }

  // Import only files with decorators
  const importedFiles: string[] = [];
  
  for (const file of riktaFiles) {
    try {
      // Convert to proper import path
      const importPath = file.replace(/\.ts$/, '');
      await import(importPath);
      importedFiles.push(file);
    } catch (error) {
      // Log but don't fail - some files might have import errors
      if (process.env.DEBUG) {
        console.warn(`[Rikta] Failed to import ${file}:`, error);
      }
    }
  }

  return importedFiles;
}

/**
 * Get the caller's directory (useful for relative pattern resolution)
 */
export function getCallerDirectory(): string {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    const err = new Error();
    let callerFile: string | undefined;
    
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = err.stack as unknown as NodeJS.CallSite[];
    
    // Find the first file that's not this module
    for (const site of stack) {
      const filename = site.getFileName();
      if (filename && !filename.includes('discovery.ts') && !filename.includes('application.ts')) {
        callerFile = filename;
        break;
      }
    }
    
    if (callerFile) {
      // Handle file:// URLs (ESM) and regular paths
      const filePath = callerFile.startsWith('file://') 
        ? new URL(callerFile).pathname 
        : callerFile;
      return path.dirname(filePath);
    }
    
    return process.cwd();
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}

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
  '**/benchmarks/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts',
];

/**
 * Get the entry point directory of the application.
 * 
 * Uses process.argv[1] which contains the path to the main script being executed.
 * This is the cleanest way to determine the user's project directory when
 * rikta-core is installed in node_modules.
 * 
 * Falls back to process.cwd() if argv[1] is not available.
 */
function getEntryPointDirectory(): string {
  const mainScript = process.argv[1];
  
  if (mainScript) {
    // Handle file:// URLs (ESM) and regular paths
    const filePath = mainScript.startsWith('file://') 
      ? new URL(mainScript).pathname 
      : mainScript;
    return path.dirname(filePath);
  }
  
  // Fallback to current working directory
  return process.cwd();
}

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
 * @param patterns - Glob patterns or directory paths to search for files (default: ['./**'])
 * @param cwd - Base directory for pattern matching. If not provided, it will be
 *              automatically resolved from the caller's location (useful when rikta-core
 *              is used as an external library from node_modules)
 * @returns Promise resolving to list of imported files
 * 
 * @example
 * ```typescript
 * // Scan specific directories (relative paths resolved from caller's location)
 * await discoverModules(['./src/controllers', './src/services']);
 * 
 * // Scan with absolute path
 * await discoverModules(['/absolute/path/to/src']);
 * 
 * // Scan everything (default)
 * await discoverModules();
 * ```
 */
export async function discoverModules(
  patterns: string[] = ['./**/*.{ts,js}'],
  cwd?: string
): Promise<string[]> {
  // If no cwd provided, use the entry point directory (where the main script is)
  // This is crucial when rikta-core is installed in node_modules
  const baseDir = cwd ?? getEntryPointDirectory();
  
  // Resolve the base directory to absolute if needed
  const absoluteBaseDir = path.isAbsolute(baseDir) 
    ? baseDir 
    : path.resolve(process.cwd(), baseDir);

  // Normalize patterns to include file extensions if not present
  const normalizedPatterns = patterns.map(pattern => {
    // Resolve the pattern if it's an absolute path
    // For absolute paths, we need to make them relative to cwd for fast-glob
    let normalizedPattern = pattern;
    
    if (path.isAbsolute(pattern)) {
      // Convert absolute path to relative from baseDir
      normalizedPattern = path.relative(absoluteBaseDir, pattern);
      if (!normalizedPattern.startsWith('.')) {
        normalizedPattern = './' + normalizedPattern;
      }
    }
    
    // If pattern already has extension, use as-is
    if (/\.\w+$/.test(normalizedPattern) || normalizedPattern.endsWith('*')) {
      return normalizedPattern;
    }
    // Add file extension pattern
    return normalizedPattern.endsWith('/') 
      ? `${normalizedPattern}**/*.{ts,js}` 
      : `${normalizedPattern}/**/*.{ts,js}`;
  });

  // Find all matching files
  const files = await fg(normalizedPatterns, {
    cwd: absoluteBaseDir,
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
 * Get the entry point directory (where the main script is located)
 * 
 * This uses process.argv[1] to determine the directory of the script
 * that started the Node.js process. This works correctly when rikta-core
 * is installed as an external library in node_modules.
 * 
 * @returns The directory of the main script, or process.cwd() as fallback
 */
export function getCallerDirectory(): string {
  return getEntryPointDirectory();
}

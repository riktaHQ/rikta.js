import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { DiscoveryException, DiscoveryFailure, DiscoveryOptions } from './exceptions/discovery.exception.js';

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
 * Supports both TypeScript source and compiled JavaScript patterns
 */
const DECORATOR_PATTERNS = [
  // TypeScript source patterns
  /@Controller\s*\(/,    // @Controller() or @Controller('/path')
  /@Injectable\s*\(/,    // @Injectable() or @Injectable({ scope: 'singleton' })
  /@Provider\s*\(/,      // @Provider(TOKEN)
  // Compiled JavaScript CommonJS patterns (e.g., (0, core_1.Controller)('/path'))
  /\.\s*Controller\s*\)\s*\(/,
  /\.\s*Injectable\s*\)\s*\(/,
  /\.\s*Provider\s*\)\s*\(/,
  /\.\s*ProviderConfig\s*\)\s*\(/,
  // ESM compiled patterns - import statements with decorators
  /import\s*{\s*[^}]*\bController\b[^}]*}\s*from\s*['"]@riktajs\/core['"]/,
  /import\s*{\s*[^}]*\bInjectable\b[^}]*}\s*from\s*['"]@riktajs\/core['"]/,
  /import\s*{\s*[^}]*\bProvider\b[^}]*}\s*from\s*['"]@riktajs\/core['"]/,
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
 * @param options - Discovery options or glob patterns for backward compatibility
 * @param cwd - Base directory (deprecated, use options.cwd instead)
 * @returns Promise resolving to list of imported files
 * 
 * @example
 * ```typescript
 * // Scan specific directories (relative paths resolved from caller's location)
 * await discoverModules({ patterns: ['./src/controllers', './src/services'] });
 * 
 * // Enable strict mode to throw on import errors
 * await discoverModules({ 
 *   patterns: ['./src'],
 *   strict: true 
 * });
 * 
 * // With error callback
 * await discoverModules({
 *   patterns: ['./src'],
 *   onImportError: (file, err) => console.warn(`Failed: ${file}`)
 * });
 * 
 * // Legacy API (still supported)
 * await discoverModules(['./src/controllers'], '/path/to/project');
 * ```
 */
export async function discoverModules(
  optionsOrPatterns: DiscoveryOptions | string[] = ['./**/*.{ts,js}'],
  cwd?: string
): Promise<string[]> {
  // Normalize input to DiscoveryOptions
  const options: DiscoveryOptions = Array.isArray(optionsOrPatterns)
    ? { patterns: optionsOrPatterns, cwd }
    : optionsOrPatterns;

  const patterns = options.patterns ?? ['./**/*.{ts,js}'];
  const strict = options.strict ?? false;
  const onImportError = options.onImportError;
  
  // If no cwd provided, use the entry point directory (where the main script is)
  // This is crucial when rikta-core is installed in node_modules
  const baseDir = options.cwd ?? cwd ?? getEntryPointDirectory();
  
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

  // Filter files that contain Rikta decorators (parallelized for performance)
  const decoratorChecks = await Promise.all(
    files.map(async file => ({ file, hasDecorators: await containsRiktaDecorators(file) }))
  );
  const riktaFiles = decoratorChecks
    .filter(({ hasDecorators }) => hasDecorators)
    .map(({ file }) => file);

  // Import only files with decorators
  const importedFiles: string[] = [];
  const failedImports: DiscoveryFailure[] = [];
  
  for (const file of riktaFiles) {
    try {
      // Convert to proper import path for ESM
      // For .js files, use the file:// URL format which works in ESM
      // For .ts files (dev mode), remove the extension as ts-node handles it
      let importPath: string;
      if (file.endsWith('.js')) {
        // ESM requires file:// URLs for absolute paths
        importPath = `file://${file}`;
      } else {
        // TypeScript files - remove extension for ts-node compatibility
        importPath = file.replace(/\.ts$/, '');
      }
      await import(importPath);
      importedFiles.push(file);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Call error callback if provided
      onImportError?.(file, error);
      
      // Log in debug mode
      if (process.env.DEBUG) {
        console.warn(`[Rikta] Failed to import ${file}:`, error.message);
      }
      
      // Track failure for strict mode
      failedImports.push({ filePath: file, error });
    }
  }

  // In strict mode, throw if any imports failed
  if (strict && failedImports.length > 0) {
    throw new DiscoveryException(failedImports);
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

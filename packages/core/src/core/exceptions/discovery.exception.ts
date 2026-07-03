/**
 * Discovery Exception
 * 
 * Thrown when auto-discovery of modules fails and strict mode is enabled.
 * Contains detailed information about the failed import.
 * 
 * @example
 * ```typescript
 * // This is thrown when strictDiscovery is enabled and a file fails to import
 * throw new DiscoveryException(
 *   '/path/to/file.ts',
 *   new SyntaxError('Unexpected token')
 * );
 * ```
 */
export class DiscoveryException extends Error {
  /**
   * The file path that failed to import
   */
  readonly filePath: string;

  /**
   * The original error that caused the failure
   */
  readonly originalError: Error;

  /**
   * List of all failed imports (for batch reporting)
   */
  readonly failedImports: DiscoveryFailure[];

  constructor(filePath: string, originalError: Error);
  constructor(failures: DiscoveryFailure[]);
  constructor(filePathOrFailures: string | DiscoveryFailure[], originalError?: Error) {
    if (typeof filePathOrFailures === 'string') {
      const filePath = filePathOrFailures;
      const error = originalError!;

      super(
        `[Rikta Discovery] Failed to import module: ${filePath}\n` +
        `Reason: ${error.message}`
      );

      this.filePath = filePath;
      this.originalError = error;
      this.failedImports = [{ filePath, error }];
    } else {
      const failures = filePathOrFailures;
      const fileList = failures.map(f => `  - ${f.filePath}: ${f.error.message}`).join('\n');

      super(
        `[Rikta Discovery] Failed to import ${failures.length} module(s):\n${fileList}`
      );

      this.filePath = failures[0]?.filePath ?? '';
      this.originalError = failures[0]?.error ?? new Error('Unknown error');
      this.failedImports = failures;
    }

    this.name = 'DiscoveryException';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get a formatted report of all failed imports
   */
  getReport(): string {
    const lines = ['Discovery Failures:', ''];

    for (const { filePath, error } of this.failedImports) {
      lines.push(`📁 ${filePath}`);
      lines.push(`   Error: ${error.message}`);
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1, 4);
        lines.push(`   Stack: ${stackLines.join('\n          ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Represents a single failed import during discovery
 */
export interface DiscoveryFailure {
  /** The file path that failed to import */
  filePath: string;

  /** The error that occurred during import */
  error: Error;
}

/**
 * Options for module discovery
 */
export interface DiscoveryOptions {
  /**
   * Glob patterns to search for modules
  * @default smart source-root patterns with recursive fallback
   */
  patterns?: string[];

  /**
   * Base directory for pattern matching
   * If not provided, uses the entry point directory
   */
  cwd?: string;

  /**
   * If true, throws DiscoveryException when any import fails
   * If false (default), logs warnings and continues
   * 
   * @default false
   */
  strict?: boolean;

  /**
   * Callback for handling individual import failures
   * Called for each failed import regardless of strict mode
   */
  onImportError?: (filePath: string, error: Error) => void;
}

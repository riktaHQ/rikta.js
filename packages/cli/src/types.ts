/**
 * Shared types for @riktajs/cli
 */

/**
 * Base options that all commands receive
 */
export interface BaseCommandOptions {
  verbose: boolean;
}

/**
 * Options for the 'new' command
 */
export interface NewCommandOptions extends BaseCommandOptions {
  template: string;
  skipInstall: boolean;
}

/**
 * Options for the 'dev' command
 */
export interface DevCommandOptions extends BaseCommandOptions {
  port: string;
  host: string;
  watch: boolean;
}

/**
 * Options for the 'build' command
 */
export interface BuildCommandOptions extends BaseCommandOptions {
  minify: boolean;
  sourcemap: boolean;
  clean: boolean;
  outDir: string;
}

/**
 * CLI error with exit code
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

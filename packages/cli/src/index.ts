#!/usr/bin/env node
/**
 * @riktajs/cli - CLI tool for Rikta framework
 *
 * Commands:
 * - rikta new <project_name>  : Create a new Rikta project
 * - rikta dev                 : Run development server with hot reload
 * - rikta build               : Build for production/serverless
 */

import chalk from 'chalk';
import { setupCLI } from './cli.js';
import { CLIError } from './types.js';

async function main(): Promise<void> {
  const cli = setupCLI();

  try {
    await cli.parseAsync(process.argv);
  } catch (error) {
    const verbose = cli.opts().verbose;

    if (error instanceof CLIError) {
      console.error(chalk.red(`\n✖ ${error.message}`));
      if (verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(error.exitCode);
    }

    if (error instanceof Error) {
      console.error(chalk.red(`\n✖ Error: ${error.message}`));
      if (verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red('\n✖ An unexpected error occurred'));
      if (verbose) {
        console.error(chalk.gray(String(error)));
      }
    }
    process.exit(1);
  }
}

main();

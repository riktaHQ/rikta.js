import { Command } from 'commander';
import { handleNew } from './commands/new.js';
import { handleDev } from './commands/dev.js';
import { handleBuild } from './commands/build.js';
import type { NewCommandOptions, DevCommandOptions, BuildCommandOptions } from './types.js';

const VERSION = '0.1.0';

// Re-export types for external usage
export type { NewCommandOptions, DevCommandOptions, BuildCommandOptions } from './types.js';
export { CLIError } from './types.js';

export function setupCLI(): Command {
  const program = new Command();

  program
    .name('rikta')
    .description('CLI tool for Rikta framework - scaffold, develop and build projects')
    .version(VERSION, '-v, --version', 'Output the current version')
    .option('-V, --verbose', 'Enable verbose output for debugging', false);

  // Command: rikta new <project_name>
  program
    .command('new <projectName>')
    .alias('create')
    .description('Create a new Rikta project')
    .option('-t, --template <template>', 'Project template to use', 'default')
    .option('--skip-install', 'Skip npm install after project creation', false)
    .action(async (projectName: string, options) => {
      const verbose = program.opts().verbose as boolean;
      const commandOptions: NewCommandOptions = {
        template: options.template,
        skipInstall: options.skipInstall,
        verbose,
      };
      await handleNew(projectName, commandOptions);
    });

  // Command: rikta dev
  program
    .command('dev')
    .alias('serve')
    .description('Start development server with hot reload')
    .option('-p, --port <port>', 'Port to run the server on', '3000')
    .option('-H, --host <host>', 'Host to bind the server to', '0.0.0.0')
    .option('--no-watch', 'Disable file watching')
    .action(async (options) => {
      const verbose = program.opts().verbose as boolean;
      const commandOptions: DevCommandOptions = {
        port: options.port,
        host: options.host,
        watch: options.watch,
        verbose,
      };
      await handleDev(commandOptions);
    });

  // Command: rikta build
  program
    .command('build')
    .description('Build project for production/serverless deployment')
    .option('--minify', 'Minify output (remove comments)', true)
    .option('--sourcemap', 'Generate source maps', false)
    .option('--clean', 'Clean output folder before build', true)
    .option('-o, --outDir <dir>', 'Output directory', 'dist')
    .action(async (options) => {
      const verbose = program.opts().verbose as boolean;
      const commandOptions: BuildCommandOptions = {
        minify: options.minify,
        sourcemap: options.sourcemap,
        clean: options.clean,
        outDir: options.outDir,
        verbose,
      };
      await handleBuild(commandOptions);
    });

  return program;
}

import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { createLogger } from '../utils/logger.js';
import { isRiktaProject } from '../utils/project.js';
import type { DevCommandOptions } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serverProcess: any = null;
let isRestarting = false;

async function checkNodeModules(cwd: string): Promise<boolean> {
  const nodeModulesPath = path.join(cwd, 'node_modules');
  return fs.pathExists(nodeModulesPath);
}

async function waitForDistFolder(distPath: string, timeout = 30000): Promise<boolean> {
  const startTime = Date.now();
  const indexPath = path.join(distPath, 'index.js');

  while (Date.now() - startTime < timeout) {
    if (await fs.pathExists(indexPath)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

function startServer(distPath: string, port: string, host: string, verbose: boolean): void {
  const logger = createLogger(verbose);
  const entryPoint = path.join(distPath, 'index.js');

  logger.debug(`Starting server from ${entryPoint} on ${host}:${port}`);

  serverProcess = execa('node', [entryPoint], {
    env: { ...process.env, PORT: port, HOST: host },
    stdio: 'inherit',
    reject: false,
  });

  serverProcess.then(() => {
    if (!isRestarting) {
      logger.debug('Server process ended');
    }
  }).catch((err: Error) => {
    if (!isRestarting) {
      logger.debug(`Server error: ${err.message}`);
    }
  });
}

function killServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverProcess && typeof serverProcess.kill === 'function') {
      isRestarting = true;
      serverProcess.kill('SIGTERM');

      // Give it a moment to terminate gracefully
      setTimeout(() => {
        if (serverProcess) {
          serverProcess.kill('SIGKILL');
        }
        serverProcess = null;
        isRestarting = false;
        resolve();
      }, 500);
    } else {
      resolve();
    }
  });
}

async function restartServer(distPath: string, port: string, host: string, verbose: boolean): Promise<void> {
  const logger = createLogger(verbose);

  logger.info('🔄 Restarting server...');
  await killServer();

  // Small delay to ensure port is released
  await new Promise((resolve) => setTimeout(resolve, 300));

  startServer(distPath, port, host, verbose);
  logger.success(`Server restarted on http://${host}:${port}`);
}

export async function handleDev(options: DevCommandOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const cwd = process.cwd();

  logger.banner('Rikta Development Server');
  logger.newLine();

  // Verify we're in a Rikta project
  logger.step(1, 4, 'Checking project...');
  if (!await isRiktaProject(cwd)) {
    logger.error('This command must be run from a Rikta project directory.');
    logger.info('Make sure your package.json has @riktajs/core as a dependency.');
    process.exit(1);
  }
  logger.success('Rikta project detected');

  // Check for node_modules
  logger.step(2, 4, 'Checking dependencies...');
  if (!await checkNodeModules(cwd)) {
    logger.warn('node_modules not found. Running npm install...');
    try {
      await execa('npm', ['install'], {
        cwd,
        stdio: options.verbose ? 'inherit' : 'pipe',
      });
      logger.success('Dependencies installed');
    } catch (error) {
      logger.error('Failed to install dependencies. Please run "npm install" manually.');
      process.exit(1);
    }
  } else {
    logger.success('Dependencies found');
  }

  // Start TypeScript compiler
  logger.step(3, 4, 'Starting TypeScript compiler...');
  logger.debug(`Watch mode: ${options.watch}`);

  const distPath = path.join(cwd, 'dist');
  let serverStarted = false;
  let compilationCount = 0;

  try {
    if (options.watch) {
      // Watch mode with auto-restart
      const tscArgs = ['tsc', '--watch', '--incremental', '--preserveWatchOutput'];

      const tscProcess = execa('npx', tscArgs, {
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Handle graceful shutdown
      const cleanup = async () => {
        logger.newLine();
        logger.info('Shutting down...');
        await killServer();
        if (tscProcess && typeof tscProcess.kill === 'function') {
          tscProcess.kill('SIGTERM');
        }
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Monitor tsc output to detect compilation completion
      if (tscProcess.stdout) {
        tscProcess.stdout.on('data', async (data: Buffer) => {
          const output = data.toString();

          if (options.verbose) {
            process.stdout.write(output);
          }

          // TypeScript outputs this when compilation is complete
          if (output.includes('Watching for file changes') ||
              output.includes('Found 0 errors')) {
            compilationCount++;

            if (!serverStarted) {
              // First compilation - start server
              logger.step(4, 4, `Starting server on port ${options.port}...`);

              // Wait for dist/index.js to exist
              const distReady = await waitForDistFolder(distPath, 10000);
              if (!distReady) {
                logger.error('Compilation seems complete but dist/index.js not found');
                return;
              }

              startServer(distPath, options.port, options.host, options.verbose);
              serverStarted = true;
              logger.success(`Server running on http://${options.host}:${options.port}`);
              logger.newLine();
              logger.info('👀 Watching for file changes... (Ctrl+C to stop)');
            } else {
              // Subsequent compilations - restart server
              logger.debug(`Compilation #${compilationCount} complete`);
              await restartServer(distPath, options.port, options.host, options.verbose);
            }
          }

          // Show compilation errors
          if (output.includes('error TS')) {
            logger.error('TypeScript compilation error:');
            console.log(output);
          }
        });
      }

      if (tscProcess.stderr) {
        tscProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          if (options.verbose || output.includes('error')) {
            process.stderr.write(output);
          }
        });
      }

      // Keep process running
      await tscProcess;

    } else {
      // Non-watch mode: compile once, then start
      const tscProcess = execa('npx', ['tsc'], {
        cwd,
        stdio: options.verbose ? 'inherit' : 'pipe',
      });

      await tscProcess;
      logger.success('TypeScript compilation complete');

      logger.step(4, 4, `Starting server on port ${options.port}...`);

      const distReady = await waitForDistFolder(distPath, 5000);
      if (!distReady) {
        logger.error('Compilation complete but dist/index.js not found');
        process.exit(1);
      }

      logger.success(`Server running on http://${options.host}:${options.port}`);

      // Start server and wait for it
      serverProcess = execa('node', [path.join(distPath, 'index.js')], {
        env: { ...process.env, PORT: options.port, HOST: options.host },
        stdio: 'inherit',
      });

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        logger.newLine();
        logger.info('Shutting down...');
        await killServer();
        process.exit(0);
      });

      await serverProcess;
    }
  } catch (error) {
    logger.error('Development server failed');
    logger.debug(String(error));
    await killServer();
    process.exit(1);
  }
}

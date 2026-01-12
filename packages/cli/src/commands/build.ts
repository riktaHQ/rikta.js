import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { createLogger } from '../utils/logger.js';
import { isRiktaProject } from '../utils/project.js';
import type { BuildCommandOptions } from '../types.js';

interface BuildStats {
  fileCount: number;
  distSize: string;
  distSizeBytes: number;
  buildTime: number;
}

async function getDirectorySizeBytes(dir: string): Promise<number> {
  let totalSize = 0;

  async function calculateSize(currentPath: string): Promise<void> {
    try {
      const stat = await fs.stat(currentPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(currentPath);
        for (const file of files) {
          await calculateSize(path.join(currentPath, file));
        }
      } else {
        totalSize += stat.size;
      }
    } catch {
      // Ignore errors (e.g., permission denied)
    }
  }

  if (await fs.pathExists(dir)) {
    await calculateSize(dir);
  }

  return totalSize;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function countFiles(dir: string, extension = '.js'): Promise<number> {
  let count = 0;

  async function countRecursive(currentPath: string): Promise<void> {
    try {
      const stat = await fs.stat(currentPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(currentPath);
        for (const file of files) {
          await countRecursive(path.join(currentPath, file));
        }
      } else if (currentPath.endsWith(extension)) {
        count++;
      }
    } catch {
      // Ignore errors
    }
  }

  if (await fs.pathExists(dir)) {
    await countRecursive(dir);
  }

  return count;
}

async function findTsConfig(cwd: string): Promise<string> {
  // Check for tsconfig.build.json first (dedicated build config)
  const buildConfig = path.join(cwd, 'tsconfig.build.json');
  if (await fs.pathExists(buildConfig)) {
    return 'tsconfig.build.json';
  }

  // Fall back to default tsconfig.json
  return 'tsconfig.json';
}

export async function handleBuild(options: BuildCommandOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const cwd = process.cwd();
  const distPath = path.join(cwd, options.outDir);
  const startTime = Date.now();

  logger.newLine();
  logger.title();
  logger.tagline('Building Rikta project...');
  logger.newLine();

  // Verify we're in a Rikta project
  logger.step(1, 5, 'Checking project...');
  if (!await isRiktaProject(cwd)) {
    logger.error('This command must be run from a Rikta project directory.');
    logger.info('Make sure your package.json has @riktajs/core as a dependency.');
    process.exit(1);
  }
  logger.success('Rikta project detected');

  // Find tsconfig
  logger.step(2, 5, 'Detecting TypeScript configuration...');
  const tsConfigFile = await findTsConfig(cwd);
  logger.debug(`Using: ${tsConfigFile}`);

  if (tsConfigFile === 'tsconfig.build.json') {
    logger.success('Using tsconfig.build.json (production config)');
  } else {
    logger.success('Using tsconfig.json');
  }

  // Clean output folder
  if (options.clean) {
    logger.step(3, 5, `Cleaning ${options.outDir} folder...`);
    logger.debug(`Removing ${distPath}`);

    try {
      if (await fs.pathExists(distPath)) {
        await fs.remove(distPath);
        logger.success('Output folder cleaned');
      } else {
        logger.debug('Output folder does not exist, skipping clean');
      }
    } catch (error) {
      logger.warn('Could not clean output folder, continuing anyway...');
      logger.debug(String(error));
    }
  } else {
    logger.step(3, 5, 'Skipping clean (--no-clean)');
  }

  // Build with TypeScript
  logger.step(4, 5, 'Compiling TypeScript...');

  const tscArgs: string[] = ['-p', tsConfigFile];

  // Override outDir if specified differently than tsconfig
  if (options.outDir !== 'dist') {
    tscArgs.push('--outDir', options.outDir);
  }

  // Add build optimizations for serverless
  if (!options.sourcemap) {
    tscArgs.push('--sourceMap', 'false', '--declarationMap', 'false');
  }

  if (options.minify) {
    tscArgs.push('--removeComments');
  }

  logger.debug(`npx tsc ${tscArgs.join(' ')}`);

  try {
    logger.startLoading('Building project...');
    const result = await execa('npx', ['tsc', ...tscArgs], {
      cwd,
      stdio: options.verbose ? 'inherit' : 'pipe',
      reject: false,
    });

    if (result.exitCode !== 0) {
      logger.stopLoading('TypeScript compilation failed', false);
      if (!options.verbose && result.stderr) {
        console.error(result.stderr);
      }
      if (!options.verbose && result.stdout) {
        console.log(result.stdout);
      }
      logger.info('Run with --verbose flag to see detailed errors');
      process.exit(1);
    }

    logger.stopLoading('TypeScript compilation complete');
  } catch (error) {
    logger.stopLoading('TypeScript compilation failed', false);
    logger.debug(String(error));
    process.exit(1);
  }

  const buildTime = Date.now() - startTime;

  // Output summary
  logger.step(5, 5, 'Build summary...');
  logger.newLine();

  try {
    const fileCount = await countFiles(distPath, '.js');
    const distSizeBytes = await getDirectorySizeBytes(distPath);
    const distSize = formatSize(distSizeBytes);

    const stats: BuildStats = {
      fileCount,
      distSize,
      distSizeBytes,
      buildTime,
    };

    logger.success('Build completed successfully!');
    logger.newLine();

    // Build info
    logger.info(`⏱️  Build time: ${(stats.buildTime / 1000).toFixed(2)}s`);
    logger.info(`📦 Output: ${distPath}`);
    logger.info(`📄 Files: ${stats.fileCount} JavaScript files`);
    logger.info(`📊 Size: ${stats.distSize}`);
    logger.newLine();

    // Optimizations applied
    const optimizations: string[] = [];
    if (!options.sourcemap) {
      optimizations.push('no source maps');
    }
    if (options.minify) {
      optimizations.push('comments removed');
    }

    if (optimizations.length > 0) {
      logger.info(`✨ Optimizations: ${optimizations.join(', ')}`);
    }

  } catch (error) {
    logger.debug(`Could not calculate build stats: ${error}`);
    logger.success('Build completed!');
  }
}

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { execa } from 'execa';
import { createLogger } from '../utils/logger.js';
import { validateProjectName } from '../utils/project.js';
import type { NewCommandOptions } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleNew(
  projectName: string,
  options: NewCommandOptions
): Promise<void> {
  const logger = createLogger(options.verbose);

  logger.newLine();
  logger.title();
  logger.tagline('Making TypeScript services simple (and fast) again');
  logger.newLine();

  // Step 1: Validate project name
  logger.step(1, 4, 'Validating project name...');
  logger.debug(`Project name: ${projectName}`);

  const validation = validateProjectName(projectName);
  if (!validation.valid) {
    logger.error(validation.error!);
    process.exit(1);
  }
  logger.success(`Project name "${projectName}" is valid`);

  // Step 2: Check if directory exists
  logger.step(2, 4, 'Checking target directory...');
  const targetDir = path.resolve(process.cwd(), projectName);
  logger.debug(`Target directory: ${targetDir}`);

  if (await fs.pathExists(targetDir)) {
    logger.error(`Directory "${projectName}" already exists. Please choose a different name or remove the existing directory.`);
    process.exit(1);
  }
  logger.success('Target directory is available');

  // Step 3: Copy template
  logger.step(3, 4, 'Creating project from template...');
  const templateDir = path.resolve(__dirname, '../../templates', options.template);
  logger.debug(`Template directory: ${templateDir}`);

  if (!await fs.pathExists(templateDir)) {
    logger.error(`Template "${options.template}" not found`);
    process.exit(1);
  }

  try {
    await fs.copy(templateDir, targetDir);
    logger.success('Project files created');

    // Update package.json with project name
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.name = projectName;
      packageJson.version = '0.1.0';
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      logger.debug('Updated package.json with project name');
    }
  } catch (error) {
    logger.error('Failed to create project files');
    // Cleanup on failure
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
    }
    throw error;
  }

  // Step 4: Install dependencies (optional)
  if (!options.skipInstall) {
    logger.step(4, 4, 'Installing dependencies...');
    logger.debug('Running npm install...');

    try {
      await execa('npm', ['install'], {
        cwd: targetDir,
        stdio: options.verbose ? 'inherit' : 'pipe',
      });
      logger.success('Dependencies installed');
    } catch (error) {
      logger.warn('Failed to install dependencies. You can run "npm install" manually.');
      logger.debug(String(error));
    }
  } else {
    logger.step(4, 4, 'Skipping dependency installation (--skip-install)');
    logger.debug('Skipped npm install as requested');
  }

  // Success message
  logger.newLine();
  logger.success(`Project "${projectName}" created successfully!`);
  logger.newLine();
  logger.info('Getting started with Rikta');
  logger.info('1. You can configure routes, controllers, and services');
  logger.info('2. Hot reload is enabled by default in development mode');
  logger.info('3. Dependency injection is built-in for clean architecture');
  logger.newLine();
  logger.info('Next steps:');
  logger.info(`  cd ${projectName}`);
  if (options.skipInstall) {
    logger.info('  npm install');
  }
  logger.info('  npm run dev');
  logger.newLine();
}

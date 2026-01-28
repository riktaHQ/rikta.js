import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { execa } from 'execa';
import { select } from '@inquirer/prompts';
import { createLogger } from '../utils/logger.js';
import { validateProjectName } from '../utils/project.js';
import type { NewCommandOptions } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Available project templates
 */
const TEMPLATES = [
  {
    name: 'default',
    value: 'default',
    description: 'Standard Rikta REST API with controllers and services',
  },
  {
    name: 'mcp-server',
    value: 'mcp-server',
    description: 'Minimal MCP server with tool, resource, and prompt examples',
  },
];

/**
 * Prompt user to select a template interactively
 */
async function selectTemplate(): Promise<string> {
  return await select({
    message: 'Select a project template:',
    choices: TEMPLATES,
  });
}

/**
 * Get template-specific getting started messages
 */
function getGettingStartedMessages(template: string): string[] {
  if (template === 'mcp-server') {
    return [
      '1. Your MCP server exposes tools, resources, and prompts for AI assistants',
      '2. The MCP endpoint will be available at http://localhost:3000/mcp',
      '3. Connect Claude Desktop or other MCP clients to interact with your server',
    ];
  }

  return [
    '1. You can configure routes, controllers, and services',
    '2. Hot reload is enabled by default in development mode',
    '3. Dependency injection is built-in for clean architecture',
  ];
}

export async function handleNew(
  projectName: string,
  options: NewCommandOptions
): Promise<void> {
  const logger = createLogger(options.verbose);

  logger.newLine();
  logger.title();
  logger.tagline('Making TypeScript services simple (and fast) again');
  logger.newLine();

  // Interactive template selection if not provided via --template
  let template = options.template;
  if (!template || template === 'default') {
    // Check if user explicitly passed --template default or if it's the CLI default
    const isExplicitDefault = process.argv.includes('--template') || process.argv.includes('-t');
    if (!isExplicitDefault && !template) {
      try {
        template = await selectTemplate();
        logger.debug(`Selected template: ${template}`);
      } catch (error) {
        // User cancelled selection (Ctrl+C)
        logger.newLine();
        logger.info('Template selection cancelled.');
        process.exit(0);
      }
    } else {
      template = template || 'default';
    }
  }

  logger.step(1, 4, 'Validating project name...');
  logger.debug(`Project name: ${projectName}`);

  const validation = validateProjectName(projectName);
  if (!validation.valid) {
    logger.error(validation.error!);
    process.exit(1);
  }
  logger.success(`Project name "${projectName}" is valid`);

  logger.step(2, 4, 'Checking target directory...');
  const targetDir = path.resolve(process.cwd(), projectName);
  logger.debug(`Target directory: ${targetDir}`);

  if (await fs.pathExists(targetDir)) {
    logger.error(`Directory "${projectName}" already exists. Please choose a different name or remove the existing directory.`);
    process.exit(1);
  }
  logger.success('Target directory is available');

  logger.step(3, 4, `Creating project from template '${template}'...`);
  // When bundled with tsup, __dirname is 'dist/', so we go up one level to find 'templates/'
  const templateDir = path.resolve(__dirname, '../templates', template);
  logger.debug(`Template directory: ${templateDir}`);

  if (!await fs.pathExists(templateDir)) {
    logger.error(`Template "${template}" not found. Available templates: ${TEMPLATES.map(t => t.value).join(', ')}`);
    process.exit(1);
  }

  try {
    logger.startLoading('Copying template files...');
    await fs.copy(templateDir, targetDir);
    logger.stopLoading('Project files created');

    const packageJsonPath = path.join(targetDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.name = projectName;
      packageJson.version = '0.1.0';
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      logger.debug('Updated package.json with project name');
    }
  } catch (error) {
    logger.stopLoading('Failed to create project files', false);
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
    }
    throw error;
  }

  if (!options.skipInstall) {
    logger.step(4, 4, 'Installing dependencies...');
    logger.debug('Running npm install...');

    try {
      logger.startLoading('Installing packages...');
      await execa('npm', ['install'], {
        cwd: targetDir,
        stdio: options.verbose ? 'inherit' : 'pipe',
      });
      logger.stopLoading('Dependencies installed');
    } catch (error) {
      logger.stopLoading('Failed to install dependencies', false);
      logger.warn('You can run "npm install" manually.');
      logger.debug(String(error));
    }
  } else {
    logger.step(4, 4, 'Skipping dependency installation (--skip-install)');
    logger.debug('Skipped npm install as requested');
  }

  logger.newLine();
  logger.success(`Project "${projectName}" created successfully with '${template}' template!`);
  logger.newLine();
  logger.info('Getting started with Rikta');
  const gettingStartedMessages = getGettingStartedMessages(template);
  for (const message of gettingStartedMessages) {
    logger.info(message);
  }
  logger.newLine();
  logger.info('Next steps:');
  logger.info(`  cd ${projectName}`);
  if (options.skipInstall) {
    logger.info('  npm install');
  }
  logger.info('  npm run dev');
  logger.newLine();
}

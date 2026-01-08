import fs from 'fs-extra';
import path from 'path';

export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Check if the current directory is a Rikta project
 */
export async function isRiktaProject(dir: string = process.cwd()): Promise<boolean> {
  const packageJsonPath = path.join(dir, 'package.json');

  try {
    if (!await fs.pathExists(packageJsonPath)) {
      return false;
    }

    const packageJson: PackageJson = await fs.readJson(packageJsonPath);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    return '@riktajs/core' in deps;
  } catch {
    return false;
  }
}

/**
 * Get the package.json of the current project
 */
export async function getPackageJson(dir: string = process.cwd()): Promise<PackageJson | null> {
  const packageJsonPath = path.join(dir, 'package.json');

  try {
    if (!await fs.pathExists(packageJsonPath)) {
      return null;
    }
    return await fs.readJson(packageJsonPath);
  } catch {
    return null;
  }
}

/**
 * Validate project name for filesystem safety
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name cannot be empty' };
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return { valid: false, error: 'Project name contains invalid characters' };
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
  if (reservedNames.includes(name.toUpperCase())) {
    return { valid: false, error: 'Project name is a reserved system name' };
  }

  // Check length
  if (name.length > 214) {
    return { valid: false, error: 'Project name is too long (max 214 characters)' };
  }

  return { valid: true };
}

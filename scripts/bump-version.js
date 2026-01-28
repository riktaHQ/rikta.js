#!/usr/bin/env node

/**
 * Script to bump version across all packages in the monorepo
 * 
 * Usage:
 *   node scripts/bump-version.js <new-version>
 *   node scripts/bump-version.js patch
 *   node scripts/bump-version.js minor
 *   node scripts/bump-version.js major
 *   node scripts/bump-version.js 1.2.3
 * 
 * This script:
 * 1. Updates all package versions to the same version (lockstep versioning)
 * 2. Updates internal dependencies (@riktajs/*) to use the same version
 * 3. Updates peerDependencies to ">= new-version"
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function readPackageJson(packagePath) {
  const fullPath = join(rootDir, packagePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

function writePackageJson(packagePath, packageJson) {
  const fullPath = join(rootDir, packagePath);
  const content = JSON.stringify(packageJson, null, 2) + '\n';
  writeFileSync(fullPath, content, 'utf-8');
}

function findAllPackages() {
  const packages = [];
  
  // Read workspaces from root package.json
  const rootPackage = readPackageJson('package.json');
  const workspaces = rootPackage.workspaces || [];
  
  for (const workspacePattern of workspaces) {
    if (workspacePattern.endsWith('/*')) {
      // Handle patterns like "packages/*"
      const dir = workspacePattern.slice(0, -2);
      const fullDir = join(rootDir, dir);
      
      try {
        const items = readdirSync(fullDir);
        for (const item of items) {
          const itemPath = join(fullDir, item);
          if (statSync(itemPath).isDirectory()) {
            const packageJsonPath = join(dir, item, 'package.json');
            try {
              const packageJson = readPackageJson(packageJsonPath);
              
              // Only include @riktajs packages
              if (packageJson.name?.startsWith('@riktajs/')) {
                packages.push({
                  name: packageJson.name,
                  path: packageJsonPath,
                  packageJson
                });
              }
            } catch (error) {
              // Skip if package.json doesn't exist or is invalid
            }
          }
        }
      } catch (error) {
        // Directory might not exist, skip
      }
    }
  }
  
  return packages;
}

function parseVersion(versionString) {
  // Support versions like 1.2.3 or 1.2.3-beta.0
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

function bumpVersion(currentVersion, bumpType) {
  const version = parseVersion(currentVersion);
  if (!version) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  switch (bumpType) {
    case 'major':
      return `${version.major + 1}.0.0`;
    case 'minor':
      return `${version.major}.${version.minor + 1}.0`;
    case 'patch':
      return `${version.major}.${version.minor}.${version.patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('\n❌ Error: Please provide a version or bump type\n', colors.red);
    log('Usage:', colors.cyan);
    log('  node scripts/bump-version.js <version>', colors.yellow);
    log('  node scripts/bump-version.js patch', colors.yellow);
    log('  node scripts/bump-version.js minor', colors.yellow);
    log('  node scripts/bump-version.js major', colors.yellow);
    log('  node scripts/bump-version.js 1.2.3\n', colors.yellow);
    process.exit(1);
  }

  const input = args[0];
  let newVersion;

  log('\n📦 Bumping version across all packages...\n', colors.blue);

  // Find all packages
  const packages = findAllPackages();
  
  if (packages.length === 0) {
    log('❌ No packages found!\n', colors.red);
    process.exit(1);
  }

  // Get current version from core package
  const corePackage = packages.find(p => p.name === '@riktajs/core');
  if (!corePackage) {
    log('❌ @riktajs/core package not found!\n', colors.red);
    process.exit(1);
  }

  const currentVersion = corePackage.packageJson.version;
  log(`Current version: ${currentVersion}`, colors.cyan);

  // Determine new version
  if (input === 'major' || input === 'minor' || input === 'patch') {
    newVersion = bumpVersion(currentVersion, input);
    log(`Bump type: ${input}`, colors.cyan);
  } else {
    // Assume it's a specific version
    const parsedVersion = parseVersion(input);
    if (!parsedVersion) {
      log(`\n❌ Error: Invalid version format: ${input}`, colors.red);
      log('Version must be in format: X.Y.Z (e.g., 1.2.3)\n', colors.yellow);
      process.exit(1);
    }
    newVersion = input;
  }

  log(`New version: ${newVersion}\n`, colors.green);

  // Confirm
  if (process.env.CI !== 'true' && !process.env.SKIP_CONFIRM) {
    const readline = (await import('readline')).default;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`Proceed with version bump to ${newVersion}? (y/N): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log('\n❌ Cancelled\n', colors.yellow);
      process.exit(0);
    }
  }

  log('\n🔄 Updating package versions...\n', colors.blue);

  let updatedCount = 0;
  const packageNames = new Set(packages.map(p => p.name));

  // Update all packages
  for (const { name, path, packageJson } of packages) {
    const oldVersion = packageJson.version;
    packageJson.version = newVersion;

    // Update dependencies to other @riktajs packages
    if (packageJson.dependencies) {
      for (const depName of Object.keys(packageJson.dependencies)) {
        if (packageNames.has(depName)) {
          packageJson.dependencies[depName] = `^${newVersion}`;
        }
      }
    }

    // Update peerDependencies to other @riktajs packages
    if (packageJson.peerDependencies) {
      for (const depName of Object.keys(packageJson.peerDependencies)) {
        if (packageNames.has(depName)) {
          packageJson.peerDependencies[depName] = `>=${newVersion}`;
        }
      }
    }

    writePackageJson(path, packageJson);
    log(`  ✓ ${name}: ${oldVersion} → ${newVersion}`, colors.green);
    updatedCount++;
  }

  log(`\n✅ Updated ${updatedCount} package(s) to version ${newVersion}!`, colors.green);
  
  log('\n📝 Next steps:', colors.cyan);
  log('  1. Review the changes: git diff', colors.yellow);
  log('  2. Run tests: npm test', colors.yellow);
  log('  3. Commit: git add . && git commit -m "chore: bump version to ' + newVersion + '"', colors.yellow);
  log('  4. Tag: git tag v' + newVersion, colors.yellow);
  log('  5. Push: git push && git push --tags\n', colors.yellow);
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}\n`, colors.red);
  process.exit(1);
});

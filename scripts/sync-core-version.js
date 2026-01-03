#!/usr/bin/env node

/**
 * Script to sync @riktajs/core version across all dependent packages
 * 
 * Usage:
 *   node scripts/sync-core-version.js
 * 
 * This script:
 * 1. Reads the current version from @riktajs/core/package.json
 * 2. Dynamically finds all packages and updates their peerDependencies
 * 3. Verifies all workspace packages use "*" for internal dependencies
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
            const packageJson = readPackageJson(packageJsonPath);
            
            // Exclude core package
            if (packageJson.name !== '@riktajs/core') {
              packages.push({
                name: packageJson.name,
                path: packageJsonPath,
                packageJson
              });
            }
          }
        }
      } catch (error) {
        // Directory might not exist, skip
      }
    } else {
      // Handle direct workspace references like "example" or "benchmarks"
      const packageJsonPath = join(workspacePattern, 'package.json');
      try {
        const packageJson = readPackageJson(packageJsonPath);
        if (packageJson.name !== '@riktajs/core') {
          packages.push({
            name: packageJson.name,
            path: packageJsonPath,
            packageJson
          });
        }
      } catch (error) {
        // Package might not exist, skip
      }
    }
  }
  
  return packages;
}

function main() {
  log('\n📦 Syncing @riktajs/core version across packages...\n', colors.blue);

  // 1. Read core version
  const corePackage = readPackageJson('packages/core/package.json');
  const coreVersion = corePackage.version;
  
  log(`✓ Current @riktajs/core version: ${coreVersion}`, colors.green);

  let updatedCount = 0;

  // 2. Dynamically find and update all packages with @riktajs/core peerDependency
  log('\n🔄 Updating peerDependencies...\n', colors.blue);
  
  const allPackages = findAllPackages();
  const newPeerVersion = `>=${coreVersion}`;
  
  for (const { name, path, packageJson } of allPackages) {
    if (packageJson.peerDependencies?.['@riktajs/core']) {
      const currentPeerVersion = packageJson.peerDependencies['@riktajs/core'];
      
      if (currentPeerVersion !== newPeerVersion) {
        packageJson.peerDependencies['@riktajs/core'] = newPeerVersion;
        writePackageJson(path, packageJson);
        log(`  ✓ Updated ${name} peerDependency: ${currentPeerVersion} → ${newPeerVersion}`, colors.green);
        updatedCount++;
      } else {
        log(`  ✓ ${name} peerDependency already up to date: ${newPeerVersion}`, colors.yellow);
      }
    }
  }
  
  if (allPackages.filter(p => p.packageJson.peerDependencies?.['@riktajs/core']).length === 0) {
    log(`  ℹ No packages with @riktajs/core peerDependency found`, colors.yellow);
  }

  // 3. Verify workspace packages use "*" for internal dependencies
  const workspacePackages = allPackages.map(p => ({ name: p.name, path: p.path }));

  log('\n🔍 Verifying workspace dependencies...\n', colors.blue);

  let hasWarnings = false;
  for (const { name, path } of workspacePackages) {
    const pkg = readPackageJson(path);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    for (const [depName, depVersion] of Object.entries(deps)) {
      if (depName.startsWith('@riktajs/')) {
        if (depVersion === '*') {
          log(`  ✓ ${name}: ${depName} uses "*" (workspace protocol)`, colors.green);
        } else {
          log(`  ⚠ ${name}: ${depName} uses "${depVersion}" (should be "*")`, colors.red);
          hasWarnings = true;
        }
      }
    }
  }
  
  if (!hasWarnings && workspacePackages.length === 0) {
    log(`  ℹ No workspace packages found`, colors.yellow);
  }

  log(`\n${updatedCount > 0 ? '✅' : '✓'} Version sync complete!`, colors.green);
  
  if (updatedCount > 0) {
    log('\n💡 Don\'t forget to commit the updated package.json files!\n', colors.yellow);
  } else {
    log('');
  }
}

main();

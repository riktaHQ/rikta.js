#!/usr/bin/env node

/**
 * Script to publish all packages to npm
 * 
 * Usage:
 *   node scripts/publish-all.js [--dry-run] [--tag <tag>] [--access <public|restricted>]
 * 
 * Options:
 *   --dry-run          Simulate publishing without actually publishing
 *   --tag <tag>        Publish with a specific dist-tag (default: latest)
 *   --access <access>  Set package access (public or restricted, default: public)
 *   --otp <code>       Provide one-time password for 2FA
 * 
 * This script:
 * 1. Finds all @riktajs/* packages in the monorepo
 * 2. Attempts to publish each package to npm
 * 3. Continues even if a package fails to publish
 * 4. Provides a summary report at the end
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

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
  gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function readPackageJson(packagePath) {
  const fullPath = join(rootDir, packagePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
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
              
              // Only include @riktajs packages that are not private
              if (packageJson.name?.startsWith('@riktajs/') && !packageJson.private) {
                packages.push({
                  name: packageJson.name,
                  version: packageJson.version,
                  path: join(rootDir, dir, item),
                  packageJsonPath,
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

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    tag: 'latest',
    access: 'public',
    otp: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--tag':
        options.tag = args[++i];
        break;
      case '--access':
        options.access = args[++i];
        break;
      case '--otp':
        options.otp = args[++i];
        break;
      case '--help':
      case '-h':
        log('\nUsage: node scripts/publish-all.js [options]\n', colors.cyan);
        log('Options:', colors.cyan);
        log('  --dry-run          Simulate publishing without actually publishing');
        log('  --tag <tag>        Publish with a specific dist-tag (default: latest)');
        log('  --access <access>  Set package access (public or restricted, default: public)');
        log('  --otp <code>       Provide one-time password for 2FA\n');
        process.exit(0);
    }
  }

  return options;
}

async function publishPackage(pkg, options) {
  const { name, version, path } = pkg;
  const { dryRun, tag, access, otp } = options;

  const args = ['publish', '--access', access, '--tag', tag];
  
  if (dryRun) {
    args.push('--dry-run');
  }
  
  if (otp) {
    args.push('--otp', otp);
  }

  return new Promise((resolve) => {
    log(`  Publishing ${name}@${version}...`, colors.gray);
    
    const npmProcess = spawn('npm', args, {
      cwd: path,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    npmProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    npmProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    npmProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          name,
          version,
          message: dryRun ? 'Dry run successful' : 'Published successfully',
        });
      } else {
        let errorMessage = stderr || stdout || 'Unknown error';
        
        // Check for common errors
        if (errorMessage.includes('cannot publish over the previously published version')) {
          errorMessage = 'Version already published';
        } else if (errorMessage.includes('You must verify your email')) {
          errorMessage = 'Email verification required';
        } else if (errorMessage.includes('You must sign up for private packages')) {
          errorMessage = 'Private packages not available (use --access public)';
        } else if (errorMessage.includes('This operation requires a one-time password')) {
          errorMessage = 'OTP required (use --otp <code>)';
        } else if (errorMessage.includes('E401')) {
          errorMessage = 'Unauthorized - run "npm login" first';
        }

        resolve({
          success: false,
          name,
          version,
          message: errorMessage.trim().split('\n')[0].substring(0, 100),
        });
      }
    });
  });
}

async function main() {
  const options = parseArgs();

  log('\n📦 Publishing packages to npm...\n', colors.blue);

  if (options.dryRun) {
    log('🔍 DRY RUN MODE - No actual publishing will occur\n', colors.yellow);
  }

  // Find all packages
  const packages = findAllPackages();

  if (packages.length === 0) {
    log('❌ No publishable packages found!\n', colors.red);
    process.exit(1);
  }

  log(`Found ${packages.length} package(s) to publish:\n`, colors.cyan);
  for (const pkg of packages) {
    log(`  • ${pkg.name}@${pkg.version}`, colors.gray);
  }
  log('');

  // Check if logged in to npm
  try {
    execSync('npm whoami', { stdio: 'ignore' });
  } catch (error) {
    log('❌ Not logged in to npm. Run "npm login" first.\n', colors.red);
    process.exit(1);
  }

  const user = execSync('npm whoami').toString().trim();
  log(`Logged in as: ${user}\n`, colors.cyan);

  // Publish each package
  const results = [];
  
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    log(`[${i + 1}/${packages.length}] ${pkg.name}@${pkg.version}`, colors.blue);
    
    const result = await publishPackage(pkg, options);
    results.push(result);

    if (result.success) {
      log(`  ✓ ${result.message}`, colors.green);
    } else {
      log(`  ✗ Failed: ${result.message}`, colors.red);
    }
    log('');
  }

  // Summary
  log('═══════════════════════════════════════════════════════', colors.cyan);
  log('📊 SUMMARY', colors.cyan);
  log('═══════════════════════════════════════════════════════\n', colors.cyan);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  log(`Total packages: ${results.length}`, colors.cyan);
  log(`✓ Successful: ${successful.length}`, colors.green);
  log(`✗ Failed: ${failed.length}`, failed.length > 0 ? colors.red : colors.green);
  log('');

  if (successful.length > 0) {
    log('✓ Successfully published:', colors.green);
    for (const result of successful) {
      log(`  • ${result.name}@${result.version}`, colors.gray);
    }
    log('');
  }

  if (failed.length > 0) {
    log('✗ Failed to publish:', colors.red);
    for (const result of failed) {
      log(`  • ${result.name}@${result.version}`, colors.gray);
      log(`    Reason: ${result.message}`, colors.gray);
    }
    log('');
  }

  if (options.dryRun) {
    log('💡 This was a dry run. Use without --dry-run to actually publish.\n', colors.yellow);
  } else if (successful.length > 0) {
    log('🎉 Publishing complete!\n', colors.green);
  }

  // Exit with error code if any failed
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}\n`, colors.red);
  if (error.stack) {
    log(error.stack, colors.gray);
  }
  process.exit(1);
});

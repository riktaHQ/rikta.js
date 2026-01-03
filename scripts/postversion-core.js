#!/usr/bin/env node

/**
 * Post-version hook for @riktajs/core
 * Automatically syncs the new version across all dependent packages
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('\n🔄 Running post-version tasks...\n');

try {
  // Sync version across packages
  console.log('📦 Syncing version across packages...');
  execSync('node scripts/sync-core-version.js', { 
    stdio: 'inherit', 
    cwd: rootDir 
  });
  
  // Stage the updated files
  console.log('\n📝 Staging updated package.json files...');
  execSync('git add packages/swagger/package.json', { 
    stdio: 'inherit', 
    cwd: rootDir 
  });
  
  console.log('\n✅ Post-version tasks completed!\n');
  console.log('💡 Next steps:');
  console.log('   1. Review the changes: git diff --staged');
  console.log('   2. Commit: git commit -m "chore: sync core version"');
  console.log('   3. Push: git push && git push --tags\n');
  
} catch (error) {
  console.error('\n⚠️  Post-version tasks failed, but version was updated.');
  console.error('   Please run manually: npm run sync:version\n');
  process.exit(0); // Don't fail the version command
}

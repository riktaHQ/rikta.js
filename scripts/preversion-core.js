#!/usr/bin/env node

/**
 * Pre-version hook for @riktajs/core
 * Automatically runs before npm version to ensure consistency
 */

import { execSync } from 'child_process';

console.log('\n🔄 Running pre-version checks...\n');

try {
  // Run tests
  console.log('📋 Running tests...');
  execSync('npm test', { stdio: 'inherit', cwd: process.cwd() });
  
  // Build
  console.log('\n🏗️  Building package...');
  execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
  
  console.log('\n✅ Pre-version checks passed!\n');
} catch (error) {
  console.error('\n❌ Pre-version checks failed!');
  process.exit(1);
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Rikta, loadEnvFiles, resetEnvLoaded } from '../src';

describe('Environment Variables Available Immediately', () => {
  const envPath = join(process.cwd(), '.env');
  const envBackupPath = join(process.cwd(), '.env.backup');
  
  beforeEach(() => {
    if (existsSync(envPath)) {
      writeFileSync(envBackupPath, readFileSync(envPath));
    }
    
    delete process.env.IMMEDIATE_TEST_VAR;
    delete process.env.EARLY_ACCESS_VAR;
    
    resetEnvLoaded();
  });

  afterEach(() => {
    if (existsSync(envPath)) {
      unlinkSync(envPath);
    }
    
    if (existsSync(envBackupPath)) {
      writeFileSync(envPath, readFileSync(envBackupPath));
      unlinkSync(envBackupPath);
    }
    
    resetEnvLoaded();
  });

  it('should load env vars at the very start of create()', async () => {
    writeFileSync(envPath, 'IMMEDIATE_TEST_VAR=loaded_immediately\n');
    
    expect(process.env.IMMEDIATE_TEST_VAR).toBeUndefined();
    
    const createPromise = Rikta.create({ silent: true, autowired: false });
    
    // loadEnvFiles() is called synchronously at the start of create()
    expect(process.env.IMMEDIATE_TEST_VAR).toBe('loaded_immediately');
    
    const app = await createPromise;
    
    expect(process.env.IMMEDIATE_TEST_VAR).toBe('loaded_immediately');
    
    await app.close();
  });

  it('should allow manual loadEnvFiles() before create()', async () => {
    writeFileSync(envPath, 'EARLY_ACCESS_VAR=available_early\n');
    
    expect(process.env.EARLY_ACCESS_VAR).toBeUndefined();
    
    loadEnvFiles();
    
    expect(process.env.EARLY_ACCESS_VAR).toBe('available_early');
    
    const app = await Rikta.create({ silent: true, autowired: false });
    
    expect(process.env.EARLY_ACCESS_VAR).toBe('available_early');
    
    await app.close();
  });

  it('should make env vars available for config passed to create()', async () => {
    writeFileSync(envPath, 'TEST_PORT=4567\n');
    
    const app = await Rikta.create({ 
      silent: true, 
      autowired: false,
      port: parseInt(process.env.TEST_PORT || '3000')
    });
    
    expect(process.env.TEST_PORT).toBe('4567');
    
    await app.close();
  });
});

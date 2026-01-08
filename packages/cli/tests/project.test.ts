import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Project Utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rikta-test-'));
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('validateProjectName', () => {
    it('should validate valid project names', async () => {
      const { validateProjectName } = await import('../src/utils/project.js');

      expect(validateProjectName('my-app').valid).toBe(true);
      expect(validateProjectName('my_app').valid).toBe(true);
      expect(validateProjectName('myApp123').valid).toBe(true);
    });

    it('should reject empty names', async () => {
      const { validateProjectName } = await import('../src/utils/project.js');

      const result = validateProjectName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject names with invalid characters', async () => {
      const { validateProjectName } = await import('../src/utils/project.js');

      expect(validateProjectName('my<app').valid).toBe(false);
      expect(validateProjectName('my>app').valid).toBe(false);
      expect(validateProjectName('my:app').valid).toBe(false);
      expect(validateProjectName('my"app').valid).toBe(false);
      expect(validateProjectName('my|app').valid).toBe(false);
      expect(validateProjectName('my?app').valid).toBe(false);
      expect(validateProjectName('my*app').valid).toBe(false);
    });

    it('should reject reserved Windows names', async () => {
      const { validateProjectName } = await import('../src/utils/project.js');

      expect(validateProjectName('CON').valid).toBe(false);
      expect(validateProjectName('PRN').valid).toBe(false);
      expect(validateProjectName('NUL').valid).toBe(false);
    });

    it('should reject names that are too long', async () => {
      const { validateProjectName } = await import('../src/utils/project.js');

      const longName = 'a'.repeat(215);
      expect(validateProjectName(longName).valid).toBe(false);
    });
  });

  describe('isRiktaProject', () => {
    it('should return false for non-existent directory', async () => {
      const { isRiktaProject } = await import('../src/utils/project.js');

      const result = await isRiktaProject(path.join(tempDir, 'nonexistent'));
      expect(result).toBe(false);
    });

    it('should return false for directory without package.json', async () => {
      const { isRiktaProject } = await import('../src/utils/project.js');

      const result = await isRiktaProject(tempDir);
      expect(result).toBe(false);
    });

    it('should return false for package.json without @riktajs/core', async () => {
      const { isRiktaProject } = await import('../src/utils/project.js');

      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test-app',
        dependencies: {},
      });

      const result = await isRiktaProject(tempDir);
      expect(result).toBe(false);
    });

    it('should return true for package.json with @riktajs/core in dependencies', async () => {
      const { isRiktaProject } = await import('../src/utils/project.js');

      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test-app',
        dependencies: {
          '@riktajs/core': '^0.4.0',
        },
      });

      const result = await isRiktaProject(tempDir);
      expect(result).toBe(true);
    });

    it('should return true for package.json with @riktajs/core in devDependencies', async () => {
      const { isRiktaProject } = await import('../src/utils/project.js');

      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test-app',
        devDependencies: {
          '@riktajs/core': '^0.4.0',
        },
      });

      const result = await isRiktaProject(tempDir);
      expect(result).toBe(true);
    });
  });

  describe('getPackageJson', () => {
    it('should return null for non-existent package.json', async () => {
      const { getPackageJson } = await import('../src/utils/project.js');

      const result = await getPackageJson(tempDir);
      expect(result).toBeNull();
    });

    it('should return package.json contents', async () => {
      const { getPackageJson } = await import('../src/utils/project.js');

      const packageData = {
        name: 'test-app',
        version: '1.0.0',
      };
      await fs.writeJson(path.join(tempDir, 'package.json'), packageData);

      const result = await getPackageJson(tempDir);
      expect(result).toEqual(packageData);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('New Command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rikta-new-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    vi.restoreAllMocks();
  });

  it('should create project directory with correct structure', async () => {
    const { handleNew } = await import('../src/commands/new.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await handleNew('test-project', {
      template: 'default',
      skipInstall: true,
      verbose: false,
    });

    const projectDir = path.join(tempDir, 'test-project');

    expect(await fs.pathExists(projectDir)).toBe(true);

    expect(await fs.pathExists(path.join(projectDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'tsconfig.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'src', 'index.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'src', 'controllers', 'app.controller.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'src', 'services', 'greeting.service.ts'))).toBe(true);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should update package.json with project name', async () => {
    const { handleNew } = await import('../src/commands/new.js');

    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await handleNew('my-custom-app', {
      template: 'default',
      skipInstall: true,
      verbose: false,
    });

    const packageJsonPath = path.join(tempDir, 'my-custom-app', 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    expect(packageJson.name).toBe('my-custom-app');
    expect(packageJson.version).toBe('0.1.0');
  });

  it('should include @riktajs/core as dependency', async () => {
    const { handleNew } = await import('../src/commands/new.js');

    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await handleNew('deps-test', {
      template: 'default',
      skipInstall: true,
      verbose: false,
    });

    const packageJsonPath = path.join(tempDir, 'deps-test', 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    expect(packageJson.dependencies['@riktajs/core']).toBeDefined();
  });

  it('should fail if directory already exists', async () => {
    const { handleNew } = await import('../src/commands/new.js');

    const existingDir = path.join(tempDir, 'existing-project');
    await fs.mkdir(existingDir);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await handleNew('existing-project', {
      template: 'default',
      skipInstall: true,
      verbose: false,
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should fail with invalid project name', async () => {
    const { handleNew } = await import('../src/commands/new.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await handleNew('', {
      template: 'default',
      skipInstall: true,
      verbose: false,
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should create .gitignore file', async () => {
    const { handleNew } = await import('../src/commands/new.js');

    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await handleNew('gitignore-test', {
      template: 'default',
      skipInstall: true,
      verbose: false,
    });

    const gitignorePath = path.join(tempDir, 'gitignore-test', '.gitignore');
    expect(await fs.pathExists(gitignorePath)).toBe(true);

    const content = await fs.readFile(gitignorePath, 'utf-8');
    expect(content).toContain('node_modules');
    expect(content).toContain('dist');
  });

  it('should create README.md file', async () => {
    const { handleNew } = await import('../src/commands/new.js');

    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await handleNew('readme-test', {
      template: 'default',
      skipInstall: true,
      verbose: false,
    });

    const readmePath = path.join(tempDir, 'readme-test', 'README.md');
    expect(await fs.pathExists(readmePath)).toBe(true);

    const content = await fs.readFile(readmePath, 'utf-8');
    expect(content).toContain('Rikta');
  });
});

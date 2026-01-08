import { describe, it, expect } from 'vitest';

describe('CLI Exports', () => {
  it('should export setupCLI function', async () => {
    const { setupCLI } = await import('../src/cli.js');
    expect(typeof setupCLI).toBe('function');
  });

  it('should export CLIError class', async () => {
    const { CLIError } = await import('../src/cli.js');
    expect(CLIError).toBeDefined();
    expect(new CLIError('test')).toBeInstanceOf(Error);
  });

  it('should export command option types', async () => {
    const types = await import('../src/types.js');
    expect(types.CLIError).toBeDefined();
  });
});

describe('CLI Setup', () => {
  it('should create a CLI program with correct name', async () => {
    const { setupCLI } = await import('../src/cli.js');
    const program = setupCLI();
    expect(program.name()).toBe('rikta');
  });

  it('should have version option', async () => {
    const { setupCLI } = await import('../src/cli.js');
    const program = setupCLI();
    expect(program.version()).toBe('0.1.0');
  });

  it('should have new command', async () => {
    const { setupCLI } = await import('../src/cli.js');
    const program = setupCLI();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain('new');
  });

  it('should have dev command', async () => {
    const { setupCLI } = await import('../src/cli.js');
    const program = setupCLI();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain('dev');
  });

  it('should have build command', async () => {
    const { setupCLI } = await import('../src/cli.js');
    const program = setupCLI();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain('build');
  });
});

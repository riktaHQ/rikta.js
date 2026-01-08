import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create a logger with verbose option', async () => {
    const { createLogger } = await import('../src/utils/logger.js');

    const logger = createLogger(true);
    expect(logger).toBeDefined();
  });

  it('should log info messages', async () => {
    const { createLogger } = await import('../src/utils/logger.js');

    const logger = createLogger(false);
    logger.info('Test message');

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log success messages', async () => {
    const { createLogger } = await import('../src/utils/logger.js');

    const logger = createLogger(false);
    logger.success('Success message');

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should only log debug messages when verbose is true', async () => {
    const { createLogger } = await import('../src/utils/logger.js');

    const silentLogger = createLogger(false);
    silentLogger.debug('Debug message');
    expect(consoleSpy).not.toHaveBeenCalled();

    const verboseLogger = createLogger(true);
    verboseLogger.debug('Debug message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log step progress', async () => {
    const { createLogger } = await import('../src/utils/logger.js');

    const logger = createLogger(false);
    logger.step(1, 3, 'Step one');

    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0];
    expect(logCall.some((arg) => typeof arg === 'string' && arg.includes('1/3'))).toBe(true);
  });
});

import { InjectionToken } from '@riktajs/core';

/**
 * Logger Interface
 */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// ============================================================================
// Injection Tokens
// ============================================================================

export const APP_CONFIG = 'APP_CONFIG' as const;
export const DATABASE_CONFIG = 'DATABASE_CONFIG' as const;
export const LOGGER = new InjectionToken<Logger>('logger');


import { InjectionToken } from '../../../src';

/**
 * Application Configuration Interface
 */
export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'production' | 'test';
}

/**
 * Database Configuration Interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
}

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

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
export const DATABASE_CONFIG = new InjectionToken<DatabaseConfig>('database.config');
export const LOGGER = new InjectionToken<Logger>('logger');


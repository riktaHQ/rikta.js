import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/** Ensures .env files are loaded only once. */
let envLoaded = false;

/**
 * Load .env files with precedence: .env < .env.{NODE_ENV}
 * Called automatically at Rikta.create() start. @internal
 */
export function loadEnvFiles(): void {
  if (envLoaded) {
    return;
  }

  const env = process.env.NODE_ENV || 'development';
  const cwd = process.cwd();

  const baseEnvPath = resolve(cwd, '.env');
  if (existsSync(baseEnvPath)) {
    loadEnv({ path: baseEnvPath, override: false });
  }

  const envSpecificPath = resolve(cwd, `.env.${env}`);
  if (existsSync(envSpecificPath)) {
    loadEnv({ path: envSpecificPath, override: true });
  }

  envLoaded = true;
}

/** @internal */
export function isEnvLoaded(): boolean {
  return envLoaded;
}

/** Reset flag for testing. @internal */
export function resetEnvLoaded(): void {
  envLoaded = false;
}

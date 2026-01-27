import 'reflect-metadata';
import { PROVIDER_METADATA, CONFIG_PROVIDER_METADATA } from '../constants.js';
import { Token } from '../container/injection-token.js';
import { registry } from '../registry.js';
import { Constructor } from '../types.js';

/**
 * Provider metadata stored on the class
 */
export interface ProviderMetadata {
  token: Token;
}

/**
 * Config provider metadata stored on the class
 */
export interface ConfigProviderMetadata {
  /**
   * The injection token for this config provider
   * @example 'APP_CONFIG', 'DATABASE_CONFIG'
   */
  token: string;
}

/**
 * Convert a class name to an uppercase config token
 * 
 * @param className - The class name to convert
 * @returns Uppercase token name
 * 
 * @example
 * ```typescript
 * generateToken('AppConfigProvider') // Returns 'APP_CONFIG'
 * generateToken('DatabaseConfigProvider') // Returns 'DATABASE_CONFIG'
 * generateToken('MyCustomConfig') // Returns 'MY_CUSTOM_CONFIG'
 * ```
 */
function generateTokenFromClassName(className: string): string {
  // Remove 'Provider' suffix if present
  let tokenName = className.replace(/Provider$/, '');
  
  // Convert camelCase/PascalCase to UPPER_SNAKE_CASE
  tokenName = tokenName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '');
  
  // Ensure it ends with _CONFIG if not already present
  // But don't add it if the name already ends with CONFIG (after conversion)
  if (!tokenName.endsWith('_CONFIG') && tokenName !== 'CONFIG') {
    tokenName = `${tokenName}_CONFIG`;
  }
  
  return tokenName;
}

/**
 * @Provider() decorator
 * 
 * Marks a class as a custom provider or config provider that will be auto-discovered.
 * 
 * For **custom providers**, the class must implement a `provide()` method that returns the value.
 * Providers can inject dependencies via constructor or @Autowired properties,
 * making them perfect for complex factory logic.
 * 
 * For **config providers**, the class extends AbstractConfigProvider and manages
 * environment variables with Zod validation and @ConfigProperty decorators.
 * If no token is provided for config providers, it will be auto-generated from the class name.
 * 
 * @param token - The injection token this provider supplies. Required for custom providers, optional for config providers.
 * 
 * @example Custom provider with provide() method:
 * ```typescript
 * const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
 * 
 * @Provider(APP_CONFIG)
 * export class AppConfigProvider {
 *   provide(): AppConfig {
 *     return {
 *       name: 'My App',
 *       version: '1.0.0',
 *     };
 *   }
 * }
 * ```
 * 
 * @example Config provider extending AbstractConfigProvider:
 * ```typescript
 * import { AbstractConfigProvider, Provider, ConfigProperty } from '@riktajs/core';
 * import { z } from 'zod';
 * 
 * export const APP_CONFIG = 'APP_CONFIG' as const;
 * 
 * @Provider(APP_CONFIG)
 * export class AppConfigProvider extends AbstractConfigProvider {
 *   schema() {
 *     return z.object({
 *       PORT: z.coerce.number().int().default(3000),
 *       HOST: z.string().default('localhost'),
 *     });
 *   }
 * 
 *   @ConfigProperty() port!: number;
 *   @ConfigProperty() host!: string;
 * 
 *   constructor() {
 *     super();
 *     this.populate();
 *   }
 * }
 * ```
 * 
 * @example Provider with dependencies:
 * ```typescript
 * const LOGGER = new InjectionToken<Logger>('logger');
 * 
 * @Provider(LOGGER)
 * export class LoggerProvider {
 *   constructor(@Autowired(APP_CONFIG) private config: AppConfig) {}
 *   
 *   provide(): Logger {
 *     return createLogger({
 *       appName: this.config.name,
 *       level: this.config.debug ? 'debug' : 'info',
 *     });
 *   }
 * }
 * ```
 */
export function Provider(token?: Token): ClassDecorator {
  return (target: Function) => {
    const className = target.name;
    
    // Check if this is a config provider (extends AbstractConfigProvider)
    // by checking if it has a schema() method in its prototype
    const isConfigProvider = typeof (target.prototype as any).schema === 'function';
    
    if (isConfigProvider) {
      // This is a config provider - use string token and CONFIG_PROVIDER_METADATA
      let configToken: string;
      
      if (typeof token === 'string') {
        // Validate non-empty string
        if (token.trim() === '') {
          throw new Error(
            `@Provider: Config provider "${className}" token must be a non-empty string.`
          );
        }
        configToken = token;
      } else if (token === undefined) {
        // Auto-generate token from class name
        configToken = generateTokenFromClassName(className);
      } else {
        throw new Error(
          `@Provider: Config provider "${className}" requires a string token or no token for auto-generation.`
        );
      }
      
      // Validate token format for config providers
      if (configToken !== configToken.toUpperCase()) {
        throw new Error(
          `@Provider: Token "${configToken}" for config provider "${className}" must be UPPERCASE. ` +
          `Use "${configToken.toUpperCase()}" instead.`
        );
      }
      
      // Store config provider metadata
      const configMetadata: ConfigProviderMetadata = { token: configToken };
      Reflect.defineMetadata(CONFIG_PROVIDER_METADATA, configMetadata, target);
      
      // Register config provider in the registry
      registry.registerConfigProvider(
        configToken,
        target as Constructor
      );
    } else {
      // This is a custom provider - use PROVIDER_METADATA
      if (token === undefined) {
        throw new Error(
          `@Provider: Custom provider "${className}" requires a token parameter.`
        );
      }
      
      const metadata: ProviderMetadata = { token };
      Reflect.defineMetadata(PROVIDER_METADATA, metadata, target);
      
      // Register in global registry for auto-discovery
      registry.registerCustomProvider(target as new (...args: unknown[]) => unknown);
    }
  };
}

/**
 * Helper to retrieve config provider metadata from a class
 * 
 * @param target - The class to retrieve metadata from
 * @returns The config provider metadata or undefined
 */
export function getConfigProviderMetadata(
  target: Constructor
): ConfigProviderMetadata | undefined {
  return Reflect.getMetadata(CONFIG_PROVIDER_METADATA, target);
}

/**
 * Check if a class has config provider metadata
 * 
 * @param target - The class to check
 * @returns True if the class is a config provider
 */
export function isConfigProvider(target: Constructor): boolean {
  return Reflect.hasMetadata(CONFIG_PROVIDER_METADATA, target);
}


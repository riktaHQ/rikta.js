import 'reflect-metadata';
import { CONFIG_PROPERTY_METADATA } from '../constants.js';

/**
 * Metadata for a single config property mapping
 */
export interface ConfigPropertyMapping {
  /**
   * The property name on the class
   */
  propertyKey: string;
  
  /**
   * The environment variable name to map from
   */
  envKey: string;
}

/**
 * Cache for converted property names to avoid recomputation
 * Map<propertyKey, envKey>
 */
const propertyNameCache = new Map<string, string>();

/**
 * Convert a camelCase property name to UPPER_SNAKE_CASE
 * 
 * @param propertyName - The property name to convert
 * @returns The converted UPPER_SNAKE_CASE name
 * 
 * @example
 * ```typescript
 * toUpperSnakeCase('dbHost')      // 'DB_HOST'
 * toUpperSnakeCase('apiKey')      // 'API_KEY'
 * toUpperSnakeCase('port')        // 'PORT'
 * toUpperSnakeCase('maxRetries')  // 'MAX_RETRIES'
 * ```
 */
function toUpperSnakeCase(propertyName: string): string {
  // Check cache first (tip: cache derived names)
  if (propertyNameCache.has(propertyName)) {
    return propertyNameCache.get(propertyName)!;
  }

  // Convert camelCase/PascalCase to UPPER_SNAKE_CASE
  const envKey = propertyName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '');

  // Cache for future use
  propertyNameCache.set(propertyName, envKey);
  
  return envKey;
}

/**
 * @ConfigProperty() decorator
 * 
 * Maps a class property to an environment variable. If no explicit env key is provided,
 * automatically converts the property name from camelCase to UPPER_SNAKE_CASE.
 * 
 * This decorator stores metadata that will be read by AbstractConfigProvider
 * during the populate() phase to assign validated environment values to properties.
 * 
 * @param envKey - Optional explicit environment variable name (must be UPPERCASE)
 * 
 * @example Auto-mapping (property name → UPPER_SNAKE_CASE):
 * ```typescript
 * import { ConfigProperty, Provider, AbstractConfigProvider } from '@riktajs/core';
 * import { z } from 'zod';
 * 
 * @Provider()
 * export class DatabaseConfigProvider extends AbstractConfigProvider {
 *   schema() {
 *     return z.object({
 *       DB_HOST: z.string(),
 *       DB_PORT: z.coerce.number().int(),
 *       DB_NAME: z.string(),
 *     });
 *   }
 * 
 *   @ConfigProperty()  // Maps to 'DB_HOST'
 *   dbHost!: string;
 * 
 *   @ConfigProperty()  // Maps to 'DB_PORT'
 *   dbPort!: number;
 * 
 *   @ConfigProperty()  // Maps to 'DB_NAME'
 *   dbName!: string;
 * }
 * ```
 * 
 * @example Custom env key mapping:
 * ```typescript
 * @Provider()
 * export class AppConfigProvider extends AbstractConfigProvider {
 *   schema() {
 *     return z.object({
 *       PORT: z.coerce.number().int(),
 *       NODE_ENV: z.enum(['development', 'production', 'test']),
 *       API_SECRET_KEY: z.string(),
 *     });
 *   }
 * 
 *   @ConfigProperty('PORT')
 *   serverPort!: number;
 * 
 *   @ConfigProperty('NODE_ENV')
 *   environment!: 'development' | 'production' | 'test';
 * 
 *   @ConfigProperty('API_SECRET_KEY')
 *   secret!: string;
 * }
 * ```
 * 
 * @example Mixed auto and custom mapping:
 * ```typescript
 * @Provider()
 * export class ApiConfigProvider extends AbstractConfigProvider {
 *   schema() {
 *     return z.object({
 *       API_KEY: z.string(),
 *       API_URL: z.string().url(),
 *       TIMEOUT: z.coerce.number().int(),
 *     });
 *   }
 * 
 *   @ConfigProperty()  // Auto: apiKey → API_KEY
 *   apiKey!: string;
 * 
 *   @ConfigProperty()  // Auto: apiUrl → API_URL
 *   apiUrl!: string;
 * 
 *   @ConfigProperty('TIMEOUT')  // Custom mapping
 *   requestTimeout!: number;
 * }
 * ```
 */
export function ConfigProperty(envKey?: string): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    if (typeof propertyKey === 'symbol') {
      throw new Error(
        `@ConfigProperty: Symbol properties are not supported. ` +
        `Property "${String(propertyKey)}" must be a string.`
      );
    }

    // Determine the environment variable name
    const finalEnvKey = envKey ?? toUpperSnakeCase(propertyKey);

    // Validate env key format
    if (!finalEnvKey || typeof finalEnvKey !== 'string') {
      throw new Error(
        `@ConfigProperty: Invalid env key for property "${propertyKey}". ` +
        `Env key must be a non-empty string.`
      );
    }

    // Ensure env key is uppercase (convention)
    if (finalEnvKey !== finalEnvKey.toUpperCase()) {
      throw new Error(
        `@ConfigProperty: Env key "${finalEnvKey}" for property "${propertyKey}" must be UPPERCASE. ` +
        `Use "${finalEnvKey.toUpperCase()}" instead.`
      );
    }

    // Get existing metadata or initialize
    const constructor = target.constructor;
    const existingMappings: ConfigPropertyMapping[] =
      Reflect.getMetadata(CONFIG_PROPERTY_METADATA, constructor) || [];

    // Check for duplicate property decorations
    const duplicate = existingMappings.find(m => m.propertyKey === propertyKey);
    if (duplicate) {
      throw new Error(
        `@ConfigProperty: Property "${propertyKey}" on class "${constructor.name}" ` +
        `is already decorated. Remove the duplicate @ConfigProperty decorator.`
      );
    }

    // Check for duplicate env key mappings
    const duplicateEnvKey = existingMappings.find(m => m.envKey === finalEnvKey);
    if (duplicateEnvKey) {
      throw new Error(
        `@ConfigProperty: Env key "${finalEnvKey}" is already mapped to property "${duplicateEnvKey.propertyKey}" ` +
        `on class "${constructor.name}". Each env key can only be mapped to one property.`
      );
    }

    // Add the new mapping
    const newMapping: ConfigPropertyMapping = {
      propertyKey,
      envKey: finalEnvKey,
    };

    const updatedMappings = [...existingMappings, newMapping];

    // Store metadata
    Reflect.defineMetadata(CONFIG_PROPERTY_METADATA, updatedMappings, constructor);
  };
}

/**
 * Helper to retrieve all config property mappings from a class
 * 
 * @param target - The class constructor to retrieve mappings from
 * @returns Array of property mappings, or empty array if none defined
 * 
 * @example
 * ```typescript
 * const mappings = getConfigPropertyMappings(AppConfigProvider);
 * console.log(mappings);
 * // [
 * //   { propertyKey: 'dbHost', envKey: 'DB_HOST' },
 * //   { propertyKey: 'dbPort', envKey: 'DB_PORT' }
 * // ]
 * ```
 */
export function getConfigPropertyMappings(target: Function): ConfigPropertyMapping[] {
  return Reflect.getMetadata(CONFIG_PROPERTY_METADATA, target) || [];
}

/**
 * Check if a class has any @ConfigProperty decorated properties
 * 
 * @param target - The class constructor to check
 * @returns True if the class has at least one @ConfigProperty
 */
export function hasConfigProperties(target: Function): boolean {
  const mappings = getConfigPropertyMappings(target);
  return mappings.length > 0;
}

/**
 * Clear the property name conversion cache
 * 
 * @internal Used for testing
 */
export function clearPropertyNameCache(): void {
  propertyNameCache.clear();
}

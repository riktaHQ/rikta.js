import { z, ZodSchema } from 'zod';
import { getConfigPropertyMappings } from '../decorators/config-property.decorator.js';
import { loadEnvFiles } from './env-loader.js';

/**
 * Exception thrown when config validation fails
 */
export class ConfigValidationException extends Error {
  constructor(
    public readonly errors: z.ZodError,
    providerName: string
  ) {
    // Zod v4 uses .issues instead of .errors
    const errorMessages = errors.issues
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    
    super(
      `Configuration validation failed for ${providerName}:\n${errorMessages}\n\n` +
      `Please check your .env file and ensure all required variables are set correctly.`
    );
    this.name = 'ConfigValidationException';
  }
}

/**
 * Abstract base class for configuration providers
 * 
 * This class handles:
 * - Validating environment variables against a Zod schema
 * - Populating decorated properties with validated values
 * - Caching validated configuration
 * 
 * Note: .env files are loaded automatically at the start of Rikta.create(),
 * so they are available immediately in your main script and before any
 * config provider is instantiated.
 * 
 * Child classes must:
 * 1. Extend this class
 * 2. Implement the abstract schema() method
 * 3. Decorate properties with @ConfigProperty()
 * 4. Call populate() in their constructor
 * 
 * @example
 * ```typescript
 * import { AbstractConfigProvider, Provider, ConfigProperty } from '@riktajs/core';
 * import { z } from 'zod';
 * 
 * @Provider('APP_CONFIG')
 * export class AppConfigProvider extends AbstractConfigProvider {
 *   schema() {
 *     return z.object({
 *       PORT: z.coerce.number().int().min(1).max(65535),
 *       HOST: z.string().default('localhost'),
 *       NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
 *     });
 *   }
 * 
 *   @ConfigProperty()
 *   port!: number;
 * 
 *   @ConfigProperty()
 *   host!: string;
 * 
 *   @ConfigProperty('NODE_ENV')
 *   environment!: 'development' | 'production' | 'test';
 * 
 *   constructor() {
 *     super();
 *     this.populate();
 *   }
 * }
 * ```
 */
export abstract class AbstractConfigProvider {
  /**
   * Cache for validated configuration
   * Frozen to prevent accidental mutations
   */
  private _cache?: Readonly<Record<string, unknown>>;

  /**
   * Define the Zod schema for this configuration
   * 
   * @returns A Zod schema that validates the environment variables
   * 
   * @example
   * ```typescript
   * schema() {
   *   return z.object({
   *     DATABASE_URL: z.string().url(),
   *     DB_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
   *     DB_TIMEOUT: z.coerce.number().int().default(30000),
   *   });
   * }
   * ```
   */
  protected abstract schema(): ZodSchema;

  /**
   * Constructor ensures .env files are loaded (for standalone usage)
   * 
   * Note: When using Rikta.create(), .env files are loaded automatically
   * during bootstrap, so this is a safety measure for standalone usage.
   */
  constructor() {
    // Ensure .env files are loaded (idempotent operation)
    loadEnvFiles();
  }

  /**
   * Validate and cache the configuration
   * 
   * This method runs the Zod schema validation against process.env
   * and caches the result. Subsequent calls return the cached value.
   * 
   * @returns The validated and frozen configuration object
   * @throws {ConfigValidationException} If validation fails
   * 
   * @private
   */
  private validateAndCache(): Readonly<Record<string, unknown>> {
    if (this._cache) {
      return this._cache;
    }

    try {
      const schema = this.schema();
      const validated = schema.parse(process.env);
      
      // Freeze the cache to make it immutable (tip from plan)
      this._cache = Object.freeze(validated as Record<string, unknown>);
      
      return this._cache;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ConfigValidationException(error, this.constructor.name);
      }
      throw error;
    }
  }

  /**
   * Populate decorated properties with validated values
   * 
   * This method reads the @ConfigProperty metadata and assigns
   * the corresponding validated environment values to class properties.
   * 
   * Must be called in the child class constructor after super().
   * 
   * @throws {ConfigValidationException} If validation fails
   * 
   * @example
   * ```typescript
   * constructor() {
   *   super();
   *   this.populate(); // Must call this!
   * }
   * ```
   */
  protected populate(): void {
    // Validate and get cached config
    const config = this.validateAndCache();

    // Get property mappings from metadata
    const mappings = getConfigPropertyMappings(this.constructor);

    // Assign values to properties
    for (const mapping of mappings) {
      const value = config[mapping.envKey];
      
      // Use type assertion since we know the property exists
      (this as any)[mapping.propertyKey] = value;
    }
  }

  /**
   * Get the raw validated configuration object
   * 
   * This is useful for accessing config values that aren't mapped
   * to properties, or for passing the entire config to other services.
   * 
   * @returns The validated and frozen configuration object
   * 
   * @example
   * ```typescript
   * const config = this.getConfig();
   * console.log('All env vars:', config);
   * ```
   */
  protected getConfig(): Readonly<Record<string, unknown>> {
    return this.validateAndCache();
  }

  /**
   * Get a specific configuration value by key
   * 
   * @param key - The environment variable name
   * @returns The validated value, or undefined if not found
   * 
   * @example
   * ```typescript
   * const port = this.get<number>('PORT');
   * const apiKey = this.get<string>('API_KEY');
   * ```
   */
  protected get<T = unknown>(key: string): T | undefined {
    const config = this.validateAndCache();
    return config[key] as T | undefined;
  }
}

import {z} from 'zod';
import {AbstractConfigProvider, ConfigProperty, Provider} from "@riktajs/core";

// Re-export token for convenience
export const APP_CONFIG = 'APP_CONFIG' as const;


/**
 * Application Configuration Provider
 *
 * This provider demonstrates the complete usage of Rikta's config system:
 * - Loads .env files automatically (base + environment-specific)
 * - Validates environment variables with Zod
 * - Maps env vars to typed properties with @ConfigProperty
 * - Provides type-safe access to configuration
 *
 * @example Usage in a service:
 * ```typescript
 * @Injectable()
 * class MyService {
 *   @Autowired(APP_CONFIG)
 *   private config!: AppConfigProvider;
 *
 *   doSomething() {
 *     console.log(`Running on port ${this.config.port}`);
 *     console.log(`Environment: ${this.config.environment}`);
 *   }
 * }
 * ```
 */
@Provider(APP_CONFIG)
export class AppConfigProvider extends AbstractConfigProvider {
  /**
   * Define the Zod schema for validation
   *
   * This schema:
   * - Validates all required environment variables
   * - Coerces types (strings to numbers, etc.)
   * - Provides default values where appropriate
   * - Ensures type safety at runtime
   */
  schema() {
    return z.object({
      // Application Settings
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      APP_NAME: z.string().default('Rikta Example App'),
      APP_VERSION: z.string().default('1.0.0'),
      PORT: z.coerce.number().int().min(1).max(65535).default(3000),
      HOST: z.string().default('localhost'),

      // Database Settings
      DB_HOST: z.string().default('localhost'),
      DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
      DB_NAME: z.string().min(1).default('rikta_db'),
      DB_USER: z.string().optional(),
      DB_PASSWORD: z.string().optional(),

      // API Settings
      API_TIMEOUT: z.coerce.number().int().min(1000).default(30000),
      API_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

      // Logging
      LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    });
  }

  // Application properties with auto-mapping
  @ConfigProperty('NODE_ENV')
  environment!: 'development' | 'production' | 'test';

  @ConfigProperty('APP_NAME')
  name!: string;

  @ConfigProperty('APP_VERSION')
  version!: string;

  @ConfigProperty()
  port!: number;

  @ConfigProperty()
  host!: string;

  // Database properties
  @ConfigProperty()
  dbHost!: string;

  @ConfigProperty()
  dbPort!: number;

  @ConfigProperty()
  dbName!: string;

  @ConfigProperty()
  dbUser?: string;

  @ConfigProperty()
  dbPassword?: string;

  // API properties
  @ConfigProperty()
  apiTimeout!: number;

  @ConfigProperty()
  apiMaxRetries!: number;

  // Logging
  @ConfigProperty()
  logLevel!: 'debug' | 'info' | 'warn' | 'error';

  constructor() {
    super();
    this.populate();
  }

  /**
   * Helper method to get the database connection URL
   */
  getDatabaseUrl(): string {
    const auth = this.dbUser && this.dbPassword
      ? `${this.dbUser}:${this.dbPassword}@`
      : '';
    return `postgresql://${auth}${this.dbHost}:${this.dbPort}/${this.dbName}`;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return this.environment === 'test';
  }

  /**
   * Get server address
   */
  getServerAddress(): string {
    return `http://${this.host}:${this.port}`;
  }
}


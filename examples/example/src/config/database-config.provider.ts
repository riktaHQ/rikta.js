import {AbstractConfigProvider, ConfigProperty, Provider} from "@riktajs/core";
import {z} from 'zod';

// Re-export token for convenience
export const DATABASE_CONFIG = 'DATABASE_CONFIG' as const;

/**
 * Database Configuration Provider
 *
 * Example of a specialized config provider for database settings.
 * Demonstrates how to create multiple config providers for different concerns.
 */
@Provider(DATABASE_CONFIG)
export class DatabaseConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      DB_HOST: z.string().default('localhost'),
      DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
      DB_NAME: z.string().min(1).default('rikta_example'),
      DB_USER: z.string().default('postgres'),
      DB_PASSWORD: z.string().default('postgres'),
      DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
      DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
      DB_SSL: z
        .union([z.string(), z.boolean()])
        .transform((val) => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') {
            return val === 'true' || val === '1';
          }
          return false;
        })
        .default(false),
    });
  }

  @ConfigProperty()
  dbHost!: string;

  @ConfigProperty()
  dbPort!: number;

  @ConfigProperty()
  dbName!: string;

  @ConfigProperty()
  dbUser!: string;

  @ConfigProperty()
  dbPassword!: string;

  @ConfigProperty()
  dbPoolMin!: number;

  @ConfigProperty()
  dbPoolMax!: number;

  @ConfigProperty()
  dbSsl!: boolean;

  constructor() {
    super();
    this.populate();
  }

  /**
   * Get full database connection string
   */
  getConnectionString(): string {
    const sslParam = this.dbSsl ? '?sslmode=require' : '';
    return `postgresql://${this.dbUser}:${this.dbPassword}@${this.dbHost}:${this.dbPort}/${this.dbName}${sslParam}`;
  }

  /**
   * Get pool configuration
   */
  getPoolConfig() {
    return {
      min: this.dbPoolMin,
      max: this.dbPoolMax,
    };
  }
}


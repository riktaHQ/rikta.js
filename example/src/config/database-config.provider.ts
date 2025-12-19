import { Provider } from '../../../src';
import { DATABASE_CONFIG, DatabaseConfig } from './app.config';

/**
 * Provides database configuration
 */
@Provider(DATABASE_CONFIG)
export class DatabaseConfigProvider {
  provide(): DatabaseConfig {
    return {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      name: process.env.DB_NAME ?? 'rikta_example',
    };
  }
}


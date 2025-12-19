import { Provider } from '../../../src';
import { APP_CONFIG, AppConfig } from './app.config';

/**
 * Provides application configuration
 */
@Provider(APP_CONFIG)
export class AppConfigProvider {
  provide(): AppConfig {
    return {
      name: 'Rikta Example App',
      version: '1.0.0',
      environment: process.env.NODE_ENV as 'development' | 'production' | 'test' ?? 'development',
    };
  }
}


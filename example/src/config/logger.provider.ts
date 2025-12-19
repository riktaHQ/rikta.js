import { Provider, Autowired } from '../../../src';
import { LOGGER, Logger, APP_CONFIG, AppConfig } from './app.config';

/**
 * Provides a logger instance
 * 
 * Demonstrates a @Provider with dependencies - 
 * it can inject other providers via @Autowired
 */
@Provider(LOGGER)
export class LoggerProvider {
  // Inject the app config to customize the logger!
  @Autowired(APP_CONFIG)
  private config!: AppConfig;

  provide(): Logger {
    const appName = this.config.name;
    const isDev = this.config.environment === 'development';
    
    const timestamp = () => new Date().toISOString();
    const prefix = `[${appName}]`;
    
    return {
      info: (msg, ...args) => 
        console.log(`${prefix} [INFO]  ${timestamp()} - ${msg}`, ...args),
      warn: (msg, ...args) => 
        console.warn(`${prefix} [WARN]  ${timestamp()} - ${msg}`, ...args),
      error: (msg, ...args) => 
        console.error(`${prefix} [ERROR] ${timestamp()} - ${msg}`, ...args),
      debug: (msg, ...args) => {
        if (isDev) {
          console.debug(`${prefix} [DEBUG] ${timestamp()} - ${msg}`, ...args);
        }
      },
    };
  }
}


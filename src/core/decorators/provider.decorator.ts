import 'reflect-metadata';
import { PROVIDER_METADATA } from '../constants';
import { Token } from '../container/injection-token';
import { registry } from '../registry';

/**
 * Provider metadata stored on the class
 */
export interface ProviderMetadata {
  token: Token;
}

/**
 * @Provider() decorator
 * 
 * Marks a class as a custom provider that will be auto-discovered.
 * The class must implement a `provide()` method that returns the value.
 * 
 * Providers can inject dependencies via constructor or @Autowired properties,
 * making them perfect for complex factory logic.
 * 
 * @param token - The injection token this provider supplies
 * 
 * @example Simple value provider:
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
 * 
 * @example Async provider:
 * ```typescript
 * @Provider(DATABASE)
 * export class DatabaseProvider {
 *   async provide(): Promise<Database> {
 *     const db = await connectToDatabase();
 *     return db;
 *   }
 * }
 * ```
 */
export function Provider(token: Token): ClassDecorator {
  return (target: Function) => {
    const metadata: ProviderMetadata = { token };
    
    Reflect.defineMetadata(PROVIDER_METADATA, metadata, target);
    
    // Register in global registry for auto-discovery
    registry.registerCustomProvider(target as new (...args: unknown[]) => unknown);
  };
}


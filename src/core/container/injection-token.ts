/**
 * Injection Token
 * 
 * Used to identify dependencies that are not classes (interfaces, values, etc.)
 * Similar to NestJS InjectionToken and Angular's InjectionToken.
 * 
 * @example
 * ```typescript
 * // Define a token for a configuration object
 * const CONFIG_TOKEN = new InjectionToken<AppConfig>('app.config');
 * 
 * // Register with the container
 * container.registerValue(CONFIG_TOKEN, { apiUrl: 'https://api.example.com' });
 * 
 * // Inject using the token
 * @Injectable()
 * class ApiService {
 *   constructor(@Autowired(CONFIG_TOKEN) private config: AppConfig) {}
 * }
 * ```
 */
export class InjectionToken<T = unknown> {
  constructor(
    public readonly description: string,
    public readonly options?: {
      factory?: () => T;
    }
  ) {}

  toString(): string {
    return `InjectionToken(${this.description})`;
  }
}

/**
 * Type for any valid injection token
 * Can be a class constructor, InjectionToken, string, or symbol
 */
export type Token<T = unknown> = 
  | (new (...args: unknown[]) => T)
  | InjectionToken<T>
  | string
  | symbol;

/**
 * Provider definition for custom providers
 */
export interface ClassProvider<T = unknown> {
  provide: Token<T>;
  useClass: new (...args: unknown[]) => T;
}

export interface ValueProvider<T = unknown> {
  provide: Token<T>;
  useValue: T;
}

export interface FactoryProvider<T = unknown> {
  provide: Token<T>;
  useFactory: (...args: unknown[]) => T | Promise<T>;
  inject?: Token[];
}

export interface ExistingProvider<T = unknown> {
  provide: Token<T>;
  useExisting: Token<T>;
}

export type ProviderDefinition<T = unknown> = 
  | ClassProvider<T> 
  | ValueProvider<T> 
  | FactoryProvider<T> 
  | ExistingProvider<T>
  | (new (...args: unknown[]) => T); // Simple class provider


import { Constructor } from './types';
import { 
  ConfigProviderAlreadyRegisteredException,
} from './exceptions/config.exceptions';

/**
 * Config provider registration info
 */
interface ConfigProviderRegistration {
  token: string;
  providerClass: Constructor;
}

/**
 * Abstract class implementation info
 */
interface AbstractImplementation {
  implementation: Constructor;
  isPrimary: boolean;
  name?: string;
}

/**
 * Global Registry
 * 
 * Stores references to all decorated classes for auto-discovery.
 * Controllers and providers register themselves here via decorators.
 * 
 * The registry acts as a collection point during the decoration phase.
 * Once the application initializes, the registered classes are processed
 * and transferred to the DI container for resolution.
 */
class Registry {
  private static instance: Registry;
  
  /** All registered controllers */
  private controllers = new Set<Constructor>();
  
  /** All registered providers (services via @Injectable) */
  private providers = new Set<Constructor>();
  
  /** All registered custom providers (via @Provider) */
  private customProviders = new Set<Constructor>();

  /** Map of config provider tokens to their class constructors */
  private configProviderMap = new Map<string, Constructor>();

  /** Map of abstract classes to their implementations */
  private abstractImplementations = new Map<Constructor, AbstractImplementation[]>();

  private constructor() {}

  static getInstance(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }

  /**
   * Reset the registry (useful for testing)
   */
  static reset(): void {
    const newInstance = new Registry();
    Registry.instance = newInstance;
  }

  /**
   * Register a controller
   */
  registerController(target: Constructor): void {
    this.controllers.add(target);
  }

  /**
   * Register a provider
   */
  registerProvider(target: Constructor): void {
    this.providers.add(target);
  }

  /**
   * Get all registered controllers
   */
  getControllers(): Constructor[] {
    return [...this.controllers];
  }

  /**
   * Get all registered providers
   */
  getProviders(): Constructor[] {
    return [...this.providers];
  }

  /**
   * Check if a controller is registered
   */
  hasController(target: Constructor): boolean {
    return this.controllers.has(target);
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(target: Constructor): boolean {
    return this.providers.has(target);
  }

  /**
   * Register a custom provider (@Provider)
   */
  registerCustomProvider(target: Constructor): void {
    this.customProviders.add(target);
  }

  /**
   * Get all registered custom providers
   */
  getCustomProviders(): Constructor[] {
    return [...this.customProviders];
  }

  /**
   * Check if a custom provider is registered
   */
  hasCustomProvider(target: Constructor): boolean {
    return this.customProviders.has(target);
  }

  // ============================================================================
  // Config Provider Methods
  // ============================================================================

  /**
   * Register a config provider with its injection token
   * 
   * @param token - The injection token (e.g., 'APP_CONFIG')
   * @param providerClass - The config provider class constructor
   * @throws {ConfigProviderAlreadyRegisteredException} If the token is already registered
   * 
   * @example
   * ```typescript
   * registry.registerConfigProvider('APP_CONFIG', AppConfigProvider);
   * ```
   */
  registerConfigProvider(token: string, providerClass: Constructor): void {
    if (this.configProviderMap.has(token)) {
      const existingClass = this.configProviderMap.get(token)!;
      throw new ConfigProviderAlreadyRegisteredException(
        token,
        existingClass.name,
        providerClass.name
      );
    }
    
    this.configProviderMap.set(token, providerClass);
  }

  /**
   * Get all registered config provider classes with their tokens
   * 
   * @returns Array of registration info objects
   * 
   * @internal Used by auto-discovery mechanism
   */
  getConfigProviderRegistrations(): ConfigProviderRegistration[] {
    return Array.from(this.configProviderMap.entries()).map(([token, providerClass]) => ({
      token,
      providerClass,
    }));
  }

  /**
   * Clear all config provider registrations (useful for testing)
   * 
   * This will remove all registered config providers
   * 
   * @internal
   */
  clearConfigProviders(): void {
    this.configProviderMap.clear();
  }

  // ============================================================================
  // Abstract Class Implementation Methods
  // ============================================================================

  /**
   * Register an implementation for an abstract class
   * 
   * @param abstractClass - The abstract class being implemented
   * @param implementation - The concrete implementation class
   * @param name - Optional name for named implementations
   * 
   * @example
   * ```typescript
   * registry.registerAbstractImplementation(Mailer, SmtpMailer);
   * registry.registerAbstractImplementation(Mailer, SendGridMailer, 'sendgrid');
   * ```
   */
  registerAbstractImplementation(abstractClass: Constructor, implementation: Constructor, name?: string): void {
    const implementations = this.abstractImplementations.get(abstractClass) ?? [];
    
    // Check if already registered
    const existing = implementations.find(i => i.implementation === implementation);
    if (!existing) {
      implementations.push({
        implementation,
        isPrimary: false,
        name,
      });
      this.abstractImplementations.set(abstractClass, implementations);
    } else if (name && !existing.name) {
      // Update name if provided later
      existing.name = name;
    }
  }

  /**
   * Set the name for an implementation
   * 
   * @param abstractClass - The abstract class
   * @param implementation - The implementation class
   * @param name - The name to assign
   */
  setImplementationName(abstractClass: Constructor, implementation: Constructor, name: string): void {
    const implementations = this.abstractImplementations.get(abstractClass);
    if (!implementations) {
      return;
    }

    const impl = implementations.find(i => i.implementation === implementation);
    if (impl) {
      impl.name = name;
    }
  }

  /**
   * Set an implementation as the primary for an abstract class
   * 
   * @param abstractClass - The abstract class
   * @param implementation - The implementation to mark as primary
   */
  setPrimaryImplementation(abstractClass: Constructor, implementation: Constructor): void {
    const implementations = this.abstractImplementations.get(abstractClass);
    if (!implementations) {
      return;
    }

    // Reset all to non-primary, then set the specified one as primary
    for (const impl of implementations) {
      impl.isPrimary = impl.implementation === implementation;
    }
  }

  /**
   * Get all implementations for an abstract class
   * 
   * @param abstractClass - The abstract class to look up
   * @returns Array of implementation info, or empty array if none
   */
  getImplementations(abstractClass: Constructor): AbstractImplementation[] {
    return this.abstractImplementations.get(abstractClass) ?? [];
  }

  /**
   * Get the primary (or only) implementation for an abstract class
   * 
   * Resolution order:
   * 1. If there's a @Primary implementation, return it
   * 2. If there's only one implementation, return it
   * 3. If there are multiple without @Primary, throw error
   * 4. If there are none, return undefined
   * 
   * @param abstractClass - The abstract class to resolve
   * @param name - Optional name to resolve a specific named implementation
   * @returns The implementation class, or undefined if none
   * @throws Error if multiple implementations exist without a @Primary
   */
  resolveImplementation(abstractClass: Constructor, name?: string): Constructor | undefined {
    const implementations = this.abstractImplementations.get(abstractClass);
    
    if (!implementations || implementations.length === 0) {
      return undefined;
    }

    // If a name is specified, look for that specific implementation
    if (name) {
      const named = implementations.find(i => i.name === name);
      if (named) {
        return named.implementation;
      }
      throw new Error(
        `No implementation named '${name}' found for abstract class ${abstractClass.name}. ` +
        `Available names: ${implementations.filter(i => i.name).map(i => i.name).join(', ') || 'none'}`
      );
    }

    // If only one implementation, return it
    if (implementations.length === 1) {
      return implementations[0].implementation;
    }

    // Look for primary
    const primary = implementations.find(i => i.isPrimary);
    if (primary) {
      return primary.implementation;
    }

    // Multiple implementations without primary - error
    const implNames = implementations.map(i => i.implementation.name).join(', ');
    throw new Error(
      `Multiple implementations found for abstract class ${abstractClass.name}: ${implNames}. ` +
      `Use @Primary() to mark one as the default, or @Named() for qualified injection.`
    );
  }

  /**
   * Get an implementation by name
   * 
   * @param abstractClass - The abstract class
   * @param name - The implementation name
   * @returns The named implementation, or undefined if not found
   */
  getNamedImplementation(abstractClass: Constructor, name: string): Constructor | undefined {
    const implementations = this.abstractImplementations.get(abstractClass);
    if (!implementations) {
      return undefined;
    }
    
    const named = implementations.find(i => i.name === name);
    return named?.implementation;
  }

  /**
   * Check if an abstract class has registered implementations
   * 
   * @param abstractClass - The abstract class to check
   * @returns true if at least one implementation exists
   */
  hasImplementation(abstractClass: Constructor): boolean {
    const implementations = this.abstractImplementations.get(abstractClass);
    return !!implementations && implementations.length > 0;
  }

  /**
   * Clear all abstract implementations (useful for testing)
   */
  clearAbstractImplementations(): void {
    this.abstractImplementations.clear();
  }
}

/**
 * Global registry instance
 */
export const registry = Registry.getInstance();
export { Registry };


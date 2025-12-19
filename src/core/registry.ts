import { Constructor } from './types';

/**
 * Global Registry
 * 
 * Stores references to all decorated classes for auto-discovery.
 * Controllers and providers register themselves here via decorators.
 */
class Registry {
  private static instance: Registry;
  
  /** All registered controllers */
  private controllers = new Set<Constructor>();
  
  /** All registered providers (services via @Injectable) */
  private providers = new Set<Constructor>();
  
  /** All registered custom providers (via @Provider) */
  private customProviders = new Set<Constructor>();

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
    Registry.instance = new Registry();
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
}

/**
 * Global registry instance
 */
export const registry = Registry.getInstance();
export { Registry };


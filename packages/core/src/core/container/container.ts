import 'reflect-metadata';
import { Constructor, ProviderScope, InjectableOptions } from '../types.js';
import { INJECT_METADATA, AUTOWIRED_METADATA } from '../constants.js';
import { Token, InjectionToken, ProviderDefinition, ValueProvider, FactoryProvider, ClassProvider, ExistingProvider } from './injection-token.js';
import { AutowiredMetadata } from '../decorators/autowired.decorator.js';
import { registry } from '../registry.js';
import { isAbstractClass } from './abstract-class.utils.js';
import { requestScopeStorage } from './request-scope.js';

/**
 * Dependency Injection Container
 * 
 * Manages the lifecycle of injectable services with support for:
 * - Singleton scope (default): One instance shared across the app
 * - Transient scope: New instance on each injection
 * - Request scope: New instance per HTTP request (via AsyncLocalStorage)
 * - Property injection (autowire)
 * - Token-based injection
 * - Value and factory providers
 * - Abstract class-based injection (strategy pattern)
 */
export class Container {
  private static instance: Container;
  
  /** Stores singleton instances by token */
  private singletons = new Map<Token, unknown>();
  
  /** Stores provider registrations */
  private providers = new Map<Token, { 
    scope: ProviderScope;
    provider?: ProviderDefinition;
  }>();
  
  /** Resolution stack for circular dependency detection */
  private resolutionStack = new Set<Token>();

  private constructor() {}

  /**
   * Get the global container instance
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Reset the container (useful for testing)
   */
  static reset(): void {
    Container.instance = new Container();
  }

  /**
   * Register a class provider in the container
   */
  register<T>(target: Constructor<T>, options: InjectableOptions = {}): void {
    const scope = options.scope ?? 'singleton';
    this.providers.set(target, { scope });
  }

  /**
   * Register a custom provider (value, factory, class, or existing)
   */
  registerProvider<T>(provider: ProviderDefinition<T>): void {
    if (typeof provider === 'function') {
      // Simple class provider
      this.register(provider);
      return;
    }

    const token = provider.provide;

    if ('useValue' in provider) {
      // Value provider - always singleton
      this.providers.set(token, { scope: 'singleton', provider });
      this.singletons.set(token, provider.useValue);
    } else if ('useFactory' in provider) {
      // Factory provider
      this.providers.set(token, { scope: 'singleton', provider });
    } else if ('useClass' in provider) {
      // Class provider
      this.providers.set(token, { scope: 'singleton', provider });
    } else if ('useExisting' in provider) {
      // Alias provider
      this.providers.set(token, { scope: 'singleton', provider });
    }
  }

  /**
   * Register a value directly
   */
  registerValue<T>(token: Token<T>, value: T): void {
    this.registerProvider({ provide: token, useValue: value });
  }

  /**
   * Register a factory function
   */
  registerFactory<T>(token: Token<T>, factory: () => T, inject?: Token[]): void {
    this.registerProvider({ provide: token, useFactory: factory, inject });
  }

  /**
   * Check if a provider is registered
   */
  has(token: Token): boolean {
    return this.providers.has(token);
  }

  /**
   * Resolve a dependency by token
   */
  resolve<T>(token: Token<T>): T {
    return this.resolveToken(token, false) as T;
  }

  /**
   * Resolve a dependency, returning undefined if not found (for optional deps)
   */
  resolveOptional<T>(token: Token<T>): T | undefined {
    return this.resolveToken(token, true) as T | undefined;
  }

  /**
   * Internal resolution logic
   */
  private resolveToken(token: Token, optional: boolean): unknown {
    // Check for circular dependencies
    if (this.resolutionStack.has(token)) {
      const chain = [...this.resolutionStack]
        .map(t => this.getTokenName(t))
        .join(' -> ');
      throw new Error(`Circular dependency detected: ${chain} -> ${this.getTokenName(token)}`);
    }

    // Check if we have a singleton cached
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }

    // Get provider configuration
    const config = this.providers.get(token);
    
    if (!config) {
      // Token not registered - check if it's an abstract class with implementations
      if (typeof token === 'function') {
        const implementation = this.resolveAbstractClass(token as Constructor);
        if (implementation) {
          const instance = this.resolveClass(implementation);
          // Cache under the abstract class token
          this.singletons.set(token, instance);
          return instance;
        }
        
        // Not abstract, try to resolve as regular class (auto-registration)
        if (!isAbstractClass(token as Constructor)) {
          return this.resolveClass(token as Constructor);
        }
      }
      
      if (optional) {
        return undefined;
      }
      
      throw new Error(`No provider found for token: ${this.getTokenName(token)}`);
    }

    // If there's a custom provider, use it
    if (config.provider && typeof config.provider !== 'function') {
      return this.resolveProvider(config.provider, config.scope);
    }

    // Otherwise resolve as a class
    if (typeof token === 'function') {
      return this.resolveClass(token as Constructor);
    }

    throw new Error(`Cannot resolve token: ${this.getTokenName(token)}`);
  }

  /**
   * Try to resolve an abstract class to its concrete implementation.
   * 
   * This method contains all the resolution logic for abstract classes:
   * 1. Check for direct provider registration (useClass)
   * 2. If name specified, find the named implementation
   * 3. If only one implementation exists, use it
   * 4. If multiple implementations, use the one marked @Primary
   * 5. If multiple without @Primary, throw an error
   * 
   * @param abstractClass - The abstract class to resolve
   * @param name - Optional name for named implementation resolution
   * @returns The concrete implementation class, or undefined if not found
   */
  private resolveAbstractClass(abstractClass: Constructor, name?: string): Constructor | undefined {
    // First check if we have a direct provider registration
    const config = this.providers.get(abstractClass);
    if (config?.provider && 'useClass' in config.provider) {
      return (config.provider as ClassProvider).useClass;
    }

    // Get implementations from Registry (which only stores metadata)
    const implementations = registry.getImplementations(abstractClass);
    
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

    // Look for primary implementation
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
   * Resolve a custom provider
   */
  private resolveProvider(provider: ProviderDefinition, scope: ProviderScope): unknown {
    if (typeof provider === 'function') {
      return this.resolveClass(provider);
    }

    const token = provider.provide;

    if ('useValue' in provider) {
      return (provider as ValueProvider).useValue;
    }

    if ('useFactory' in provider) {
      const factoryProvider = provider as FactoryProvider;
      
      // Resolve factory dependencies
      const deps = (factoryProvider.inject ?? []).map(dep => this.resolve(dep));
      const result = factoryProvider.useFactory(...deps);
      
      // Cache singleton
      if (scope === 'singleton') {
        this.singletons.set(token, result);
      }
      
      return result;
    }

    if ('useClass' in provider) {
      const classProvider = provider as ClassProvider;
      const instance = this.resolveClass(classProvider.useClass);
      
      // Cache under the token (not the class)
      if (scope === 'singleton') {
        this.singletons.set(token, instance);
      }
      
      return instance;
    }

    if ('useExisting' in provider) {
      return this.resolve((provider as ExistingProvider).useExisting);
    }

    throw new Error('Invalid provider configuration');
  }

  /**
   * Resolve a class and all its dependencies
   */
  private resolveClass<T>(target: Constructor<T>): T {
    // Check for circular dependencies
    if (this.resolutionStack.has(target)) {
      const chain = [...this.resolutionStack, target]
        .map(t => this.getTokenName(t))
        .join(' -> ');
      throw new Error(`Circular dependency detected: ${chain}`);
    }

    // Get provider configuration
    const providerConfig = this.providers.get(target);
    const scope = providerConfig?.scope ?? 'singleton';

    // Return singleton if exists
    if (scope === 'singleton' && this.singletons.has(target)) {
      return this.singletons.get(target) as T;
    }

    // Handle request scope
    if (scope === 'request') {
      // Check if we're in a request context
      if (!requestScopeStorage.isInRequestScope()) {
        throw new Error(
          `Cannot resolve request-scoped provider '${target.name}' outside of a request context. ` +
          `Request-scoped providers can only be resolved during HTTP request handling.`
        );
      }
      
      // Check if instance already exists in current request
      const existingInstance = requestScopeStorage.get(target);
      if (existingInstance !== undefined) {
        return existingInstance as T;
      }
    }

    // Add to resolution stack
    this.resolutionStack.add(target);

    try {
      // Get @Autowired() metadata for constructor parameters
      const injectMeta: AutowiredMetadata[] = 
        Reflect.getMetadata(INJECT_METADATA, target) ?? [];
      
      // Get constructor parameter types via reflect-metadata
      const paramTypes: Constructor[] = 
        Reflect.getMetadata('design:paramtypes', target) ?? [];

      // Determine the number of parameters to resolve
      // Use the maximum of paramTypes length and highest index in injectMeta
      const maxIndex = injectMeta.length > 0 
        ? Math.max(...injectMeta.map(m => m.index ?? -1))
        : -1;
      const paramCount = Math.max(paramTypes.length, maxIndex + 1);

      // Resolve all constructor dependencies
      const dependencies: unknown[] = [];
      for (let index = 0; index < paramCount; index++) {
        const paramType = paramTypes[index];
        const injectOverride = injectMeta.find(m => m.index === index);
        const token = injectOverride?.token ?? paramType;
        const isOptional = injectOverride?.optional ?? false;
        const name = injectOverride?.name;
        
        // If we have no token and no paramType, skip or error
        if (!token) {
          if (isOptional) {
            dependencies.push(undefined);
            continue;
          }
          throw new Error(
            `Cannot resolve constructor parameter ${index} of ${target.name}. ` +
            `Use @Autowired(token) decorator.`
          );
        }
        
        // Handle primitive types without override
        if (!injectOverride && this.isPrimitive(paramType)) {
          if (isOptional) {
            dependencies.push(undefined);
            continue;
          }
          throw new Error(
            `Cannot inject primitive type '${paramType?.name ?? 'unknown'}' into ${target.name}. ` +
            `Use @Autowired(token) decorator.`
          );
        }
        
        dependencies.push(
          isOptional 
            ? this.resolveWithNameOptional(token, name)
            : this.resolveWithName(token, name)
        );
      }

      // Create instance with resolved dependencies
      const instance = new target(...dependencies);

      // Handle property injection (autowire)
      this.injectProperties(target, instance);

      // Store based on scope
      if (scope === 'singleton') {
        this.singletons.set(target, instance);
      } else if (scope === 'request') {
        // Store in request-scoped storage
        requestScopeStorage.set(target, instance);
      }
      // transient scope: no caching, new instance every time

      return instance;
    } finally {
      // Remove from resolution stack
      this.resolutionStack.delete(target);
    }
  }

  /**
   * Inject properties marked with @Autowired()
   */
  private injectProperties(target: Constructor, instance: unknown): void {
    const autowireMeta: AutowiredMetadata[] = 
      Reflect.getMetadata(AUTOWIRED_METADATA, target) ?? [];
    
    for (const meta of autowireMeta) {
      if (!meta.propertyKey) continue;
      
      const isOptional = meta.optional ?? false;
      
      try {
        const value = isOptional 
          ? this.resolveWithNameOptional(meta.token, meta.name)
          : this.resolveWithName(meta.token, meta.name);
        
        (instance as Record<string, unknown>)[meta.propertyKey] = value;
      } catch (error) {
        if (!isOptional) {
          throw error;
        }
      }
    }
  }

  /**
   * Resolve a dependency with optional name for qualified injection
   */
  private resolveWithName<T>(token: Token<T>, name?: string): T {
    // If we have a name and the token is a class (potential abstract class)
    if (name && typeof token === 'function') {
      const implementation = this.resolveAbstractClass(token as Constructor, name);
      if (implementation) {
        return this.resolveClass(implementation) as T;
      }
      throw new Error(`No implementation named '${name}' found for ${this.getTokenName(token)}`);
    }
    
    return this.resolve(token);
  }

  /**
   * Resolve a dependency with optional name, returning undefined if not found
   */
  private resolveWithNameOptional<T>(token: Token<T>, name?: string): T | undefined {
    try {
      return this.resolveWithName(token, name);
    } catch {
      return undefined;
    }
  }

  /**
   * Register an existing instance as a singleton
   */
  registerInstance<T>(target: Constructor<T>, instance: T): void {
    this.providers.set(target, { scope: 'singleton' });
    this.singletons.set(target, instance);
  }

  /**
   * Get all registered providers
   */
  getProviders(): Token[] {
    return [...this.providers.keys()];
  }

  /**
   * Clear all singletons (useful for testing)
   */
  clearSingletons(): void {
    this.singletons.clear();
  }

  /**
   * Check if a type is a primitive (not injectable)
   */
  private isPrimitive(type: Constructor): boolean {
    if (!type) return true;
    const primitives: unknown[] = [String, Number, Boolean, Object, Array, Function];
    return primitives.includes(type);
  }

  /**
   * Get a human-readable name for a token
   */
  private getTokenName(token: Token): string {
    if (typeof token === 'function') {
      return token.name;
    }
    if (token instanceof InjectionToken) {
      return token.toString();
    }
    if (typeof token === 'symbol') {
      return token.toString();
    }
    return String(token);
  }
}

/**
 * Global container instance export for convenience
 */
export const container = Container.getInstance();

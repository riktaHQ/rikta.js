import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import { Container } from './container/container';
import { Router } from './router/router';
import { registry } from './registry';
import { discoverModules, getCallerDirectory } from './discovery';
import { ProviderMetadata } from './decorators/provider.decorator';
import { EventBus } from './lifecycle/event-bus';
import { OnEventMetadata, ON_EVENT_METADATA } from './lifecycle/on.decorator';
import { 
  OnProviderInit,
  OnProviderDestroy,
  OnApplicationListen,
  OnApplicationShutdown 
} from './lifecycle/interfaces';
import { Constructor, RiktaConfig, RiktaApplication, InjectableOptions } from './types';
import { DEFAULT_CONFIG, PROVIDER_METADATA, INJECTABLE_METADATA } from './constants';
import { 
  GlobalExceptionFilter, 
  ExceptionFilter, 
  createExceptionHandler,
  getCatchMetadata
} from './exceptions';

/**
 * RiktaFactory - Bootstrap the application
 * 
 * Creates and initializes the Rikta application with auto-discovery.
 * All classes decorated with @Controller are automatically registered.
 */
export class RiktaFactory {
  /**
   * Create and bootstrap the application
   * 
   * @example
   * ```typescript
   * // Auto-discovery from current directory (default)
   * const app = await Rikta.create({ port: 3000 });
   * 
   * // Auto-discovery from specific paths
   * const app = await Rikta.create({
   *   autowired: ['./src/controllers', './src/services'],
   *   port: 3000
   * });
   * ```
   */
  static async create(config: RiktaConfig = {}): Promise<RiktaApplication> {
    const silent = config.silent ?? false;
    if (!silent) console.log('\n🚀 Rikta Framework Starting...\n');
    const callerDir = getCallerDirectory();
    let discoveredFiles: string[] = [];
    
    // Auto-discovery: scan for controllers and services
    if (!config.controllers && config.autowired !== false) {
      const patterns = Array.isArray(config.autowired) && config.autowired.length > 0 
        ? config.autowired 
        : ['./**'];
      if (!silent) console.log('\n🔍 Auto-discovering modules...');
      discoveredFiles = await discoverModules(patterns, callerDir);
      if (discoveredFiles.length > 0 && !silent) {
        console.log(`   Found ${discoveredFiles.length} module(s)`);
      }
    }
    
    const app = new RiktaApplicationImpl(config);
    await app.init(discoveredFiles);
    return app;
  }
}

/**
 * Internal application implementation
 */
class RiktaApplicationImpl implements RiktaApplication {
  readonly server: FastifyInstance;
  private readonly container: Container;
  private readonly config: Required<Omit<RiktaConfig, 'controllers' | 'providers' | 'autowired' | 'exceptionFilter' | 'exceptionFilters'>> & Pick<RiktaConfig, 'controllers' | 'providers' | 'exceptionFilter' | 'exceptionFilters'> & { silent: boolean };
  private readonly router: Router;
  private readonly events: EventBus;
  private readonly initializedProviders: Array<{ instance: unknown; priority: number; name: string }> = [];
  private readonly customExceptionFilters = new Map<Function, ExceptionFilter>();
  private readonly startTime = Date.now();
  private isListening = false;
  private address = '';

  constructor(config: RiktaConfig) {
    const silent = config.silent ?? false;
    this.config = {
      port: config.port ?? DEFAULT_CONFIG.port,
      host: config.host ?? DEFAULT_CONFIG.host,
      // If silent mode, disable logger unless explicitly set
      logger: config.logger ?? (silent ? false : DEFAULT_CONFIG.logger),
      prefix: config.prefix ?? DEFAULT_CONFIG.prefix,
      silent: silent,
      controllers: config.controllers,
      providers: config.providers,
      exceptionFilter: config.exceptionFilter,
      exceptionFilters: config.exceptionFilters,
    };

    this.server = Fastify({ logger: this.config.logger });
    this.container = Container.getInstance();
    this.router = new Router(this.server, this.container, this.config.prefix);
    
    // Create and register EventBus
    this.events = new EventBus();
    this.container.registerInstance(EventBus, this.events);
    
    // Setup global exception handler
    this.setupExceptionHandler();
  }

  /**
   * Setup global exception handler
   */
  private setupExceptionHandler(): void {
    // Create global exception filter with config
    const globalFilter = new GlobalExceptionFilter({
      includeStack: this.config.exceptionFilter?.includeStack,
      logErrors: this.config.exceptionFilter?.logErrors,
    });

    // Register custom exception filters
    const customFilters = this.config.exceptionFilters ?? [];
    for (const FilterClass of customFilters) {
      const metadata = getCatchMetadata(FilterClass);
      const filterInstance = this.container.resolve(FilterClass) as ExceptionFilter;
      
      if (metadata && metadata.exceptions.length > 0) {
        // Register for specific exception types
        for (const ExceptionType of metadata.exceptions) {
          this.customExceptionFilters.set(ExceptionType, filterInstance);
        }
      } else {
        // Catch-all filter (registered as Error)
        this.customExceptionFilters.set(Error, filterInstance);
      }
    }

    // Set Fastify error handler
    this.server.setErrorHandler(
      createExceptionHandler(globalFilter, this.customExceptionFilters)
    );
    
    if (!this.config.silent) console.log('🛡️  Exception handler configured');
  }

  /**
   * Initialize the application
   */
  async init(discoveredFiles: string[] = []): Promise<void> {
    if (!this.config.silent) console.log('\n🔧 Rikta Framework Initializing...\n');

    // Emit discovery event
    await this.events.emit('app:discovery', { files: discoveredFiles });

    // 1. Process @Provider classes first
    await this.processCustomProviders();
    await this.events.emit('app:providers', { 
      count: registry.getCustomProviders().length 
    });

    // 2. Get and sort providers by priority
    const providers = this.getSortedProviders();
    
    // 3. Register additional explicit providers
    const additionalProviders = this.config.providers ?? [];
    for (const provider of additionalProviders) {
      this.registerProvider(provider);
    }

    // 4. Initialize all @Injectable providers
    for (const { target, priority } of providers) {
      await this.initializeProvider(target, priority);
    }

    // 5. Register routes
    const controllers = this.config.controllers ?? registry.getControllers();
    if (!this.config.silent) console.log('📡 Registering routes:');
    for (const controller of controllers) {
      this.router.registerController(controller, this.config.silent);
    }
    await this.events.emit('app:routes', { count: controllers.length });

    // 6. Call onApplicationBootstrap hooks
    await this.callHook('onApplicationBootstrap');
    await this.events.emit('app:bootstrap', { 
      providerCount: this.initializedProviders.length 
    });

    if (!this.config.silent) console.log('\n✅ Application initialized successfully\n');
  }

  /**
   * Process all @Provider decorated classes
   */
  private async processCustomProviders(): Promise<void> {
    const customProviders = registry.getCustomProviders();
    if (customProviders.length === 0) return;

    for (const ProviderClass of customProviders) {
      const metadata: ProviderMetadata | undefined = Reflect.getMetadata(
        PROVIDER_METADATA, 
        ProviderClass
      );

      if (!metadata) continue;

      const providerInstance = this.container.resolve(ProviderClass) as { 
        provide: () => unknown | Promise<unknown> 
      };

      const value = await providerInstance.provide();
      this.container.registerValue(metadata.token, value);
    }
  }

  /**
   * Get providers sorted by priority (higher = first)
   */
  private getSortedProviders(): Array<{ target: Constructor; priority: number }> {
    const providers = registry.getProviders();
    
    return providers
      .map(target => ({
        target,
        priority: this.getProviderPriority(target),
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get priority from @Injectable() metadata
   */
  private getProviderPriority(target: Constructor): number {
    const options: InjectableOptions | undefined = 
      Reflect.getMetadata(INJECTABLE_METADATA, target);
    return options?.priority ?? 0;
  }

  /**
   * Initialize a single provider
   */
  private async initializeProvider(target: Constructor, priority: number): Promise<void> {
    const instance = this.container.resolve(target);
    const name = target.name;
    
    // Track initialized provider
    this.initializedProviders.push({ instance, priority, name });
    
    // Call onProviderInit hook
    if (this.hasHook(instance, 'onProviderInit')) {
      await (instance as OnProviderInit).onProviderInit();
    }
    
    // Emit provider:init event
    await this.events.emit('provider:init', { provider: target, name, priority });
    
    // Register @On() event listeners from this instance
    this.registerEventListeners(target, instance);
  }

  /**
   * Register @On() decorated methods as event listeners
   */
  private registerEventListeners(target: Constructor, instance: unknown): void {
    const metadata: OnEventMetadata[] = 
      Reflect.getMetadata(ON_EVENT_METADATA, target) ?? [];
    
    for (const { event, methodName } of metadata) {
      const method = (instance as Record<string, Function>)[methodName];
      if (typeof method === 'function') {
        this.events.on(event, method.bind(instance));
      }
    }
  }

  /**
   * Register a provider in the container
   */
  private registerProvider(provider: Constructor): void {
    const instance = this.container.resolve(provider);
    const priority = this.getProviderPriority(provider);
    this.initializedProviders.push({ instance, priority, name: provider.name });
  }

  /**
   * Call a lifecycle hook on all initialized providers
   */
  private async callHook(hookName: string): Promise<void> {
    for (const { instance } of this.initializedProviders) {
      if (this.hasHook(instance, hookName)) {
        await (instance as Record<string, () => Promise<void> | void>)[hookName]();
      }
    }
  }

  /**
   * Check if an instance has a lifecycle hook
   */
  private hasHook(instance: unknown, hookName: string): boolean {
    return (
      instance !== null &&
      typeof instance === 'object' &&
      hookName in instance &&
      typeof (instance as Record<string, unknown>)[hookName] === 'function'
    );
  }

  /**
   * Start listening for requests
   */
  async listen(): Promise<string> {
    if (this.isListening) {
      return this.address;
    }

    this.address = await this.server.listen({
      port: this.config.port,
      host: this.config.host,
    });

    this.isListening = true;
    if (!this.config.silent) console.log(`🚀 Server listening on ${this.address}\n`);

    // Call onApplicationListen hooks
    for (const { instance } of this.initializedProviders) {
      if (this.hasHook(instance, 'onApplicationListen')) {
        await (instance as OnApplicationListen).onApplicationListen(this.address);
      }
    }

    // Emit app:listen event
    await this.events.emit('app:listen', { 
      address: this.address, 
      port: this.config.port 
    });

    return this.address;
  }

  /**
   * Close the application
   */
  async close(signal?: string): Promise<void> {
    // Emit app:shutdown event
    await this.events.emit('app:shutdown', { signal });

    // Call hooks in REVERSE priority order
    const reversed = [...this.initializedProviders].reverse();
    
    for (const { instance } of reversed) {
      // Call onApplicationShutdown
      if (this.hasHook(instance, 'onApplicationShutdown')) {
        await (instance as OnApplicationShutdown).onApplicationShutdown(signal);
      }
      
      // Call onProviderDestroy
      if (this.hasHook(instance, 'onProviderDestroy')) {
        await (instance as OnProviderDestroy).onProviderDestroy();
      }
    }

    // Close Fastify
    await this.server.close();
    this.isListening = false;

    // Emit app:destroy event
    await this.events.emit('app:destroy', { 
      uptime: Date.now() - this.startTime 
    });

    if (!this.config.silent) console.log('\n👋 Application closed\n');
  }

  /**
   * Get the server URL
   */
  getUrl(): string {
    return this.address;
  }

  /**
   * Get the EventBus instance
   */
  getEventBus(): EventBus {
    return this.events;
  }

  /**
   * Get a service from the container
   */
  get<T>(token: Constructor<T>): T {
    return this.container.resolve(token);
  }
}

export { RiktaFactory as Rikta };

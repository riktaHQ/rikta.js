import { describe, it, expect, beforeEach } from 'vitest';
import { Container, container, InjectionToken } from '../src/core/container';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { Autowired, Optional } from '../src/core/decorators/autowired.decorator';

describe('Container', () => {
  beforeEach(() => {
    Container.reset();
  });

  describe('Basic Registration', () => {
    it('should register and resolve a class', () => {
      @Injectable()
      class TestService {
        getValue() {
          return 'test';
        }
      }

      const instance = container.resolve(TestService);
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.getValue()).toBe('test');
    });

    it('should return singleton by default', () => {
      @Injectable()
      class SingletonService {
        id = Math.random();
      }

      const instance1 = container.resolve(SingletonService);
      const instance2 = container.resolve(SingletonService);
      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it('should return new instance for transient scope', () => {
      @Injectable({ scope: 'transient' })
      class TransientService {
        id = Math.random();
      }

      const instance1 = container.resolve(TransientService);
      const instance2 = container.resolve(TransientService);
      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });
  });

  describe('Injection Tokens', () => {
    it('should register and resolve value by token', () => {
      interface Config {
        apiUrl: string;
      }

      const CONFIG = new InjectionToken<Config>('config');
      container.registerValue(CONFIG, { apiUrl: 'https://api.test.com' });

      const config = container.resolve(CONFIG);
      expect(config.apiUrl).toBe('https://api.test.com');
    });

    it('should register and resolve factory by token', () => {
      interface Logger {
        log(msg: string): void;
      }

      const LOGGER = new InjectionToken<Logger>('logger');
      const logs: string[] = [];

      container.registerFactory(LOGGER, () => ({
        log: (msg: string) => logs.push(msg),
      }));

      const logger = container.resolve(LOGGER);
      logger.log('test message');
      expect(logs).toContain('test message');
    });

    it('should inject token via @Autowired in constructor', () => {
      const API_URL = new InjectionToken<string>('api.url');
      container.registerValue(API_URL, 'https://api.example.com');

      @Injectable()
      class ApiService {
        constructor(@Autowired(API_URL) public url: string) {}
      }

      const instance = container.resolve(ApiService);
      expect(instance.url).toBe('https://api.example.com');
    });
  });

  describe('Property Injection with Token', () => {
    it('should inject token via @Autowired property', () => {
      interface AppConfig {
        name: string;
      }

      const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
      container.registerValue(APP_CONFIG, { name: 'TestApp' });

      @Injectable()
      class AppService {
        @Autowired(APP_CONFIG)
        config!: AppConfig;
      }

      const instance = container.resolve(AppService);
      expect(instance.config.name).toBe('TestApp');
    });
  });

  describe('Optional Injection', () => {
    it('should return undefined for optional unregistered dependency', () => {
      const OPTIONAL_TOKEN = new InjectionToken<string>('optional');

      @Injectable()
      class ServiceWithOptional {
        constructor(
          @Optional() @Autowired(OPTIONAL_TOKEN) public optional?: string
        ) {}
      }

      const instance = container.resolve(ServiceWithOptional);
      expect(instance.optional).toBeUndefined();
    });

    it('should return value for optional registered dependency', () => {
      const OPTIONAL_TOKEN = new InjectionToken<string>('optional.exist');
      container.registerValue(OPTIONAL_TOKEN, 'I exist!');

      @Injectable()
      class ServiceWithOptionalExist {
        constructor(
          @Optional() @Autowired(OPTIONAL_TOKEN) public optional?: string
        ) {}
      }

      const instance = container.resolve(ServiceWithOptionalExist);
      expect(instance.optional).toBe('I exist!');
    });

    it('should handle optional property injection', () => {
      const FEATURE = new InjectionToken<string>('feature');

      @Injectable()
      class FeatureService {
        @Optional()
        @Autowired(FEATURE)
        feature?: string;
      }

      const instance = container.resolve(FeatureService);
      expect(instance.feature).toBeUndefined();
    });
  });

  describe('Provider Types', () => {
    it('should register class provider', () => {
      const LOGGER_TOKEN = new InjectionToken<{ log: (msg: string) => void }>('abstract.logger');

      @Injectable()
      class ConsoleLogger {
        logs: string[] = [];
        log(msg: string) {
          this.logs.push(msg);
        }
      }

      container.registerProvider({
        provide: LOGGER_TOKEN,
        useClass: ConsoleLogger,
      });

      const logger = container.resolve(LOGGER_TOKEN);
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    it('should register existing provider (alias)', () => {
      @Injectable()
      class RealService {
        value = 'real';
      }

      const ALIAS = new InjectionToken<RealService>('alias');

      container.registerProvider({
        provide: ALIAS,
        useExisting: RealService,
      });

      const aliased = container.resolve(ALIAS);
      expect(aliased.value).toBe('real');
    });
  });

  describe('Container API', () => {
    it('should check if provider is registered', () => {
      @Injectable()
      class RegisteredService {}

      class UnregisteredService {}

      expect(container.has(RegisteredService)).toBe(true);
      expect(container.has(UnregisteredService)).toBe(false);
    });

    it('should resolve optional returning undefined', () => {
      const TOKEN = new InjectionToken('nonexistent');
      const result = container.resolveOptional(TOKEN);
      expect(result).toBeUndefined();
    });

    it('should clear singletons', () => {
      @Injectable()
      class CounterService {
        count = 0;
      }

      const instance1 = container.resolve(CounterService);
      instance1.count = 5;

      container.clearSingletons();

      const instance2 = container.resolve(CounterService);
      expect(instance2.count).toBe(0);
      expect(instance1).not.toBe(instance2);
    });
  });
});

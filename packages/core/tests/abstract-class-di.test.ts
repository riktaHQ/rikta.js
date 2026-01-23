import { describe, it, expect, beforeEach } from 'vitest';
import { Container, container, Implements, Primary, AbstractClass, Named } from '../src/core/container';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { Autowired } from '../src/core/decorators/autowired.decorator';
import { Registry, registry } from '../src/core/registry';

/**
 * Abstract Class-Based Dependency Injection Tests
 * 
 * These tests verify the "Abstract Class as Contract" pattern:
 * - Abstract classes can be used as injection tokens
 * - @Implements decorator registers implementations
 * - @Primary decorator selects default implementation
 * - Container resolves abstract → concrete automatically
 */
describe('Abstract Class DI', () => {
  beforeEach(() => {
    Container.reset();
    Registry.reset();
  });

  describe('@Implements Decorator', () => {
    it('should register implementation for abstract class', () => {
      // Define abstract contract
      abstract class Mailer {
        abstract send(to: string, body: string): Promise<void>;
      }

      // Implement concrete class
      @Injectable()
      @Implements(Mailer)
      class SmtpMailer extends Mailer {
        sentEmails: Array<{ to: string; body: string }> = [];
        
        async send(to: string, body: string): Promise<void> {
          this.sentEmails.push({ to, body });
        }
      }

      // Verify registration
      expect(registry.hasImplementation(Mailer)).toBe(true);
      
      // Resolve abstract class
      const mailer = container.resolve(Mailer);
      
      expect(mailer).toBeInstanceOf(SmtpMailer);
    });

    it('should inject abstract class via @Autowired', () => {
      abstract class Logger {
        abstract log(message: string): void;
      }

      @Injectable()
      @Implements(Logger)
      class ConsoleLogger extends Logger {
        logs: string[] = [];
        
        log(message: string): void {
          this.logs.push(message);
        }
      }

      @Injectable()
      class AppService {
        // Note: For abstract classes defined in the same scope, we need explicit token
        // In real code with separate files, design:type metadata works
        @Autowired(Logger)
        logger!: Logger;
        
        doSomething(): void {
          this.logger.log('Something happened');
        }
      }

      const service = container.resolve(AppService);
      service.doSomething();
      
      expect(service.logger).toBeInstanceOf(ConsoleLogger);
      expect((service.logger as ConsoleLogger).logs).toContain('Something happened');
    });

    it('should inject abstract class via constructor @Autowired', () => {
      abstract class Cache {
        abstract get(key: string): string | undefined;
        abstract set(key: string, value: string): void;
      }

      @Injectable()
      @Implements(Cache)
      class InMemoryCache extends Cache {
        private store = new Map<string, string>();
        
        get(key: string): string | undefined {
          return this.store.get(key);
        }
        
        set(key: string, value: string): void {
          this.store.set(key, value);
        }
      }

      @Injectable()
      class CacheService {
        // Note: For abstract classes defined in same scope, explicit token needed
        constructor(@Autowired(Cache) public cache: Cache) {}
      }

      const service = container.resolve(CacheService);
      
      service.cache.set('test', 'value');
      expect(service.cache.get('test')).toBe('value');
      expect(service.cache).toBeInstanceOf(InMemoryCache);
    });
  });

  describe('@Primary Decorator', () => {
    it('should use primary implementation when multiple exist', () => {
      abstract class PaymentGateway {
        abstract charge(amount: number): Promise<string>;
      }

      @Injectable()
      @Implements(PaymentGateway)
      class StripeGateway extends PaymentGateway {
        async charge(amount: number): Promise<string> {
          return `stripe:${amount}`;
        }
      }

      @Injectable()
      @Primary()
      @Implements(PaymentGateway)
      class PayPalGateway extends PaymentGateway {
        async charge(amount: number): Promise<string> {
          return `paypal:${amount}`;
        }
      }

      const gateway = container.resolve(PaymentGateway);
      
      expect(gateway).toBeInstanceOf(PayPalGateway);
    });

    it('should throw error when multiple implementations without primary', () => {
      abstract class Notifier {
        abstract notify(message: string): void;
      }

      @Injectable()
      @Implements(Notifier)
      class EmailNotifier extends Notifier {
        notify(message: string): void {}
      }

      @Injectable()
      @Implements(Notifier)
      class SmsNotifier extends Notifier {
        notify(message: string): void {}
      }

      expect(() => container.resolve(Notifier)).toThrow(
        /Multiple implementations found.*Use @Primary/
      );
    });

    it('should use single implementation without primary', () => {
      abstract class FileStorage {
        abstract save(filename: string, content: Buffer): Promise<void>;
      }

      @Injectable()
      @Implements(FileStorage)
      class LocalFileStorage extends FileStorage {
        savedFiles: string[] = [];
        
        async save(filename: string, content: Buffer): Promise<void> {
          this.savedFiles.push(filename);
        }
      }

      const storage = container.resolve(FileStorage);
      
      expect(storage).toBeInstanceOf(LocalFileStorage);
    });
  });

  describe('Strategy Pattern with Factory', () => {
    it('should support strategy pattern with notification factory', () => {
      // Abstract strategy
      abstract class NotificationStrategy {
        abstract send(recipient: string, message: string): Promise<boolean>;
        abstract isAvailable(): boolean;
      }

      // Email strategy
      @Injectable()
      @Primary()
      @Implements(NotificationStrategy)
      class EmailStrategy extends NotificationStrategy {
        sentMessages: Array<{ to: string; msg: string }> = [];
        
        async send(recipient: string, message: string): Promise<boolean> {
          this.sentMessages.push({ to: recipient, msg: message });
          return true;
        }
        
        isAvailable(): boolean {
          return true;
        }
      }

      // SMS strategy
      @Injectable()
      class SmsStrategy extends NotificationStrategy {
        sentMessages: Array<{ to: string; msg: string }> = [];
        
        async send(recipient: string, message: string): Promise<boolean> {
          this.sentMessages.push({ to: recipient, msg: message });
          return true;
        }
        
        isAvailable(): boolean {
          return true;
        }
      }

      // Push strategy
      @Injectable()
      class PushStrategy extends NotificationStrategy {
        sentMessages: Array<{ to: string; msg: string }> = [];
        
        async send(recipient: string, message: string): Promise<boolean> {
          this.sentMessages.push({ to: recipient, msg: message });
          return true;
        }
        
        isAvailable(): boolean {
          return true;
        }
      }

      // Factory that creates strategies
      @Injectable()
      class NotificationFactory {
        @Autowired(EmailStrategy)
        private emailStrategy!: EmailStrategy;
        
        @Autowired(SmsStrategy)
        private smsStrategy!: SmsStrategy;
        
        @Autowired(PushStrategy)
        private pushStrategy!: PushStrategy;
        
        getStrategy(channel: 'email' | 'sms' | 'push'): NotificationStrategy {
          switch (channel) {
            case 'email': return this.emailStrategy;
            case 'sms': return this.smsStrategy;
            case 'push': return this.pushStrategy;
          }
        }
        
        getAllStrategies(): NotificationStrategy[] {
          return [this.emailStrategy, this.smsStrategy, this.pushStrategy];
        }
      }

      // Service that uses the factory
      @Injectable()
      class NotificationService {
        @Autowired(NotificationFactory)
        private factory!: NotificationFactory;
        
        @Autowired(NotificationStrategy)
        private defaultStrategy!: NotificationStrategy; // Gets EmailStrategy (Primary)
        
        async notify(recipient: string, message: string, channel?: 'email' | 'sms' | 'push'): Promise<boolean> {
          const strategy = channel 
            ? this.factory.getStrategy(channel) 
            : this.defaultStrategy;
          
          if (!strategy.isAvailable()) {
            return false;
          }
          
          return strategy.send(recipient, message);
        }
        
        async notifyAll(recipient: string, message: string): Promise<boolean[]> {
          const results = await Promise.all(
            this.factory.getAllStrategies()
              .filter(s => s.isAvailable())
              .map(s => s.send(recipient, message))
          );
          return results;
        }
      }

      // Test the notification service
      const service = container.resolve(NotificationService);
      
      // Default strategy (Email - primary)
      expect(service['defaultStrategy']).toBeInstanceOf(EmailStrategy);
      
      // Test notification via specific channels
      const factory = container.resolve(NotificationFactory);
      
      expect(factory.getStrategy('email')).toBeInstanceOf(EmailStrategy);
      expect(factory.getStrategy('sms')).toBeInstanceOf(SmsStrategy);
      expect(factory.getStrategy('push')).toBeInstanceOf(PushStrategy);
    });
  });

  describe('Abstract Class with Shared Methods', () => {
    it('should support abstract classes with concrete methods', () => {
      abstract class Repository<T> {
        abstract findById(id: string): Promise<T | null>;
        abstract save(entity: T): Promise<T>;
        
        // Concrete method shared by all implementations
        generateId(): string {
          return Math.random().toString(36).substring(7);
        }
      }

      interface User {
        id: string;
        name: string;
      }

      @Injectable()
      @Implements(Repository)
      class UserRepository extends Repository<User> {
        private users = new Map<string, User>();
        
        async findById(id: string): Promise<User | null> {
          return this.users.get(id) ?? null;
        }
        
        async save(entity: User): Promise<User> {
          if (!entity.id) {
            entity.id = this.generateId();
          }
          this.users.set(entity.id, entity);
          return entity;
        }
      }

      const repo = container.resolve<Repository<User>>(Repository);
      
      // Test shared method
      const id = repo.generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      
      // Test abstract methods
      expect(repo).toBeInstanceOf(UserRepository);
    });
  });

  describe('registerProvider with Abstract Class', () => {
    it('should support explicit provider registration for abstract class', () => {
      abstract class Database {
        abstract query(sql: string): Promise<unknown[]>;
      }

      @Injectable()
      class PostgresDatabase extends Database {
        async query(sql: string): Promise<unknown[]> {
          return [{ db: 'postgres', sql }];
        }
      }

      @Injectable()
      class MySqlDatabase extends Database {
        async query(sql: string): Promise<unknown[]> {
          return [{ db: 'mysql', sql }];
        }
      }

      // Explicit registration (overrides @Implements if any)
      container.registerProvider({
        provide: Database,
        useClass: MySqlDatabase,
      });

      const db = container.resolve(Database);
      
      expect(db).toBeInstanceOf(MySqlDatabase);
    });
  });

  describe('Singleton Behavior', () => {
    it('should cache abstract class resolution as singleton', () => {
      abstract class StateManager {
        abstract getState(): Record<string, unknown>;
        abstract setState(key: string, value: unknown): void;
      }

      @Injectable()
      @Implements(StateManager)
      class InMemoryStateManager extends StateManager {
        private state: Record<string, unknown> = {};
        
        getState(): Record<string, unknown> {
          return this.state;
        }
        
        setState(key: string, value: unknown): void {
          this.state[key] = value;
        }
      }

      // First resolution
      const manager1 = container.resolve(StateManager);
      manager1.setState('count', 1);
      
      // Second resolution - should be same instance
      const manager2 = container.resolve(StateManager);
      
      expect(manager1).toBe(manager2);
      expect(manager2.getState()).toEqual({ count: 1 });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no implementation found', () => {
      abstract class UnimplementedService {
        abstract doSomething(): void;
      }
      
      // Mark as abstract without any implementation
      Reflect.defineMetadata('abstract:class', true, UnimplementedService);

      expect(() => container.resolve(UnimplementedService)).toThrow(
        /No provider found for token/
      );
    });
  });

  describe('@Named Decorator', () => {
    it('should inject specific implementation by name via @Autowired', () => {
      abstract class Mailer {
        abstract send(to: string, body: string): Promise<string>;
      }

      @Injectable()
      @Implements(Mailer)
      @Named('smtp')
      class SmtpMailer extends Mailer {
        async send(to: string, body: string): Promise<string> {
          return `smtp:${to}`;
        }
      }

      @Injectable()
      @Implements(Mailer)
      @Named('sendgrid')
      class SendGridMailer extends Mailer {
        async send(to: string, body: string): Promise<string> {
          return `sendgrid:${to}`;
        }
      }

      @Injectable()
      class MailService {
        @Autowired(Mailer, 'smtp')
        smtpMailer!: Mailer;

        @Autowired(Mailer, 'sendgrid')
        sendgridMailer!: Mailer;
      }

      const service = container.resolve(MailService);
      
      expect(service.smtpMailer).toBeInstanceOf(SmtpMailer);
      expect(service.sendgridMailer).toBeInstanceOf(SendGridMailer);
    });

    it('should inject named implementation via constructor', () => {
      abstract class Cache {
        abstract get(key: string): string | undefined;
        abstract set(key: string, value: string): void;
      }

      @Injectable()
      @Implements(Cache)
      @Named('redis')
      class RedisCache extends Cache {
        private store = new Map<string, string>();
        
        get(key: string): string | undefined {
          return this.store.get(key);
        }
        
        set(key: string, value: string): void {
          this.store.set(key, value);
        }
      }

      @Injectable()
      @Implements(Cache)
      @Named('memory')
      class MemoryCache extends Cache {
        private store = new Map<string, string>();
        
        get(key: string): string | undefined {
          return this.store.get(key);
        }
        
        set(key: string, value: string): void {
          this.store.set(key, value);
        }
      }

      @Injectable()
      class CacheService {
        constructor(
          @Autowired(Cache, 'redis') public redisCache: Cache,
          @Autowired(Cache, 'memory') public memoryCache: Cache
        ) {}
      }

      const service = container.resolve(CacheService);
      
      expect(service.redisCache).toBeInstanceOf(RedisCache);
      expect(service.memoryCache).toBeInstanceOf(MemoryCache);
    });

    it('should throw error for unknown name', () => {
      abstract class Storage {
        abstract save(data: string): void;
      }

      @Injectable()
      @Implements(Storage)
      @Named('local')
      class LocalStorage extends Storage {
        save(data: string): void {}
      }

      @Injectable()
      class StorageService {
        @Autowired(Storage, 'unknown')
        storage!: Storage;
      }

      expect(() => container.resolve(StorageService)).toThrow(
        /No implementation named 'unknown' found/
      );
    });

    it('should support @Named with @Primary together', () => {
      abstract class Notifier {
        abstract notify(msg: string): string;
      }

      @Injectable()
      @Implements(Notifier)
      @Named('email')
      @Primary() // Email is also the default
      class EmailNotifier extends Notifier {
        notify(msg: string): string {
          return `email:${msg}`;
        }
      }

      @Injectable()
      @Implements(Notifier)
      @Named('sms')
      class SmsNotifier extends Notifier {
        notify(msg: string): string {
          return `sms:${msg}`;
        }
      }

      @Injectable()
      class NotifyService {
        @Autowired(Notifier) // Gets primary (email)
        defaultNotifier!: Notifier;

        @Autowired(Notifier, 'email') // Explicit name
        emailNotifier!: Notifier;

        @Autowired(Notifier, 'sms') // Explicit name
        smsNotifier!: Notifier;
      }

      const service = container.resolve(NotifyService);
      
      expect(service.defaultNotifier).toBeInstanceOf(EmailNotifier);
      expect(service.emailNotifier).toBeInstanceOf(EmailNotifier);
      expect(service.smsNotifier).toBeInstanceOf(SmsNotifier);
      
      // They should be same instance (singleton)
      expect(service.defaultNotifier).toBe(service.emailNotifier);
    });

    it('should register name with @Named before @Implements (decorator order flexibility)', () => {
      abstract class Logger {
        abstract log(msg: string): string;
      }

      @Injectable()
      @Named('file') // @Named before @Implements
      @Implements(Logger)
      class FileLogger extends Logger {
        log(msg: string): string {
          return `file:${msg}`;
        }
      }

      @Injectable()
      class LogService {
        @Autowired(Logger, 'file')
        fileLogger!: Logger;
      }

      const service = container.resolve(LogService);
      
      expect(service.fileLogger).toBeInstanceOf(FileLogger);
    });
  });
});

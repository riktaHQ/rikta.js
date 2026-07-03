import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container } from '../src/core/container/container';
import { RequestScopeStorage, requestScopeStorage } from '../src/core/container/request-scope';
import { registry } from '../src/core/registry';

describe('Request Scope', () => {
  beforeEach(() => {
    Container.reset();
    RequestScopeStorage.reset();
  });

  afterEach(() => {
    Container.reset();
    RequestScopeStorage.reset();
  });

  describe('RequestScopeStorage', () => {
    it('should detect when inside request scope', () => {
      expect(requestScopeStorage.isInRequestScope()).toBe(false);

      requestScopeStorage.run(() => {
        expect(requestScopeStorage.isInRequestScope()).toBe(true);
      });

      expect(requestScopeStorage.isInRequestScope()).toBe(false);
    });

    it('should store and retrieve values within request scope', () => {
      const token = 'test-token';

      requestScopeStorage.run(() => {
        requestScopeStorage.set(token, 'test-value');
        expect(requestScopeStorage.get(token)).toBe('test-value');
        expect(requestScopeStorage.has(token)).toBe(true);
      });
    });

    it('should isolate values between different request scopes', async () => {
      const token = 'counter';
      const results: number[] = [];

      await Promise.all([
        requestScopeStorage.runAsync(async () => {
          requestScopeStorage.set(token, 1);
          await new Promise(resolve => setTimeout(resolve, 10));
          results.push(requestScopeStorage.get(token) as number);
        }),
        requestScopeStorage.runAsync(async () => {
          requestScopeStorage.set(token, 2);
          await new Promise(resolve => setTimeout(resolve, 5));
          results.push(requestScopeStorage.get(token) as number);
        }),
      ]);

      // Each scope should maintain its own value
      expect(results).toContain(1);
      expect(results).toContain(2);
    });

    it('should throw when setting value outside request scope', () => {
      expect(() => {
        requestScopeStorage.set('token', 'value');
      }).toThrow('Cannot set request-scoped instance outside of a request context');
    });

    it('should return undefined when getting value outside request scope', () => {
      expect(requestScopeStorage.get('token')).toBeUndefined();
    });
  });

  describe('Container with Request Scope', () => {
    it('should create new instance per request for request-scoped providers', async () => {
      // Create a request-scoped class (register manually since decorator uses global container)
      class RequestContext {
        readonly id = Math.random();
      }

      const container = Container.getInstance();
      container.register(RequestContext, { scope: 'request' });

      const instances: RequestContext[] = [];

      // Simulate two requests
      await requestScopeStorage.runAsync(async () => {
        const instance1 = container.resolve(RequestContext);
        const instance2 = container.resolve(RequestContext);
        // Same instance within same request
        expect(instance1).toBe(instance2);
        instances.push(instance1);
      });

      await requestScopeStorage.runAsync(async () => {
        const instance = container.resolve(RequestContext);
        instances.push(instance);
      });

      // Different instances between requests
      expect(instances[0]).not.toBe(instances[1]);
      expect(instances[0].id).not.toBe(instances[1].id);
    });

    it('should throw when resolving request-scoped provider outside request context', () => {
      class RequestOnlyService {
        readonly timestamp = Date.now();
      }

      const container = Container.getInstance();
      container.register(RequestOnlyService, { scope: 'request' });

      expect(() => {
        container.resolve(RequestOnlyService);
      }).toThrow('Cannot resolve request-scoped provider');
    });

    it('should allow singleton providers to be resolved from within request scope', async () => {
      class SingletonService {
        readonly id = Math.random();
      }

      const container = Container.getInstance();
      container.register(SingletonService, { scope: 'singleton' });

      // Resolve outside request scope
      const outsideInstance = container.resolve(SingletonService);

      // Resolve inside request scope
      let insideInstance: SingletonService | null = null;
      await requestScopeStorage.runAsync(async () => {
        insideInstance = container.resolve(SingletonService);
      });

      // Should be same singleton instance
      expect(outsideInstance).toBe(insideInstance);
    });

    it('should create new instance every time for transient scope', async () => {
      class TransientService {
        readonly id = Math.random();
      }

      const container = Container.getInstance();
      container.register(TransientService, { scope: 'transient' });

      await requestScopeStorage.runAsync(async () => {
        const instance1 = container.resolve(TransientService);
        const instance2 = container.resolve(TransientService);
        // Different instances even within same request
        expect(instance1).not.toBe(instance2);
      });
    });

    it('should support request-scoped dependencies in other providers', async () => {
      class RequestContext {
        readonly requestId = Math.random().toString(36);
      }

      class RequestLogger {
        constructor(public context: RequestContext) { }

        getRequestId(): string {
          return this.context.requestId;
        }
      }

      const container = Container.getInstance();
      container.register(RequestContext, { scope: 'request' });
      container.register(RequestLogger, { scope: 'request' });

      // Store design:paramtypes metadata manually for constructor injection
      Reflect.defineMetadata('design:paramtypes', [RequestContext], RequestLogger);

      await requestScopeStorage.runAsync(async () => {
        const logger = container.resolve(RequestLogger);
        const context = container.resolve(RequestContext);

        // Should use the same request context
        expect(logger.getRequestId()).toBe(context.requestId);
      });
    });

    it('should proxy request-scoped dependencies injected into singleton providers', async () => {
      class RequestContext {
        readonly requestId = Math.random().toString(36);
      }

      class RequestAwareService {
        constructor(public context: RequestContext) { }

        getRequestId(): string {
          return this.context.requestId;
        }
      }

      const container = Container.getInstance();
      container.register(RequestContext, { scope: 'request' });
      container.register(RequestAwareService, { scope: 'singleton' });
      Reflect.defineMetadata('design:paramtypes', [RequestContext], RequestAwareService);

      const service = container.resolve(RequestAwareService);
      expect(() => service.getRequestId()).toThrow(
        'Cannot access request-scoped provider'
      );

      let firstRequestId = '';
      let secondRequestId = '';

      await requestScopeStorage.runAsync(async () => {
        firstRequestId = service.getRequestId();
        expect(firstRequestId).toBe(container.resolve(RequestContext).requestId);
      });

      await requestScopeStorage.runAsync(async () => {
        secondRequestId = service.getRequestId();
        expect(secondRequestId).toBe(container.resolve(RequestContext).requestId);
      });

      expect(firstRequestId).not.toBe(secondRequestId);
    });

    it('should clean up request-scoped instances after request ends', async () => {
      class RequestData {
        readonly created = Date.now();
      }

      const container = Container.getInstance();
      container.register(RequestData, { scope: 'request' });

      let instanceId1: number | undefined;
      let instanceId2: number | undefined;

      await requestScopeStorage.runAsync(async () => {
        const instance = container.resolve(RequestData);
        instanceId1 = instance.created;
      });

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));

      await requestScopeStorage.runAsync(async () => {
        const instance = container.resolve(RequestData);
        instanceId2 = instance.created;
      });

      // Should be different instances (different timestamps)
      expect(instanceId1).toBeDefined();
      expect(instanceId2).toBeDefined();
      expect(instanceId1).not.toBe(instanceId2);
    });
  });
});

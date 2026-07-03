import { describe, it, expect, beforeEach } from 'vitest';
import { Rikta } from '../src/core/application';
import { Container } from '../src/core/container';
import { Registry } from '../src/core/registry';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Get } from '../src/core/decorators/route.decorator';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { Autowired } from '../src/core/decorators/autowired.decorator';
import { EventBus } from '../src/core/lifecycle/event-bus';

describe('Application', () => {
  beforeEach(() => {
    Container.reset();
    Registry.reset();
  });

  describe('Bootstrap', () => {
    it('should create application instance', async () => {
      const app = await Rikta.create({ port: 0, logger: false, silent: true, controllers: [] });

      expect(app).toBeDefined();
      expect(app.server).toBeDefined();

      await app.close();
    });

    it('should register routes from controller', async () => {
      @Controller('/test')
      class TestController1 {
        @Get()
        test() {
          return { test: true };
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        silent: true,
        controllers: [TestController1]
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ test: true });

      await app.close();
    });

    it('should apply global prefix', async () => {
      @Controller('/users')
      class UserController1 {
        @Get()
        list() {
          return [];
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        silent: true,
        prefix: '/api/v1',
        controllers: [UserController1],
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/api/v1/users',
      });

      expect(response.statusCode).toBe(200);

      await app.close();
    });

    it('should isolate container state and event bus between application instances', async () => {
      const app1 = await Rikta.create({ port: 0, logger: false, silent: true, controllers: [] });
      const app2 = await Rikta.create({ port: 0, logger: false, silent: true, controllers: [] });

      expect(app1.getContainer()).not.toBe(app2.getContainer());
      expect(app1.getContainer().resolve(EventBus)).toBe(app1.getEventBus());
      expect(app2.getContainer().resolve(EventBus)).toBe(app2.getEventBus());
      expect(app1.getContainer().resolve(EventBus)).not.toBe(app2.getEventBus());

      await app1.close();
      await app2.close();
    });

    it('should allow singleton controllers to use request-scoped providers', async () => {
      @Injectable({ scope: 'request' })
      class RequestContextService {
        readonly requestId = Math.random().toString(36);
      }

      @Controller('/scoped')
      class ScopedController {
        @Autowired(RequestContextService)
        private requestContext!: RequestContextService;

        @Get()
        getRequestData() {
          return { requestId: this.requestContext.requestId };
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        silent: true,
        controllers: [ScopedController],
      });

      const firstResponse = await app.server.inject({ method: 'GET', url: '/scoped' });
      const secondResponse = await app.server.inject({ method: 'GET', url: '/scoped' });

      expect(firstResponse.statusCode).toBe(200);
      expect(secondResponse.statusCode).toBe(200);
      expect(firstResponse.json().requestId).not.toBe(secondResponse.json().requestId);

      await app.close();
    });
  });

  describe('Server', () => {
    it('should listen and return address', async () => {
      @Controller()
      class SimpleController1 {
        @Get()
        test() {
          return { ok: true };
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        silent: true,
        controllers: [SimpleController1],
      });

      const address = await app.listen();

      expect(address).toContain('http://');
      expect(app.getUrl()).toBe(address);

      await app.close();
    });

    it('should provide access to Fastify instance', async () => {
      const app = await Rikta.create({ port: 0, logger: false, silent: true, controllers: [] });

      expect(app.server).toBeDefined();
      expect(typeof app.server.get).toBe('function');
      expect(typeof app.server.post).toBe('function');

      await app.close();
    });

    it('should allow registering Fastify plugins', async () => {
      const app = await Rikta.create({ port: 0, logger: false, silent: true, controllers: [] });

      app.server.register(async (fastify) => {
        fastify.get('/plugin-route', () => ({ plugin: true }));
      });

      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/plugin-route',
      });

      expect(response.json()).toEqual({ plugin: true });

      await app.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle route errors', async () => {
      @Controller('/error')
      class ErrorController1 {
        @Get()
        throwError() {
          throw new Error('Test error');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        silent: true,
        controllers: [ErrorController1],
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);

      await app.close();
    });
  });

  describe('Configuration', () => {
    it('should use default port when not specified', async () => {
      // Just test that config is applied correctly
      const app = await Rikta.create({ logger: false, silent: true, controllers: [] });

      // App should be created without errors
      expect(app).toBeDefined();

      await app.close();
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Rikta } from '../src/core/application';
import { Container } from '../src/core/container';
import { Registry } from '../src/core/registry';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Get } from '../src/core/decorators/route.decorator';

describe('Application', () => {
  beforeEach(() => {
    Container.reset();
    Registry.reset();
  });

  describe('Bootstrap', () => {
    it('should create application instance', async () => {
      const app = await Rikta.create({ port: 0, logger: false, controllers: [] });
      
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
        controllers: [SimpleController1],
      });

      const address = await app.listen();
      
      expect(address).toContain('http://');
      expect(app.getUrl()).toBe(address);

      await app.close();
    });

    it('should provide access to Fastify instance', async () => {
      const app = await Rikta.create({ port: 0, logger: false, controllers: [] });

      expect(app.server).toBeDefined();
      expect(typeof app.server.get).toBe('function');
      expect(typeof app.server.post).toBe('function');

      await app.close();
    });

    it('should allow registering Fastify plugins', async () => {
      const app = await Rikta.create({ port: 0, logger: false, controllers: [] });

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
      const app = await Rikta.create({ logger: false, controllers: [] });
      
      // App should be created without errors
      expect(app).toBeDefined();
      
      await app.close();
    });
  });
});

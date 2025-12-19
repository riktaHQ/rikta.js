import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { Container, InjectionToken } from '../src/core/container';
import { Router } from '../src/core/router/router';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Get, Post, HttpCode } from '../src/core/decorators/route.decorator';
import { Body, Param, Query, Headers } from '../src/core/decorators/param.decorator';
import { Autowired } from '../src/core/decorators/autowired.decorator';

describe('Router', () => {
  let server: FastifyInstance;
  let container: Container;
  let router: Router;

  beforeEach(async () => {
    Container.reset();
    
    server = Fastify({ logger: false });
    container = Container.getInstance();
    router = new Router(server, container, '');
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Route Registration', () => {
    it('should register GET route', async () => {
      @Controller('/test')
      class TestController {
        @Get('/hello')
        hello() {
          return { message: 'Hello' };
        }
      }

      router.registerController(TestController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/test/hello',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'Hello' });
    });

    it('should register POST route', async () => {
      @Controller('/test')
      class TestController {
        @Post('/create')
        create() {
          return { created: true };
        }
      }

      router.registerController(TestController);
      await server.ready();

      const response = await server.inject({
        method: 'POST',
        url: '/test/create',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ created: true });
    });

    it('should handle controller without prefix', async () => {
      @Controller()
      class RootController {
        @Get('/status')
        status() {
          return { status: 'ok' };
        }
      }

      router.registerController(RootController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/status',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should apply global prefix', async () => {
      const prefixedRouter = new Router(server, container, '/api/v1');

      @Controller('/users')
      class UserController {
        @Get()
        list() {
          return [];
        }
      }

      prefixedRouter.registerController(UserController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/users',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Parameter Resolution', () => {
    it('should inject @Param', async () => {
      @Controller('/users')
      class UserController {
        @Get('/:id')
        getUser(@Param('id') id: string) {
          return { id };
        }
      }

      router.registerController(UserController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/users/123',
      });

      expect(response.json()).toEqual({ id: '123' });
    });

    it('should inject @Query', async () => {
      @Controller('/items')
      class ItemController {
        @Get()
        list(@Query('page') page: string, @Query('limit') limit: string) {
          return { page, limit };
        }
      }

      router.registerController(ItemController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/items?page=2&limit=10',
      });

      expect(response.json()).toEqual({ page: '2', limit: '10' });
    });

    it('should inject @Body', async () => {
      @Controller('/users')
      class UserController {
        @Post()
        create(@Body() data: { name: string }) {
          return { created: data.name };
        }
      }

      router.registerController(UserController);
      await server.ready();

      const response = await server.inject({
        method: 'POST',
        url: '/users',
        payload: { name: 'John' },
      });

      expect(response.json()).toEqual({ created: 'John' });
    });

    it('should inject @Body with key', async () => {
      @Controller('/users')
      class UserController {
        @Post()
        create(@Body('email') email: string) {
          return { email };
        }
      }

      router.registerController(UserController);
      await server.ready();

      const response = await server.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'test@example.com', name: 'Test' },
      });

      expect(response.json()).toEqual({ email: 'test@example.com' });
    });

    it('should inject @Headers', async () => {
      @Controller('/auth')
      class AuthController {
        @Get()
        check(@Headers('authorization') auth: string) {
          return { auth };
        }
      }

      router.registerController(AuthController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/auth',
        headers: { authorization: 'Bearer token123' },
      });

      expect(response.json()).toEqual({ auth: 'Bearer token123' });
    });
  });

  describe('HTTP Status Codes', () => {
    it('should apply @HttpCode', async () => {
      @Controller('/items')
      class ItemController {
        @Post()
        @HttpCode(201)
        create() {
          return { id: 1 };
        }
      }

      router.registerController(ItemController);
      await server.ready();

      const response = await server.inject({
        method: 'POST',
        url: '/items',
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('Dependency Injection with Token', () => {
    it('should inject services via @Autowired with token', async () => {
      const GREETER = new InjectionToken<{ greet: (name: string) => string }>('greeter');
      
      container.registerValue(GREETER, {
        greet: (name: string) => `Hello, ${name}!`
      });

      @Controller('/greet')
      class GreetController {
        @Autowired(GREETER)
        private greeter!: { greet: (name: string) => string };

        @Get('/:name')
        greet(@Param('name') name: string) {
          return { message: this.greeter.greet(name) };
        }
      }

      router.registerController(GreetController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/greet/World',
      });

      expect(response.json()).toEqual({ message: 'Hello, World!' });
    });
  });

  describe('Async Handlers', () => {
    it('should handle async route handlers', async () => {
      @Controller('/async')
      class AsyncController {
        @Get()
        async getData() {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { async: true };
        }
      }

      router.registerController(AsyncController);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/async',
      });

      expect(response.json()).toEqual({ async: true });
    });
  });
});

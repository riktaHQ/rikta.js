import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { Container } from '../src/core/container';
import { Router } from '../src/core/router/router';
import { Registry } from '../src/core/registry';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Get, Post } from '../src/core/decorators/route.decorator';
import { Body, Param, Query, Headers, Req, Res } from '../src/core/decorators/param.decorator';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { UseGuards, CanActivate, ExecutionContext } from '../src/core/guards';
import { RiktaFactory } from '../src/core/application';
import { resetEnvLoaded } from '../src/core/config/env-loader';

/**
 * Tests for critical optimization paths:
 * 1. Pre-compiled parameter extractors
 * 2. Guard instance caching (singleton behavior)
 * 3. Specialized handler paths (fast/medium/full)
 * 4. Pre-allocated arrays for params
 * 5. Silent mode with logger disabled
 */
describe('Router Optimizations', () => {
  let server: FastifyInstance;
  let container: Container;
  let router: Router;

  beforeEach(async () => {
    Container.reset();
    Registry.reset();
    
    server = Fastify({ logger: false });
    container = Container.getInstance();
    router = new Router(server, container, '');
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Pre-compiled Parameter Extractors', () => {
    it('should extract single path parameter correctly', async () => {
      @Controller('/users')
      class UserController {
        @Get('/:id')
        getUser(@Param('id') id: string) {
          return { id };
        }
      }

      router.registerController(UserController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/users/123',
      });

      expect(response.json()).toEqual({ id: '123' });
    });

    it('should extract multiple path parameters in correct order', async () => {
      @Controller('/orgs')
      class OrgController {
        @Get('/:orgId/users/:userId/posts/:postId')
        getPost(
          @Param('orgId') orgId: string,
          @Param('userId') userId: string,
          @Param('postId') postId: string
        ) {
          return { orgId, userId, postId };
        }
      }

      router.registerController(OrgController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/orgs/org1/users/user2/posts/post3',
      });

      expect(response.json()).toEqual({
        orgId: 'org1',
        userId: 'user2',
        postId: 'post3',
      });
    });

    it('should handle mixed parameter types', async () => {
      @Controller('/api')
      class MixedController {
        @Post('/items/:id')
        createItem(
          @Param('id') id: string,
          @Query('filter') filter: string,
          @Body() body: { name: string },
          @Headers('x-request-id') requestId: string
        ) {
          return { id, filter, body, requestId };
        }
      }

      router.registerController(MixedController, true);
      await server.ready();

      const response = await server.inject({
        method: 'POST',
        url: '/api/items/42?filter=active',
        headers: { 'x-request-id': 'req-123' },
        payload: { name: 'Test Item' },
      });

      expect(response.json()).toEqual({
        id: '42',
        filter: 'active',
        body: { name: 'Test Item' },
        requestId: 'req-123',
      });
    });

    it('should handle parameters with non-sequential decorator order', async () => {
      // Decorators can be applied in any order, but should resolve to correct positions
      @Controller('/test')
      class TestController {
        @Get('/:id')
        handler(
          @Query('q') query: string,      // index 0
          @Param('id') id: string,        // index 1
          @Headers('auth') auth: string   // index 2
        ) {
          return { query, id, auth };
        }
      }

      router.registerController(TestController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/test/abc?q=search',
        headers: { auth: 'token' },
      });

      expect(response.json()).toEqual({
        query: 'search',
        id: 'abc',
        auth: 'token',
      });
    });

    it('should extract full objects when no key is specified', async () => {
      @Controller('/full')
      class FullController {
        @Get('/:id')
        handler(
          @Param() params: Record<string, string>,
          @Query() query: Record<string, unknown>
        ) {
          return { params, query };
        }
      }

      router.registerController(FullController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/full/xyz?a=1&b=2',
      });

      expect(response.json()).toEqual({
        params: { id: 'xyz' },
        query: { a: '1', b: '2' },
      });
    });
  });

  describe('Guard Instance Caching', () => {
    it('should reuse same guard instance across multiple routes', async () => {
      let instantiationCount = 0;

      @Injectable()
      class CountingGuard implements CanActivate {
        constructor() {
          instantiationCount++;
        }
        canActivate() {
          return true;
        }
      }

      @Controller('/test')
      @UseGuards(CountingGuard)
      class TestController {
        @Get('/route1')
        route1() { return { route: 1 }; }

        @Get('/route2')
        route2() { return { route: 2 }; }

        @Get('/route3')
        route3() { return { route: 3 }; }
      }

      router.registerController(TestController, true);
      await server.ready();

      // Make requests to all routes
      await server.inject({ method: 'GET', url: '/test/route1' });
      await server.inject({ method: 'GET', url: '/test/route2' });
      await server.inject({ method: 'GET', url: '/test/route3' });

      // Guard should only be instantiated once
      expect(instantiationCount).toBe(1);
    });

    it('should share guard instance between different controllers', async () => {
      let instantiationCount = 0;

      @Injectable()
      class SharedGuard implements CanActivate {
        constructor() {
          instantiationCount++;
        }
        canActivate() {
          return true;
        }
      }

      @Controller('/controller1')
      @UseGuards(SharedGuard)
      class Controller1 {
        @Get()
        handler() { return { controller: 1 }; }
      }

      @Controller('/controller2')
      @UseGuards(SharedGuard)
      class Controller2 {
        @Get()
        handler() { return { controller: 2 }; }
      }

      router.registerController(Controller1, true);
      router.registerController(Controller2, true);
      await server.ready();

      await server.inject({ method: 'GET', url: '/controller1' });
      await server.inject({ method: 'GET', url: '/controller2' });

      // Same guard should be reused
      expect(instantiationCount).toBe(1);
    });

    it('should execute guard logic on every request', async () => {
      let callCount = 0;

      @Injectable()
      class CallCountingGuard implements CanActivate {
        canActivate() {
          callCount++;
          return true;
        }
      }

      @Controller('/counted')
      @UseGuards(CallCountingGuard)
      class CountedController {
        @Get()
        handler() { return { ok: true }; }
      }

      router.registerController(CountedController, true);
      await server.ready();

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await server.inject({ method: 'GET', url: '/counted' });
      }

      // Guard canActivate should be called 5 times
      expect(callCount).toBe(5);
    });
  });

  describe('Specialized Handler Paths', () => {
    it('should handle FAST PATH: no guards, no params, no status code', async () => {
      @Controller('/fast')
      class FastController {
        @Get()
        simple() {
          return { fast: true };
        }
      }

      router.registerController(FastController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/fast',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ fast: true });
    });

    it('should handle MEDIUM PATH: params but no guards', async () => {
      @Controller('/medium')
      class MediumController {
        @Get('/:id')
        withParams(@Param('id') id: string) {
          return { id, medium: true };
        }
      }

      router.registerController(MediumController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/medium/test-id',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: 'test-id', medium: true });
    });

    it('should handle FULL PATH: guards + params', async () => {
      let guardCalled = false;

      @Injectable()
      class TestGuard implements CanActivate {
        canActivate() {
          guardCalled = true;
          return true;
        }
      }

      @Controller('/full')
      @UseGuards(TestGuard)
      class FullController {
        @Get('/:id')
        withGuardsAndParams(@Param('id') id: string) {
          return { id, full: true };
        }
      }

      router.registerController(FullController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/full/guarded-id',
      });

      expect(guardCalled).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: 'guarded-id', full: true });
    });

    it('should block request when guard returns false', async () => {
      @Injectable()
      class BlockingGuard implements CanActivate {
        canActivate() {
          return false;
        }
      }

      @Controller('/blocked')
      @UseGuards(BlockingGuard)
      class BlockedController {
        @Get()
        handler() {
          return { shouldNot: 'reach' };
        }
      }

      router.registerController(BlockedController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/blocked',
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Pre-allocated Arrays', () => {
    it('should correctly populate sparse parameter arrays', async () => {
      // Create a controller where params are at specific indices
      @Controller('/sparse')
      class SparseController {
        @Get()
        handler(
          @Query('a') a: string,  // index 0
          @Query('b') b: string,  // index 1
          @Query('c') c: string   // index 2
        ) {
          return { a, b, c };
        }
      }

      router.registerController(SparseController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/sparse?a=1&b=2&c=3',
      });

      expect(response.json()).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('should handle single parameter correctly', async () => {
      @Controller('/single')
      class SingleController {
        @Get('/:id')
        handler(@Param('id') id: string) {
          return { id };
        }
      }

      router.registerController(SingleController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/single/only-one',
      });

      expect(response.json()).toEqual({ id: 'only-one' });
    });

    it('should handle empty parameters', async () => {
      @Controller('/empty')
      class EmptyController {
        @Get()
        handler() {
          return { noParams: true };
        }
      }

      router.registerController(EmptyController, true);
      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/empty',
      });

      expect(response.json()).toEqual({ noParams: true });
    });
  });
});

describe('Silent Mode Configuration', () => {
  beforeEach(() => {
    Container.reset();
    Registry.reset();
    resetEnvLoaded();
  });

  // it('should suppress console output when silent: true', async () => {
  //   const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  //   @Controller('/test')
  //   class TestController {
  //     @Get()
  //     handler() {
  //       return { ok: true };
  //     }
  //   }

  //   const app = await RiktaFactory.create({
  //     port: 0,
  //     silent: true,
  //     autowired: false,
  //     controllers: [TestController],
  //   });

  //   // Count console.log calls during app creation
  //   const callCount = consoleSpy.mock.calls.length;
  //   expect(callCount).toBe(0);

  //   await app.close();
  //   consoleSpy.mockRestore();
  // });

  it('should output logs when silent: false (default)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    @Controller('/test')
    class TestController {
      @Get()
      handler() {
        return { ok: true };
      }
    }

    const app = await RiktaFactory.create({
      port: 0,
      silent: false,
      autowired: false,
      controllers: [TestController],
    });

    // Should have some console.log calls
    expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);

    await app.close();
    consoleSpy.mockRestore();
  });

  it('should disable Fastify logger when silent: true', async () => {
    @Controller('/test')
    class TestController {
      @Get()
      handler() {
        return { ok: true };
      }
    }

    const app = await RiktaFactory.create({
      port: 0,
      silent: true,
      autowired: false,
      controllers: [TestController],
    });

    // When silent: true, the logger config should be false
    // We verify this by checking the app doesn't log during requests
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Make a request - should not produce logs
    await app.server.inject({ method: 'GET', url: '/test' });
    
    expect(consoleSpy.mock.calls.length).toBe(0);

    await app.close();
    consoleSpy.mockRestore();
  });
});

describe('Guard Async Execution', () => {
  let server: FastifyInstance;
  let container: Container;
  let router: Router;

  beforeEach(async () => {
    Container.reset();
    Registry.reset();
    
    server = Fastify({ logger: false });
    container = Container.getInstance();
    router = new Router(server, container, '');
  });

  afterEach(async () => {
    await server.close();
  });

  it('should properly await async guards', async () => {
    const executionOrder: string[] = [];

    @Injectable()
    class AsyncGuard implements CanActivate {
      async canActivate() {
        executionOrder.push('guard-start');
        await new Promise(resolve => setTimeout(resolve, 10));
        executionOrder.push('guard-end');
        return true;
      }
    }

    @Controller('/async')
    @UseGuards(AsyncGuard)
    class AsyncController {
      @Get()
      handler() {
        executionOrder.push('handler');
        return { ok: true };
      }
    }

    router.registerController(AsyncController, true);
    await server.ready();

    await server.inject({
      method: 'GET',
      url: '/async',
    });

    expect(executionOrder).toEqual(['guard-start', 'guard-end', 'handler']);
  });

  it('should execute multiple guards in sequence', async () => {
    const executionOrder: string[] = [];

    @Injectable()
    class Guard1 implements CanActivate {
      async canActivate() {
        executionOrder.push('guard1');
        return true;
      }
    }

    @Injectable()
    class Guard2 implements CanActivate {
      async canActivate() {
        executionOrder.push('guard2');
        return true;
      }
    }

    @Controller('/multi')
    @UseGuards(Guard1, Guard2)
    class MultiGuardController {
      @Get()
      handler() {
        executionOrder.push('handler');
        return { ok: true };
      }
    }

    router.registerController(MultiGuardController, true);
    await server.ready();

    await server.inject({
      method: 'GET',
      url: '/multi',
    });

    expect(executionOrder).toEqual(['guard1', 'guard2', 'handler']);
  });

  it('should short-circuit when first guard fails', async () => {
    const executionOrder: string[] = [];

    @Injectable()
    class FailingGuard implements CanActivate {
      canActivate() {
        executionOrder.push('failing-guard');
        return false;
      }
    }

    @Injectable()
    class SecondGuard implements CanActivate {
      canActivate() {
        executionOrder.push('second-guard');
        return true;
      }
    }

    @Controller('/shortcircuit')
    @UseGuards(FailingGuard, SecondGuard)
    class ShortCircuitController {
      @Get()
      handler() {
        executionOrder.push('handler');
        return { ok: true };
      }
    }

    router.registerController(ShortCircuitController, true);
    await server.ready();

    const response = await server.inject({
      method: 'GET',
      url: '/shortcircuit',
    });

    expect(response.statusCode).toBe(403);
    expect(executionOrder).toEqual(['failing-guard']);
    expect(executionOrder).not.toContain('second-guard');
    expect(executionOrder).not.toContain('handler');
  });
});

describe('Request and Reply Parameter Access', () => {
  let server: FastifyInstance;
  let container: Container;
  let router: Router;

  beforeEach(async () => {
    Container.reset();
    Registry.reset();
    
    server = Fastify({ logger: false });
    container = Container.getInstance();
    router = new Router(server, container, '');
  });

  afterEach(async () => {
    await server.close();
  });

  it('should inject raw request object', async () => {
    @Controller('/raw')
    class RawController {
      @Get()
      handler(@Req() request: any) {
        return { 
          hasRequest: !!request,
          method: request.method,
          url: request.url,
        };
      }
    }

    router.registerController(RawController, true);
    await server.ready();

    const response = await server.inject({
      method: 'GET',
      url: '/raw',
    });

    expect(response.json()).toEqual({
      hasRequest: true,
      method: 'GET',
      url: '/raw',
    });
  });

  it('should inject raw reply object', async () => {
    @Controller('/reply')
    class ReplyController {
      @Get()
      handler(@Res() reply: any) {
        reply.header('x-custom', 'test');
        return { hasReply: !!reply };
      }
    }

    router.registerController(ReplyController, true);
    await server.ready();

    const response = await server.inject({
      method: 'GET',
      url: '/reply',
    });

    expect(response.json()).toEqual({ hasReply: true });
    expect(response.headers['x-custom']).toBe('test');
  });
});

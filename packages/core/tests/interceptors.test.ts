import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Rikta, Controller, Get, Post, Injectable, Autowired, UseInterceptors } from '../src';
import type { Interceptor, CallHandler } from '../src/core/interceptors/interceptor.interface';
import type { ExecutionContext } from '../src/core/guards/execution-context';
import { Container } from '../src/core/container/container';
import { Registry } from '../src/core/registry';

describe('Interceptors', () => {
  let app: Awaited<ReturnType<typeof Rikta.create>>;

  beforeEach(() => {
    // Reset singletons
    Container.reset();
    Registry.reset();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Basic Interceptor Functionality', () => {
    it('should execute interceptor around route handler', async () => {
      const executionOrder: string[] = [];

      @Injectable()
      class LoggingInterceptor1 implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          executionOrder.push('before');
          const result = await next.handle();
          executionOrder.push('after');
          return result;
        }
      }

      @Controller('/basic-1')
      @UseInterceptors(LoggingInterceptor1)
      class TestController1 {
        @Get('/')
        handler() {
          executionOrder.push('handler');
          return { message: 'success' };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/basic-1'
      });

      expect(response.statusCode).toBe(200);
      expect(executionOrder).toEqual(['before', 'handler', 'after']);
    });

    it('should allow interceptor to transform response', async () => {
      @Injectable()
      class TransformInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          const result = await next.handle();
          return { data: result, transformed: true };
        }
      }

      @Controller('/basic-2')
      @UseInterceptors(TransformInterceptor)
      class TestController2 {
        @Get('/')
        handler() {
          return { message: 'original' };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/basic-2'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        data: { message: 'original' },
        transformed: true
      });
    });

    it('should execute multiple interceptors in order (onion model)', async () => {
      const executionOrder: string[] = [];

      @Injectable()
      class FirstInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          executionOrder.push('first-before');
          const result = await next.handle();
          executionOrder.push('first-after');
          return result;
        }
      }

      @Injectable()
      class SecondInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          executionOrder.push('second-before');
          const result = await next.handle();
          executionOrder.push('second-after');
          return result;
        }
      }

      @Controller('/basic-3')
      @UseInterceptors(FirstInterceptor, SecondInterceptor)
      class TestController3 {
        @Get('/')
        handler() {
          executionOrder.push('handler');
          return { ok: true };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      await app.server.inject({
        method: 'GET',
        url: '/basic-3'
      });

      // First interceptor wraps second, which wraps handler
      expect(executionOrder).toEqual([
        'first-before',
        'second-before',
        'handler',
        'second-after',
        'first-after'
      ]);
    });
  });

  describe('Method-level Interceptors', () => {
    it('should apply interceptor only to decorated method', async () => {
      const interceptedRoutes: string[] = [];

      @Injectable()
      class TrackingInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          interceptedRoutes.push(String(context.getHandler()));
          return next.handle();
        }
      }

      @Controller('/method-level-1')
      class TestController4 {
        @Get('/with-interceptor')
        @UseInterceptors(TrackingInterceptor)
        withInterceptor() {
          return { intercepted: true };
        }

        @Get('/without-interceptor')
        withoutInterceptor() {
          return { intercepted: false };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      await app.server.inject({ method: 'GET', url: '/method-level-1/with-interceptor' });
      await app.server.inject({ method: 'GET', url: '/method-level-1/without-interceptor' });

      expect(interceptedRoutes.length).toBe(1);
    });

    it('should combine controller and method interceptors', async () => {
      const executionOrder: string[] = [];

      @Injectable()
      class ControllerInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          executionOrder.push('controller-interceptor');
          return next.handle();
        }
      }

      @Injectable()
      class MethodInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          executionOrder.push('method-interceptor');
          return next.handle();
        }
      }

      @Controller('/method-level-2')
      @UseInterceptors(ControllerInterceptor)
      class TestController5 {
        @Get('/')
        @UseInterceptors(MethodInterceptor)
        handler() {
          executionOrder.push('handler');
          return { ok: true };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      await app.server.inject({
        method: 'GET',
        url: '/method-level-2'
      });

      // Controller interceptors run first, then method interceptors
      expect(executionOrder).toEqual([
        'controller-interceptor',
        'method-interceptor',
        'handler'
      ]);
    });
  });

  describe('Interceptor with Dependencies', () => {
    it('should inject dependencies into interceptor', async () => {
      @Injectable()
      class LogServiceDeps {
        logs: string[] = [];
        log(message: string) {
          this.logs.push(message);
        }
      }

      @Injectable()
      class LoggingInterceptor2 implements Interceptor {
        @Autowired(LogServiceDeps)
        private logService!: LogServiceDeps;

        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          const start = Date.now();
          const result = await next.handle();
          this.logService.log(`Request completed in ${Date.now() - start}ms`);
          return result;
        }
      }

      @Controller('/deps-1')
      @UseInterceptors(LoggingInterceptor2)
      class TestController6 {
        @Get('/')
        handler() {
          return { ok: true };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      await app.server.inject({
        method: 'GET',
        url: '/deps-1'
      });

      const logService = app.getContainer().resolve(LogServiceDeps);
      expect(logService.logs.length).toBe(1);
      expect(logService.logs[0]).toMatch(/Request completed in \d+ms/);
    });
  });

  describe('Interceptor Caching', () => {
    it('should cache interceptor instances', async () => {
      let instanceCount = 0;

      @Injectable()
      class CountingInterceptor implements Interceptor {
        constructor() {
          instanceCount++;
        }

        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          return next.handle();
        }
      }

      @Controller('/cache-1')
      class TestController7 {
        @Get('/one')
        @UseInterceptors(CountingInterceptor)
        one() {
          return { route: 'one' };
        }

        @Get('/two')
        @UseInterceptors(CountingInterceptor)
        two() {
          return { route: 'two' };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      await app.server.inject({ method: 'GET', url: '/cache-1/one' });
      await app.server.inject({ method: 'GET', url: '/cache-1/two' });

      // Same interceptor class = same instance
      expect(instanceCount).toBe(1);
    });

    it('should clear interceptor cache', async () => {
      let instanceCount = 0;

      @Injectable()
      class CountingInterceptor2 implements Interceptor {
        constructor() {
          instanceCount++;
        }

        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          return next.handle();
        }
      }

      @Controller('/cache-2')
      @UseInterceptors(CountingInterceptor2)
      class TestController8 {
        @Get('/')
        handler() {
          return { ok: true };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      const initialSize = app.getRouter().getInterceptorCacheSize();
      expect(initialSize).toBeGreaterThan(0);

      app.getRouter().clearInterceptorCache();
      expect(app.getRouter().getInterceptorCacheSize()).toBe(0);
    });

    it('should resolve request-scoped interceptors per request', async () => {
      const requestIds = new Set<string>();

      @Injectable({ scope: 'request' })
      class RequestScopedInterceptor implements Interceptor {
        readonly requestId = Math.random().toString(36);

        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          requestIds.add(this.requestId);
          return next.handle();
        }
      }

      @Controller('/cache-3')
      @UseInterceptors(RequestScopedInterceptor)
      class TestControllerRequestScopedInterceptor {
        @Get('/')
        handler() {
          return { ok: true };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      await app.server.inject({ method: 'GET', url: '/cache-3' });
      await app.server.inject({ method: 'GET', url: '/cache-3' });

      expect(requestIds.size).toBe(2);
    });
  });

  describe('Error Handling in Interceptors', () => {
    it('should propagate errors from handler through interceptor', async () => {
      const errorsCaught: Error[] = [];

      @Injectable()
      class ErrorHandlingInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          try {
            return await next.handle();
          } catch (error) {
            errorsCaught.push(error as Error);
            throw error;
          }
        }
      }

      @Controller('/error-1')
      @UseInterceptors(ErrorHandlingInterceptor)
      class TestController9 {
        @Get('/')
        handler() {
          throw new Error('Handler error');
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/error-1'
      });

      expect(response.statusCode).toBe(500);
      expect(errorsCaught.length).toBe(1);
      expect(errorsCaught[0].message).toBe('Handler error');
    });

    it('should allow interceptor to catch and transform errors', async () => {
      @Injectable()
      class ErrorTransformInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          try {
            return await next.handle();
          } catch (error) {
            return { error: true, message: (error as Error).message };
          }
        }
      }

      @Controller('/error-2')
      @UseInterceptors(ErrorTransformInterceptor)
      class TestController10 {
        @Get('/')
        handler() {
          throw new Error('Something went wrong');
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/error-2'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        error: true,
        message: 'Something went wrong'
      });
    });
  });

  describe('Execution Context Access', () => {
    it('should provide access to request and response', async () => {
      const capturedData: { method?: string; url?: string }[] = [];

      @Injectable()
      class RequestContextInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          const request = context.switchToHttp().getRequest();
          capturedData.push({
            method: request.method,
            url: request.url
          });
          return next.handle();
        }
      }

      @Controller('/context-access-test')
      @UseInterceptors(RequestContextInterceptor)
      class ContextAccessController {
        @Get('/hello')
        handler() {
          return { ok: true };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/context-access-test/hello'
      });

      expect(response.statusCode).toBe(200);
      expect(capturedData.length).toBeGreaterThan(0);
      expect(capturedData[0].method).toBe('GET');
      expect(capturedData[0].url).toBe('/context-access-test/hello');
    });

    it('should provide access to controller class and handler name', async () => {
      let handlerInfo: { controller?: string; handler?: string } = {};

      @Injectable()
      class MetadataInterceptor implements Interceptor {
        async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
          handlerInfo = {
            controller: context.getClass().name,
            handler: String(context.getHandler())
          };
          return next.handle();
        }
      }

      @Controller('/context-2')
      @UseInterceptors(MetadataInterceptor)
      class TestController12 {
        @Get('/')
        myHandler() {
          return { ok: true };
        }
      }

      app = await Rikta.create({ port: 0, silent: true });
      await app.listen();

      await app.server.inject({
        method: 'GET',
        url: '/context-2'
      });

      expect(handlerInfo.controller).toBe('TestController12');
      expect(handlerInfo.handler).toBe('myHandler');
    });
  });
});

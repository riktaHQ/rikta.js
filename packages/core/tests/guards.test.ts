import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { Container } from '../src/core/container';
import { Registry } from '../src/core/registry';
import { Rikta } from '../src/core/application';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Get } from '../src/core/decorators/route.decorator';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { Autowired } from '../src/core/decorators/autowired.decorator';
import {
  UseGuards,
  getGuardsMetadata,
  CanActivate,
  ExecutionContext,
  ExecutionContextImpl
} from '../src/core/guards';
import { GUARDS_METADATA } from '../src/core/constants';

describe('Guards', () => {
  beforeEach(() => {
    Container.reset();
    Registry.reset();
  });

  describe('@UseGuards Decorator', () => {
    it('should store guard metadata on class', () => {
      @Injectable()
      class AuthGuard implements CanActivate {
        canActivate() { return true; }
      }

      @Controller('/test')
      @UseGuards(AuthGuard)
      class TestController { }

      const guards = Reflect.getMetadata(GUARDS_METADATA, TestController);
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(AuthGuard);
    });

    it('should store guard metadata on method', () => {
      @Injectable()
      class RoleGuard implements CanActivate {
        canActivate() { return true; }
      }

      class TestController {
        @Get('/')
        @UseGuards(RoleGuard)
        getAll() { }
      }

      const guards = Reflect.getMetadata(GUARDS_METADATA, TestController, 'getAll');
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(RoleGuard);
    });

    it('should store multiple guards', () => {
      @Injectable()
      class Guard1 implements CanActivate { canActivate() { return true; } }
      @Injectable()
      class Guard2 implements CanActivate { canActivate() { return true; } }

      @Controller('/test')
      @UseGuards(Guard1, Guard2)
      class TestController { }

      const guards = Reflect.getMetadata(GUARDS_METADATA, TestController);
      expect(guards).toHaveLength(2);
      expect(guards[0]).toBe(Guard1);
      expect(guards[1]).toBe(Guard2);
    });

    it('should accumulate guards when decorator is applied multiple times', () => {
      @Injectable()
      class Guard1 implements CanActivate { canActivate() { return true; } }
      @Injectable()
      class Guard2 implements CanActivate { canActivate() { return true; } }

      @Controller('/test')
      @UseGuards(Guard1)
      @UseGuards(Guard2)
      class TestController { }

      const guards = Reflect.getMetadata(GUARDS_METADATA, TestController);
      expect(guards).toHaveLength(2);
    });
  });

  describe('getGuardsMetadata', () => {
    it('should return empty array when no guards defined', () => {
      @Controller('/test')
      class TestController {
        @Get('/')
        getAll() { }
      }

      const guards = getGuardsMetadata(TestController, 'getAll');
      expect(guards).toEqual([]);
    });

    it('should return class-level guards', () => {
      @Injectable()
      class AuthGuard implements CanActivate { canActivate() { return true; } }

      @Controller('/test')
      @UseGuards(AuthGuard)
      class TestController {
        @Get('/')
        getAll() { }
      }

      const guards = getGuardsMetadata(TestController, 'getAll');
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(AuthGuard);
    });

    it('should return method-level guards', () => {
      @Injectable()
      class MethodGuard implements CanActivate { canActivate() { return true; } }

      @Controller('/test')
      class TestController {
        @Get('/')
        @UseGuards(MethodGuard)
        getAll() { }
      }

      const guards = getGuardsMetadata(TestController, 'getAll');
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(MethodGuard);
    });

    it('should combine class and method guards (class first)', () => {
      @Injectable()
      class ClassGuard implements CanActivate { canActivate() { return true; } }
      @Injectable()
      class MethodGuard implements CanActivate { canActivate() { return true; } }

      @Controller('/test')
      @UseGuards(ClassGuard)
      class TestController {
        @Get('/')
        @UseGuards(MethodGuard)
        getAll() { }
      }

      const guards = getGuardsMetadata(TestController, 'getAll');
      expect(guards).toHaveLength(2);
      expect(guards[0]).toBe(ClassGuard);
      expect(guards[1]).toBe(MethodGuard);
    });
  });

  describe('ExecutionContext', () => {
    it('should provide access to request', () => {
      const mockRequest = { headers: { authorization: 'Bearer token' } };
      const mockReply = {};
      const mockController = class TestController { };

      const context = new ExecutionContextImpl(
        mockRequest as any,
        mockReply as any,
        mockController,
        'handleRequest'
      );

      expect(context.getRequest()).toBe(mockRequest);
    });

    it('should provide access to reply', () => {
      const mockRequest = {};
      const mockReply = { status: vi.fn() };
      const mockController = class TestController { };

      const context = new ExecutionContextImpl(
        mockRequest as any,
        mockReply as any,
        mockController,
        'handleRequest'
      );

      expect(context.getReply()).toBe(mockReply);
    });

    it('should provide access to controller class', () => {
      const mockRequest = {};
      const mockReply = {};
      const mockController = class TestController { };

      const context = new ExecutionContextImpl(
        mockRequest as any,
        mockReply as any,
        mockController,
        'handleRequest'
      );

      expect(context.getClass()).toBe(mockController);
    });

    it('should provide access to handler name', () => {
      const mockRequest = {};
      const mockReply = {};
      const mockController = class TestController { };

      const context = new ExecutionContextImpl(
        mockRequest as any,
        mockReply as any,
        mockController,
        'handleRequest'
      );

      expect(context.getHandler()).toBe('handleRequest');
    });
  });

  describe('CanActivate Interface', () => {
    it('should work with synchronous guard', () => {
      @Injectable()
      class SyncGuard implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
          return true;
        }
      }

      const guard = new SyncGuard();
      const mockContext = new ExecutionContextImpl(
        {} as any,
        {} as any,
        class { },
        'test'
      );

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should work with async guard', async () => {
      @Injectable()
      class AsyncGuard implements CanActivate {
        async canActivate(context: ExecutionContext): Promise<boolean> {
          return Promise.resolve(true);
        }
      }

      const guard = new AsyncGuard();
      const mockContext = new ExecutionContextImpl(
        {} as any,
        {} as any,
        class { },
        'test'
      );

      expect(await guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('Guard Integration', () => {
    it('should allow access when guard returns true', async () => {
      @Injectable()
      class AllowGuard implements CanActivate {
        canActivate() { return true; }
      }

      @Controller('/test')
      @UseGuards(AllowGuard)
      class TestController {
        @Get('/')
        getData() {
          return { message: 'success' };
        }
      }

      const app = await Rikta.create({
        controllers: [TestController],
        logger: false,
        silent: true,
      });

      const response = await app.server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'success' });

      await app.close();
    });

    it('should deny access when guard returns false', async () => {
      @Injectable()
      class DenyGuard implements CanActivate {
        canActivate() { return false; }
      }

      @Controller('/denied')
      @UseGuards(DenyGuard)
      class DeniedController {
        @Get('/')
        getData() {
          return { message: 'should not reach here' };
        }
      }

      const app = await Rikta.create({
        controllers: [DeniedController],
        logger: false,
        silent: true,
      });

      const response = await app.server.inject({
        method: 'GET',
        url: '/denied',
      });

      expect(response.statusCode).toBe(403);

      await app.close();
    });

    it('should execute multiple guards in order (AND logic)', async () => {
      const executionOrder: string[] = [];

      @Injectable()
      class FirstGuard implements CanActivate {
        canActivate() {
          executionOrder.push('first');
          return true;
        }
      }

      @Injectable()
      class SecondGuard implements CanActivate {
        canActivate() {
          executionOrder.push('second');
          return true;
        }
      }

      @Controller('/multi')
      @UseGuards(FirstGuard, SecondGuard)
      class MultiGuardController {
        @Get('/')
        getData() {
          return { message: 'success' };
        }
      }

      const app = await Rikta.create({
        controllers: [MultiGuardController],
        logger: false,
        silent: true,
      });

      const response = await app.server.inject({
        method: 'GET',
        url: '/multi',
      });

      expect(response.statusCode).toBe(200);
      expect(executionOrder).toEqual(['first', 'second']);

      await app.close();
    });

    it('should stop on first failing guard', async () => {
      const executionOrder: string[] = [];

      @Injectable()
      class PassGuard implements CanActivate {
        canActivate() {
          executionOrder.push('pass');
          return true;
        }
      }

      @Injectable()
      class FailGuard implements CanActivate {
        canActivate() {
          executionOrder.push('fail');
          return false;
        }
      }

      @Injectable()
      class NeverReachedGuard implements CanActivate {
        canActivate() {
          executionOrder.push('never');
          return true;
        }
      }

      @Controller('/stopfirst')
      @UseGuards(PassGuard, FailGuard, NeverReachedGuard)
      class StopFirstController {
        @Get('/')
        getData() {
          return { message: 'should not reach' };
        }
      }

      const app = await Rikta.create({
        controllers: [StopFirstController],
        logger: false,
        silent: true,
      });

      const response = await app.server.inject({
        method: 'GET',
        url: '/stopfirst',
      });

      expect(response.statusCode).toBe(403);
      expect(executionOrder).toEqual(['pass', 'fail']);
      expect(executionOrder).not.toContain('never');

      await app.close();
    });

    it('should work with async guards', async () => {
      @Injectable()
      class AsyncAllowGuard implements CanActivate {
        async canActivate() {
          await new Promise(resolve => setTimeout(resolve, 10));
          return true;
        }
      }

      @Controller('/async')
      @UseGuards(AsyncAllowGuard)
      class AsyncController {
        @Get('/')
        getData() {
          return { message: 'async success' };
        }
      }

      const app = await Rikta.create({
        controllers: [AsyncController],
        logger: false,
        silent: true,
      });

      const response = await app.server.inject({
        method: 'GET',
        url: '/async',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'async success' });

      await app.close();
    });

    it('should inject dependencies into guards', async () => {
      @Injectable()
      class AuthServiceDI {
        isAuthenticated(token: string): boolean {
          return token === 'valid-token';
        }
      }

      @Injectable()
      class AuthGuardDI implements CanActivate {
        @Autowired(AuthServiceDI)
        private authService!: AuthServiceDI;

        canActivate(context: ExecutionContext): boolean {
          const request = context.getRequest();
          const token = request.headers.authorization;
          return this.authService.isAuthenticated(token as string);
        }
      }

      @Controller('/auth')
      @UseGuards(AuthGuardDI)
      class AuthControllerDI {
        @Get('/')
        getProtected() {
          return { message: 'authenticated' };
        }
      }

      const app = await Rikta.create({
        controllers: [AuthControllerDI],
        logger: false,
        silent: true,
      });

      // Without valid token
      const deniedResponse = await app.server.inject({
        method: 'GET',
        url: '/auth',
        headers: { authorization: 'invalid-token' },
      });
      expect(deniedResponse.statusCode).toBe(403);

      // With valid token
      const allowedResponse = await app.server.inject({
        method: 'GET',
        url: '/auth',
        headers: { authorization: 'valid-token' },
      });
      expect(allowedResponse.statusCode).toBe(200);
      expect(allowedResponse.json()).toEqual({ message: 'authenticated' });

      await app.close();
    });

    it('should create new transient guard instances for each request', async () => {
      let instanceCount = 0;

      @Injectable({ scope: 'transient' })
      class TransientGuard implements CanActivate {
        constructor() {
          instanceCount++;
        }

        canActivate(): boolean {
          return true;
        }
      }

      @Controller('/transient-guard')
      @UseGuards(TransientGuard)
      class TransientGuardController {
        @Get('/')
        getData() {
          return { ok: true };
        }
      }

      const app = await Rikta.create({
        controllers: [TransientGuardController],
        logger: false,
        silent: true,
      });

      await app.server.inject({ method: 'GET', url: '/transient-guard' });
      await app.server.inject({ method: 'GET', url: '/transient-guard' });

      expect(instanceCount).toBe(2);

      await app.close();
    });

    it('should resolve request-scoped guards per request', async () => {
      const requestIds = new Set<string>();

      @Injectable({ scope: 'request' })
      class RequestScopedGuard implements CanActivate {
        readonly requestId = Math.random().toString(36);

        canActivate(): boolean {
          requestIds.add(this.requestId);
          return true;
        }
      }

      @Controller('/request-guard')
      @UseGuards(RequestScopedGuard)
      class RequestGuardController {
        @Get('/')
        getData() {
          return { ok: true };
        }
      }

      const app = await Rikta.create({
        controllers: [RequestGuardController],
        logger: false,
        silent: true,
      });

      await app.server.inject({ method: 'GET', url: '/request-guard' });
      await app.server.inject({ method: 'GET', url: '/request-guard' });

      expect(requestIds.size).toBe(2);

      await app.close();
    });

    it('should allow singleton guards to access request-scoped dependencies', async () => {
      const requestIds = new Set<string>();

      @Injectable({ scope: 'request' })
      class GuardRequestContext {
        readonly requestId = Math.random().toString(36);
      }

      @Injectable()
      class RequestAwareGuard implements CanActivate {
        @Autowired(GuardRequestContext)
        private requestContext!: GuardRequestContext;

        canActivate(): boolean {
          requestIds.add(this.requestContext.requestId);
          return true;
        }
      }

      @Controller('/request-aware-guard')
      @UseGuards(RequestAwareGuard)
      class RequestAwareGuardController {
        @Get('/')
        getData() {
          return { ok: true };
        }
      }

      const app = await Rikta.create({
        controllers: [RequestAwareGuardController],
        logger: false,
        silent: true,
      });

      await app.server.inject({ method: 'GET', url: '/request-aware-guard' });
      await app.server.inject({ method: 'GET', url: '/request-aware-guard' });

      expect(requestIds.size).toBe(2);

      await app.close();
    });

    it('should apply method guards after controller guards', async () => {
      const executionOrder: string[] = [];

      @Injectable()
      class ControllerGuard implements CanActivate {
        canActivate() {
          executionOrder.push('controller');
          return true;
        }
      }

      @Injectable()
      class MethodGuard implements CanActivate {
        canActivate() {
          executionOrder.push('method');
          return true;
        }
      }

      @Controller('/combined')
      @UseGuards(ControllerGuard)
      class CombinedController {
        @Get('/')
        @UseGuards(MethodGuard)
        getData() {
          return { message: 'success' };
        }

        @Get('/no-method-guard')
        getNoMethodGuard() {
          return { message: 'only controller guard' };
        }
      }

      const app = await Rikta.create({
        controllers: [CombinedController],
        logger: false,
        silent: true,
      });

      // Test combined guards
      executionOrder.length = 0;
      const combinedResponse = await app.server.inject({
        method: 'GET',
        url: '/combined',
      });
      expect(combinedResponse.statusCode).toBe(200);
      expect(executionOrder).toEqual(['controller', 'method']);

      // Test only controller guard
      executionOrder.length = 0;
      const controllerOnlyResponse = await app.server.inject({
        method: 'GET',
        url: '/combined/no-method-guard',
      });
      expect(controllerOnlyResponse.statusCode).toBe(200);
      expect(executionOrder).toEqual(['controller']);

      await app.close();
    });

    it('should provide handler info in ExecutionContext', async () => {
      let capturedContext: ExecutionContext | null = null;

      @Injectable()
      class ContextCaptureGuard implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
          capturedContext = context;
          return true;
        }
      }

      @Controller('/context')
      @UseGuards(ContextCaptureGuard)
      class ContextController {
        @Get('/info')
        getInfo() {
          return { message: 'info' };
        }
      }

      const app = await Rikta.create({
        controllers: [ContextController],
        logger: false,
        silent: true,
      });

      await app.server.inject({
        method: 'GET',
        url: '/context/info',
      });

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.getClass()).toBe(ContextController);
      expect(capturedContext!.getHandler()).toBe('getInfo');

      await app.close();
    });
  });
});

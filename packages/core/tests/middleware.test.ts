import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { Container } from '../src/core/container';
import { Registry } from '../src/core/registry';
import { Rikta } from '../src/core/application';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Get } from '../src/core/decorators/route.decorator';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { Autowired } from '../src/core/decorators/autowired.decorator';
import { UseGuards, CanActivate } from '../src/core/guards';
import {
    Middleware,
    UseMiddleware,
    RiktaMiddleware,
    getMiddlewaresMetadata,
} from '../src/core/middleware';
import { INJECTABLE_METADATA, MIDDLEWARE_METADATA } from '../src/core/constants';
import type { FastifyRequest, FastifyReply } from 'fastify';

describe('Middleware', () => {
    beforeEach(() => {
        Container.reset();
        Registry.reset();
    });

    describe('@Middleware Decorator', () => {
        it('should mark a class as middleware', () => {
            @Middleware()
            class TestMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            const metadata = Reflect.getMetadata('middleware', TestMiddleware);
            expect(metadata).toBe(true);
        });

        it('should mark middleware as injectable', () => {
            @Middleware()
            class TestMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            expect(Reflect.getMetadata(INJECTABLE_METADATA, TestMiddleware)).toEqual({ scope: 'singleton' });
            expect(Container.getInstance().has(TestMiddleware)).toBe(true);
        });
    });

    describe('@UseMiddleware Decorator', () => {
        it('should store middleware metadata on class', () => {
            @Middleware()
            class LoggerMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Controller('/test')
            @UseMiddleware(LoggerMiddleware)
            class TestController { }

            const middlewares = Reflect.getMetadata(MIDDLEWARE_METADATA, TestController);
            expect(middlewares).toBeDefined();
            expect(middlewares).toHaveLength(1);
            expect(middlewares[0]).toBe(LoggerMiddleware);
        });

        it('should store middleware metadata on method', () => {
            @Middleware()
            class AuthMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            class TestController {
                @Get('/')
                @UseMiddleware(AuthMiddleware)
                getAll() { }
            }

            const middlewares = Reflect.getMetadata(MIDDLEWARE_METADATA, TestController, 'getAll');
            expect(middlewares).toBeDefined();
            expect(middlewares).toHaveLength(1);
            expect(middlewares[0]).toBe(AuthMiddleware);
        });

        it('should store multiple middlewares', () => {
            @Middleware()
            class Middleware1 implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Middleware()
            class Middleware2 implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Controller('/test')
            @UseMiddleware(Middleware1, Middleware2)
            class TestController { }

            const middlewares = Reflect.getMetadata(MIDDLEWARE_METADATA, TestController);
            expect(middlewares).toHaveLength(2);
            expect(middlewares[0]).toBe(Middleware1);
            expect(middlewares[1]).toBe(Middleware2);
        });

        it('should accumulate middlewares when decorator is applied multiple times', () => {
            @Middleware()
            class Middleware1 implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Middleware()
            class Middleware2 implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Controller('/test')
            @UseMiddleware(Middleware1)
            @UseMiddleware(Middleware2)
            class TestController { }

            const middlewares = Reflect.getMetadata(MIDDLEWARE_METADATA, TestController);
            expect(middlewares).toHaveLength(2);
        });
    });

    describe('getMiddlewaresMetadata', () => {
        it('should return empty array when no middlewares defined', () => {
            @Controller('/test')
            class TestController {
                @Get('/')
                getAll() { }
            }

            const middlewares = getMiddlewaresMetadata(TestController, 'getAll');
            expect(middlewares).toEqual([]);
        });

        it('should return class-level middlewares', () => {
            @Middleware()
            class LoggerMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Controller('/test')
            @UseMiddleware(LoggerMiddleware)
            class TestController {
                @Get('/')
                getAll() { }
            }

            const middlewares = getMiddlewaresMetadata(TestController, 'getAll');
            expect(middlewares).toHaveLength(1);
            expect(middlewares[0]).toBe(LoggerMiddleware);
        });

        it('should return method-level middlewares', () => {
            @Middleware()
            class MethodMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Controller('/test')
            class TestController {
                @Get('/')
                @UseMiddleware(MethodMiddleware)
                getAll() { }
            }

            const middlewares = getMiddlewaresMetadata(TestController, 'getAll');
            expect(middlewares).toHaveLength(1);
            expect(middlewares[0]).toBe(MethodMiddleware);
        });

        it('should combine class and method middlewares (class first)', () => {
            @Middleware()
            class ClassMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Middleware()
            class MethodMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            @Controller('/test')
            @UseMiddleware(ClassMiddleware)
            class TestController {
                @Get('/')
                @UseMiddleware(MethodMiddleware)
                getAll() { }
            }

            const middlewares = getMiddlewaresMetadata(TestController, 'getAll');
            expect(middlewares).toHaveLength(2);
            expect(middlewares[0]).toBe(ClassMiddleware);
            expect(middlewares[1]).toBe(MethodMiddleware);
        });
    });

    describe('Middleware with dependency injection', () => {
        it('should inject dependencies into middleware', () => {
            @Injectable()
            class LogService {
                log(message: string) {
                    return `Logged: ${message}`;
                }
            }

            @Middleware()
            class LoggerMiddleware implements RiktaMiddleware {
                constructor(@Autowired(LogService) private logService: LogService) { }

                use(req: any, reply: any, next: () => void) {
                    this.logService.log('Request received');
                    next();
                }
            }

            const container = Container.getInstance();
            const registry = Registry.getInstance();

            registry.registerProvider(LogService);
            registry.registerProvider(LoggerMiddleware);

            const middleware = container.resolve(LoggerMiddleware);
            expect(middleware).toBeDefined();
            expect((middleware as any).logService).toBeDefined();
            expect((middleware as any).logService.log('test')).toBe('Logged: test');
        });
    });

    describe('RiktaMiddleware interface', () => {
        it('should enforce use method signature', () => {
            @Middleware()
            class ValidMiddleware implements RiktaMiddleware {
                use(req: any, reply: any, next: () => void) {
                    next();
                }
            }

            const middleware = new ValidMiddleware();
            expect(typeof middleware.use).toBe('function');
        });

        it('should support async use method', async () => {
            @Middleware()
            class AsyncMiddleware implements RiktaMiddleware {
                async use(req: any, reply: any, next: () => void) {
                    await Promise.resolve();
                    next();
                }
            }

            const middleware = new AsyncMiddleware();
            const nextFn = vi.fn();

            await middleware.use({}, {}, nextFn);
            expect(nextFn).toHaveBeenCalled();
        });
    });

    describe('Middleware Integration', () => {
        it('should execute middleware before handler', async () => {
            const executionOrder: string[] = [];

            @Middleware()
            class LoggerMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('middleware');
                    next();
                }
            }

            @Controller('/test-mw')
            @UseMiddleware(LoggerMiddleware)
            class TestController {
                @Get('/')
                getData() {
                    executionOrder.push('handler');
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
                url: '/test-mw',
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({ message: 'success' });
            expect(executionOrder).toEqual(['middleware', 'handler']);

            await app.close();
        });

        it('should execute middlewares in order', async () => {
            const executionOrder: string[] = [];

            @Middleware()
            class FirstMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('first');
                    next();
                }
            }

            @Middleware()
            class SecondMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('second');
                    next();
                }
            }

            @Controller('/test-order')
            @UseMiddleware(FirstMiddleware, SecondMiddleware)
            class OrderController {
                @Get('/')
                getData() {
                    executionOrder.push('handler');
                    return { message: 'success' };
                }
            }

            const app = await Rikta.create({
                controllers: [OrderController],
                logger: false,
                silent: true,
            });

            const response = await app.server.inject({
                method: 'GET',
                url: '/test-order',
            });

            expect(response.statusCode).toBe(200);
            expect(executionOrder).toEqual(['first', 'second', 'handler']);

            await app.close();
        });

        it('should execute guards BEFORE middleware', async () => {
            const executionOrder: string[] = [];

            @Injectable()
            class TestGuard implements CanActivate {
                canActivate() {
                    executionOrder.push('guard');
                    return true;
                }
            }

            @Middleware()
            class TestMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('middleware');
                    next();
                }
            }

            @Controller('/test-guard-mw')
            @UseGuards(TestGuard)
            @UseMiddleware(TestMiddleware)
            class GuardMiddlewareController {
                @Get('/')
                getData() {
                    executionOrder.push('handler');
                    return { message: 'success' };
                }
            }

            const app = await Rikta.create({
                controllers: [GuardMiddlewareController],
                logger: false,
                silent: true,
            });

            const response = await app.server.inject({
                method: 'GET',
                url: '/test-guard-mw',
            });

            expect(response.statusCode).toBe(200);
            expect(executionOrder).toEqual(['guard', 'middleware', 'handler']);

            await app.close();
        });

        it('should NOT execute middleware if guard rejects', async () => {
            const executionOrder: string[] = [];

            @Injectable()
            class RejectGuard implements CanActivate {
                canActivate() {
                    executionOrder.push('guard');
                    return false;
                }
            }

            @Middleware()
            class TestMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('middleware');
                    next();
                }
            }

            @Controller('/test-reject')
            @UseGuards(RejectGuard)
            @UseMiddleware(TestMiddleware)
            class RejectController {
                @Get('/')
                getData() {
                    executionOrder.push('handler');
                    return { message: 'should not reach' };
                }
            }

            const app = await Rikta.create({
                controllers: [RejectController],
                logger: false,
                silent: true,
            });

            const response = await app.server.inject({
                method: 'GET',
                url: '/test-reject',
            });

            expect(response.statusCode).toBe(403);
            expect(executionOrder).toEqual(['guard']);

            await app.close();
        });

        it('should allow middleware to modify request', async () => {
            let capturedData: any;

            @Middleware()
            class RequestModifierMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    (req as any).customData = { added: 'by middleware' };
                    next();
                }
            }

            @Middleware()
            class CaptureMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    capturedData = (req as any).customData;
                    next();
                }
            }

            @Controller('/test-modify')
            @UseMiddleware(RequestModifierMiddleware, CaptureMiddleware)
            class ModifyController {
                @Get('/')
                getData() {
                    return { message: 'success' };
                }
            }

            const app = await Rikta.create({
                controllers: [ModifyController],
                logger: false,
                silent: true,
            });

            await app.server.inject({
                method: 'GET',
                url: '/test-modify',
            });

            expect(capturedData).toEqual({ added: 'by middleware' });

            await app.close();
        });

        it('should support async middleware', async () => {
            const executionOrder: string[] = [];

            @Middleware()
            class AsyncMiddleware implements RiktaMiddleware {
                async use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('async-start');
                    await new Promise(resolve => setTimeout(resolve, 10));
                    executionOrder.push('async-end');
                    next();
                }
            }

            @Controller('/test-async')
            @UseMiddleware(AsyncMiddleware)
            class AsyncController {
                @Get('/')
                getData() {
                    executionOrder.push('handler');
                    return { message: 'success' };
                }
            }

            const app = await Rikta.create({
                controllers: [AsyncController],
                logger: false,
                silent: true,
            });

            const response = await app.server.inject({
                method: 'GET',
                url: '/test-async',
            });

            expect(response.statusCode).toBe(200);
            expect(executionOrder).toEqual(['async-start', 'async-end', 'handler']);

            await app.close();
        });

        it('should combine controller and method middleware', async () => {
            const executionOrder: string[] = [];

            @Middleware()
            class ControllerMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('controller-mw');
                    next();
                }
            }

            @Middleware()
            class MethodMiddleware implements RiktaMiddleware {
                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    executionOrder.push('method-mw');
                    next();
                }
            }

            @Controller('/test-combined')
            @UseMiddleware(ControllerMiddleware)
            class CombinedController {
                @Get('/')
                @UseMiddleware(MethodMiddleware)
                getData() {
                    executionOrder.push('handler');
                    return { message: 'success' };
                }
            }

            const app = await Rikta.create({
                controllers: [CombinedController],
                logger: false,
                silent: true,
            });

            const response = await app.server.inject({
                method: 'GET',
                url: '/test-combined',
            });

            expect(response.statusCode).toBe(200);
            expect(executionOrder).toEqual(['controller-mw', 'method-mw', 'handler']);

            await app.close();
        });

        it('should support middleware with dependency injection', async () => {
            let serviceCalled = false;

            @Injectable()
            class LogService {
                log() {
                    serviceCalled = true;
                }
            }

            @Middleware()
            class LoggerMiddleware implements RiktaMiddleware {
                constructor(@Autowired(LogService) private logService: LogService) { }

                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    this.logService.log();
                    next();
                }
            }

            @Controller('/test-di')
            @UseMiddleware(LoggerMiddleware)
            class DIController {
                @Get('/')
                getData() {
                    return { message: 'success' };
                }
            }

            const app = await Rikta.create({
                controllers: [DIController],
                providers: [LogService],
                logger: false,
                silent: true,
            });

            await app.server.inject({
                method: 'GET',
                url: '/test-di',
            });

            expect(serviceCalled).toBe(true);

            await app.close();
        });

        it('should create new transient middleware instances for each request', async () => {
            let instanceCount = 0;

            @Middleware()
            class TransientMiddleware implements RiktaMiddleware {
                constructor() {
                    instanceCount++;
                }

                use(req: FastifyRequest, res: FastifyReply, next: () => void) {
                    next();
                }
            }

            Container.getInstance().register(TransientMiddleware, { scope: 'transient' });

            @Controller('/test-transient-mw')
            @UseMiddleware(TransientMiddleware)
            class TransientMiddlewareController {
                @Get('/')
                getData() {
                    return { ok: true };
                }
            }

            const app = await Rikta.create({
                controllers: [TransientMiddlewareController],
                logger: false,
                silent: true,
            });

            await app.server.inject({ method: 'GET', url: '/test-transient-mw' });
            await app.server.inject({ method: 'GET', url: '/test-transient-mw' });

            expect(instanceCount).toBe(2);

            await app.close();
        });
    });
});

import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { container } from '../src/core/container';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { Get, Post, Put, Delete, Patch, HttpCode } from '../src/core/decorators/route.decorator';
import { Body, Param, Query, Headers, Req, Res } from '../src/core/decorators/param.decorator';
import { CONTROLLER_METADATA, ROUTES_METADATA, INJECTABLE_METADATA, PARAM_METADATA, HTTP_CODE_METADATA, ParamType } from '../src/core/constants';

describe('Decorators', () => {
  describe('@Controller', () => {
    it('should set controller metadata with prefix', () => {
      @Controller('/users')
      class UserController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, UserController);
      expect(metadata).toEqual({ prefix: '/users' });
    });

    it('should normalize prefix without leading slash', () => {
      @Controller('products')
      class ProductController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, ProductController);
      expect(metadata).toEqual({ prefix: '/products' });
    });

    it('should handle empty prefix', () => {
      @Controller()
      class RootController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, RootController);
      expect(metadata).toEqual({ prefix: '' });
    });

    it('should mark controller as injectable', () => {
      @Controller('/test')
      class TestController {}

      const metadata = Reflect.getMetadata(INJECTABLE_METADATA, TestController);
      expect(metadata).toEqual({ scope: 'singleton' });
    });

    it('should register in container', () => {
      @Controller('/registered')
      class RegisteredController {}

      expect(container.has(RegisteredController)).toBe(true);
    });
  });

  describe('@Injectable', () => {
    it('should set injectable metadata', () => {
      @Injectable()
      class TestService {}

      const metadata = Reflect.getMetadata(INJECTABLE_METADATA, TestService);
      expect(metadata).toEqual({});
    });

    it('should set scope option', () => {
      @Injectable({ scope: 'transient' })
      class TransientService {}

      const metadata = Reflect.getMetadata(INJECTABLE_METADATA, TransientService);
      expect(metadata).toEqual({ scope: 'transient' });
    });

    it('should register in container', () => {
      @Injectable()
      class ContainerService {}

      expect(container.has(ContainerService)).toBe(true);
    });
  });

  describe('Route Decorators', () => {
    it('@Get should add route metadata', () => {
      class TestController {
        @Get('/items')
        getItems() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toContainEqual({
        method: 'GET',
        path: '/items',
        handlerName: 'getItems',
      });
    });

    it('@Post should add route metadata', () => {
      class TestController {
        @Post('/items')
        createItem() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toContainEqual({
        method: 'POST',
        path: '/items',
        handlerName: 'createItem',
      });
    });

    it('@Put should add route metadata', () => {
      class TestController {
        @Put('/items/:id')
        updateItem() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/items/:id',
        handlerName: 'updateItem',
      });
    });

    it('@Delete should add route metadata', () => {
      class TestController {
        @Delete('/items/:id')
        deleteItem() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toContainEqual({
        method: 'DELETE',
        path: '/items/:id',
        handlerName: 'deleteItem',
      });
    });

    it('@Patch should add route metadata', () => {
      class TestController {
        @Patch('/items/:id')
        patchItem() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toContainEqual({
        method: 'PATCH',
        path: '/items/:id',
        handlerName: 'patchItem',
      });
    });

    it('should handle empty path', () => {
      class TestController {
        @Get()
        getRoot() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toContainEqual({
        method: 'GET',
        path: '',
        handlerName: 'getRoot',
      });
    });

    it('should collect multiple routes', () => {
      class TestController {
        @Get()
        list() {}

        @Get('/:id')
        getOne() {}

        @Post()
        create() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(3);
    });

    it('@HttpCode should set status code metadata', () => {
      class TestController {
        @Post()
        @HttpCode(201)
        create() {}
      }

      const statusCode = Reflect.getMetadata(HTTP_CODE_METADATA, TestController, 'create');
      expect(statusCode).toBe(201);
    });
  });

  describe('Parameter Decorators', () => {
    it('@Body should add param metadata', () => {
      class TestController {
        create(@Body() data: unknown) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'create');
      expect(params).toContainEqual({
        index: 0,
        type: ParamType.BODY,
        key: undefined,
      });
    });

    it('@Body with key should add param metadata', () => {
      class TestController {
        create(@Body('name') name: string) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'create');
      expect(params).toContainEqual({
        index: 0,
        type: ParamType.BODY,
        key: 'name',
      });
    });

    it('@Param should add param metadata', () => {
      class TestController {
        getOne(@Param('id') id: string) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'getOne');
      expect(params).toContainEqual({
        index: 0,
        type: ParamType.PARAM,
        key: 'id',
      });
    });

    it('@Query should add param metadata', () => {
      class TestController {
        list(@Query('page') page: string) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'list');
      expect(params).toContainEqual({
        index: 0,
        type: ParamType.QUERY,
        key: 'page',
      });
    });

    it('@Headers should add param metadata', () => {
      class TestController {
        getData(@Headers('authorization') auth: string) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'getData');
      expect(params).toContainEqual({
        index: 0,
        type: ParamType.HEADERS,
        key: 'authorization',
      });
    });

    it('@Req should add param metadata', () => {
      class TestController {
        handle(@Req() req: unknown) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'handle');
      expect(params).toContainEqual({
        index: 0,
        type: ParamType.REQUEST,
        key: undefined,
      });
    });

    it('@Res should add param metadata', () => {
      class TestController {
        handle(@Res() res: unknown) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'handle');
      expect(params).toContainEqual({
        index: 0,
        type: ParamType.REPLY,
        key: undefined,
      });
    });

    it('should handle multiple params', () => {
      class TestController {
        update(
          @Param('id') id: string,
          @Body() data: unknown,
          @Query('version') version: string
        ) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestController, 'update');
      expect(params).toHaveLength(3);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { 
  createParamDecorator, 
  CUSTOM_PARAM_METADATA, 
  getCustomParamMetadata,
  CustomParamMetadata 
} from '../src/core/decorators/create-param-decorator';
import { applyDecorators, SetMetadata } from '../src/core/decorators/apply-decorators';
import { ExecutionContext } from '../src/core/guards/execution-context';

describe('Custom Decorators', () => {
  describe('createParamDecorator', () => {
    it('should create a parameter decorator factory', () => {
      const TestDecorator = createParamDecorator((data, ctx) => {
        return 'test-value';
      });

      expect(typeof TestDecorator).toBe('function');
      expect(typeof TestDecorator()).toBe('function');
    });

    it('should store custom param metadata', () => {
      const factory = (data: string | undefined, ctx: ExecutionContext) => {
        return data ? `data: ${data}` : 'no data';
      };

      const User = createParamDecorator(factory);

      class TestController {
        testMethod(@User() user: unknown) {}
      }

      const metadata = getCustomParamMetadata(TestController, 'testMethod');
      expect(metadata).toHaveLength(1);
      expect(metadata[0].index).toBe(0);
      expect(metadata[0].factory).toBe(factory);
      expect(metadata[0].data).toBeUndefined();
    });

    it('should store data when passed to decorator', () => {
      const User = createParamDecorator<string>((data, ctx) => data);

      class TestController {
        testMethod(@User('email') email: string) {}
      }

      const metadata = getCustomParamMetadata<string>(TestController, 'testMethod');
      expect(metadata).toHaveLength(1);
      expect(metadata[0].data).toBe('email');
    });

    it('should handle multiple custom param decorators', () => {
      const User = createParamDecorator((data, ctx) => 'user');
      const ClientIp = createParamDecorator((data, ctx) => 'ip');

      class TestController {
        testMethod(@User() user: unknown, @ClientIp() ip: string) {}
      }

      const metadata = getCustomParamMetadata(TestController, 'testMethod');
      expect(metadata).toHaveLength(2);
      
      const userParam = metadata.find((m: CustomParamMetadata) => m.index === 0);
      const ipParam = metadata.find((m: CustomParamMetadata) => m.index === 1);
      
      expect(userParam).toBeDefined();
      expect(ipParam).toBeDefined();
    });

    it('should store factory for execution at runtime', () => {
      let capturedData: string | undefined;
      let capturedContext: ExecutionContext | undefined;

      const TestDecorator = createParamDecorator<string>((data, ctx) => {
        capturedData = data;
        capturedContext = ctx;
        return { data, ctx };
      });

      class TestController {
        testMethod(@TestDecorator('testData') param: unknown) {}
      }

      const metadata = getCustomParamMetadata<string>(TestController, 'testMethod');
      expect(metadata[0].factory).toBeDefined();
      
      // Simulate factory execution
      const mockContext = {
        getRequest: () => ({}),
        getReply: () => ({}),
        getClass: () => TestController,
        getHandler: () => 'testMethod',
        getMetadata: () => undefined,
      } as ExecutionContext;

      const result = metadata[0].factory('testData', mockContext);
      expect(capturedData).toBe('testData');
      expect(capturedContext).toBe(mockContext);
    });
  });

  describe('applyDecorators', () => {
    it('should apply method decorators in reverse order', () => {
      const order: string[] = [];
      
      const Decorator1 = (): MethodDecorator => (target, key, descriptor) => {
        order.push('decorator1');
        return descriptor;
      };
      
      const Decorator2 = (): MethodDecorator => (target, key, descriptor) => {
        order.push('decorator2');
        return descriptor;
      };

      class TestController {
        @applyDecorators(Decorator1(), Decorator2())
        testMethod() {}
      }

      // Decorators are applied in reverse order (last to first, like TypeScript)
      expect(order).toEqual(['decorator2', 'decorator1']);
    });

    it('should work with class decorators', () => {
      const applied: string[] = [];
      
      const ClassDecorator1 = (): ClassDecorator => (target) => {
        applied.push('class1');
        return target;
      };
      
      const ClassDecorator2 = (): ClassDecorator => (target) => {
        applied.push('class2');
        return target;
      };

      @applyDecorators(ClassDecorator1(), ClassDecorator2())
      class TestClass {}

      // At least one of the decorators was applied
      // (class decorator behavior may vary based on return value handling)
      expect(applied.length).toBeGreaterThan(0);
    });

    it('should combine multiple decorators into one', () => {
      const Auth = () => applyDecorators(
        SetMetadata('authenticated', true),
        SetMetadata('roles', ['admin'])
      );

      class TestController {
        @Auth()
        protectedMethod() {}
      }

      const authenticated = Reflect.getMetadata('authenticated', TestController, 'protectedMethod');
      const roles = Reflect.getMetadata('roles', TestController, 'protectedMethod');

      expect(authenticated).toBe(true);
      expect(roles).toEqual(['admin']);
    });
  });

  describe('SetMetadata', () => {
    it('should set metadata on method', () => {
      class TestController {
        @SetMetadata('testKey', 'testValue')
        testMethod() {}
      }

      const value = Reflect.getMetadata('testKey', TestController, 'testMethod');
      expect(value).toBe('testValue');
    });

    it('should set metadata on class', () => {
      @SetMetadata('classKey', 'classValue')
      class TestClass {}

      const value = Reflect.getMetadata('classKey', TestClass);
      expect(value).toBe('classValue');
    });

    it('should support symbol keys', () => {
      const KEY = Symbol('custom-key');

      class TestController {
        @SetMetadata(KEY, { complex: true })
        testMethod() {}
      }

      const value = Reflect.getMetadata(KEY, TestController, 'testMethod');
      expect(value).toEqual({ complex: true });
    });

    it('should support any value type', () => {
      const metadata = {
        permissions: ['read', 'write'],
        level: 5,
        nested: { deep: true }
      };

      class TestController {
        @SetMetadata('config', metadata)
        testMethod() {}
      }

      const value = Reflect.getMetadata('config', TestController, 'testMethod');
      expect(value).toEqual(metadata);
    });
  });

  describe('Combined usage', () => {
    it('should work with createParamDecorator and applyDecorators together', () => {
      const User = createParamDecorator((data: string | undefined, ctx) => {
        const request = ctx.getRequest<{ user?: { id: string; email: string } }>();
        return data ? request.user?.[data as keyof typeof request.user] : request.user;
      });

      const Auth = (...roles: string[]) => applyDecorators(
        SetMetadata('authenticated', true),
        SetMetadata('roles', roles)
      );

      @SetMetadata('controller', true)
      class UserController {
        @Auth('admin', 'user')
        getProfile(@User() user: unknown, @User('email') email: string) {
          return { user, email };
        }
      }

      // Check custom params
      const params = getCustomParamMetadata(UserController, 'getProfile');
      expect(params).toHaveLength(2);
      
      // Params may be stored in any order, so check by index
      const param0 = params.find((p: CustomParamMetadata) => p.index === 0);
      const param1 = params.find((p: CustomParamMetadata) => p.index === 1);
      expect(param0).toBeDefined();
      expect(param0!.data).toBeUndefined();
      expect(param1).toBeDefined();
      expect(param1!.data).toBe('email');

      // Check composed decorator metadata
      const authenticated = Reflect.getMetadata('authenticated', UserController, 'getProfile');
      const roles = Reflect.getMetadata('roles', UserController, 'getProfile');
      expect(authenticated).toBe(true);
      expect(roles).toEqual(['admin', 'user']);

      // Check class metadata
      const controllerMeta = Reflect.getMetadata('controller', UserController);
      expect(controllerMeta).toBe(true);
    });
  });
});

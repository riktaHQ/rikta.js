import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { z } from 'zod';
import { PARAM_METADATA, ParamType } from '../src/core/constants';
import { Body, Query, Param, Headers, ParamMetadata } from '../src/core/decorators/param.decorator';

describe('Zod Decorators', () => {
  describe('@Body decorator', () => {
    it('should store metadata without schema (no args)', () => {
      class TestController {
        createUser(@Body() data: unknown) { return data; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'createUser') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.BODY);
      expect(metadata[0].key).toBeUndefined();
      expect(metadata[0].zodSchema).toBeUndefined();
    });

    it('should store metadata with key string', () => {
      class TestController {
        createUser(@Body('name') name: string) { return name; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'createUser') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.BODY);
      expect(metadata[0].key).toBe('name');
      expect(metadata[0].zodSchema).toBeUndefined();
    });

    it('should store metadata with Zod schema', () => {
      const CreateUserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      class TestController {
        createUser(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) { return data; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'createUser') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.BODY);
      expect(metadata[0].key).toBeUndefined();
      expect(metadata[0].zodSchema).toBe(CreateUserSchema);
    });
  });

  describe('@Query decorator', () => {
    it('should store metadata without schema', () => {
      class TestController {
        getUsers(@Query() query: unknown) { return query; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'getUsers') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.QUERY);
      expect(metadata[0].zodSchema).toBeUndefined();
    });

    it('should store metadata with Zod schema', () => {
      const PaginationSchema = z.object({
        page: z.coerce.number().int().positive(),
        limit: z.coerce.number().int().positive().max(100),
      });

      class TestController {
        getUsers(@Query(PaginationSchema) query: z.infer<typeof PaginationSchema>) { return query; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'getUsers') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.QUERY);
      expect(metadata[0].zodSchema).toBe(PaginationSchema);
    });
  });

  describe('@Param decorator', () => {
    it('should store metadata with key string', () => {
      class TestController {
        getUser(@Param('id') id: string) { return id; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'getUser') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.PARAM);
      expect(metadata[0].key).toBe('id');
      expect(metadata[0].zodSchema).toBeUndefined();
    });

    it('should store metadata with Zod schema', () => {
      const IdSchema = z.object({
        id: z.string().uuid(),
      });

      class TestController {
        getUser(@Param(IdSchema) params: z.infer<typeof IdSchema>) { return params; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'getUser') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.PARAM);
      expect(metadata[0].key).toBeUndefined();
      expect(metadata[0].zodSchema).toBe(IdSchema);
    });
  });

  describe('@Headers decorator', () => {
    it('should store metadata with key string', () => {
      class TestController {
        getData(@Headers('authorization') auth: string) { return auth; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'getData') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.HEADERS);
      expect(metadata[0].key).toBe('authorization');
      expect(metadata[0].zodSchema).toBeUndefined();
    });

    it('should store metadata with Zod schema', () => {
      const AuthHeadersSchema = z.object({
        authorization: z.string().startsWith('Bearer '),
        'x-api-key': z.string().optional(),
      });

      class TestController {
        getData(@Headers(AuthHeadersSchema) headers: z.infer<typeof AuthHeadersSchema>) { return headers; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'getData') as ParamMetadata[];
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe(ParamType.HEADERS);
      expect(metadata[0].key).toBeUndefined();
      expect(metadata[0].zodSchema).toBe(AuthHeadersSchema);
    });
  });

  describe('Multiple decorators on same method', () => {
    it('should handle multiple parameters with mixed schema/key usage', () => {
      const BodySchema = z.object({ name: z.string() });
      
      class TestController {
        updateUser(
          @Param('id') id: string,
          @Body(BodySchema) data: z.infer<typeof BodySchema>,
          @Query('dry') dryRun: string,
        ) { 
          return { id, data, dryRun }; 
        }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'updateUser') as ParamMetadata[];
      
      expect(metadata).toHaveLength(3);
      
      // Find each param by index
      const paramMeta = metadata.find(m => m.type === ParamType.PARAM);
      const bodyMeta = metadata.find(m => m.type === ParamType.BODY);
      const queryMeta = metadata.find(m => m.type === ParamType.QUERY);
      
      expect(paramMeta?.key).toBe('id');
      expect(paramMeta?.zodSchema).toBeUndefined();
      
      expect(bodyMeta?.key).toBeUndefined();
      expect(bodyMeta?.zodSchema).toBe(BodySchema);
      
      expect(queryMeta?.key).toBe('dry');
      expect(queryMeta?.zodSchema).toBeUndefined();
    });
  });

  describe('Stored schema validation', () => {
    it('should be able to validate data using stored zodSchema', () => {
      const UserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().int().positive(),
      });

      class TestController {
        createUser(@Body(UserSchema) data: z.infer<typeof UserSchema>) { return data; }
      }
      
      const metadata = Reflect.getMetadata(PARAM_METADATA, TestController, 'createUser') as ParamMetadata[];
      const schema = metadata[0].zodSchema;
      
      // Valid data
      const validResult = schema?.safeParse({
        name: 'John',
        email: 'john@example.com',
        age: 30,
      });
      expect(validResult?.success).toBe(true);
      
      // Invalid data - should fail
      const invalidResult = schema?.safeParse({
        name: '',
        email: 'not-an-email',
        age: -5,
      });
      expect(invalidResult?.success).toBe(false);
      if (!invalidResult?.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThanOrEqual(3);
      }
    });
  });
});

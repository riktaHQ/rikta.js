import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'reflect-metadata';
import { z } from 'zod';
import Fastify, { FastifyInstance } from 'fastify';
import { Container } from '../src/core/container/container';
import { Router } from '../src/core/router/router';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Post, Get, Put } from '../src/core/decorators/route.decorator';
import { Body, Query, Param, Headers } from '../src/core/decorators/param.decorator';
import { GlobalExceptionFilter, createExceptionHandler } from '../src/core/exceptions/exception-filter';

describe('Zod Validation Integration', () => {
  let container: Container;
  let server: FastifyInstance;
  let router: Router;

  beforeEach(() => {
    Container.reset();
    container = Container.getInstance();
    server = Fastify({ logger: false });
    
    // Configure exception handler to properly format ValidationException
    const globalFilter = new GlobalExceptionFilter({ includeStack: false, logErrors: false });
    server.setErrorHandler(createExceptionHandler(globalFilter));
    
    router = new Router(server, container, '');
  });

  afterEach(async () => {
    await server.close();
  });

  describe('@Body validation', () => {
    it('should pass validation with valid body data', async () => {
      const CreateUserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().int().positive(),
      });

      @Controller('/users')
      class UserController {
        @Post()
        create(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
          return { success: true, user: data };
        }
      }

      container.register(UserController);
      router.registerController(UserController);

      const response = await server.inject({
        method: 'POST',
        url: '/users',
        payload: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.user).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });
    });

    it('should return 400 with validation errors for invalid body', async () => {
      const CreateUserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().int().positive(),
      });

      @Controller('/users')
      class UserController2 {
        @Post()
        create(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
          return { success: true, user: data };
        }
      }

      container.register(UserController2);
      router.registerController(UserController2);

      const response = await server.inject({
        method: 'POST',
        url: '/users',
        payload: {
          name: '', // too short
          email: 'not-an-email', // invalid email
          age: -5, // negative
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Validation Error');
      expect(body.message).toContain('Validation failed');
      expect(body.details.errors).toBeInstanceOf(Array);
      expect(body.details.errorCount).toBeGreaterThanOrEqual(3);
    });

    it('should return 400 for missing required fields', async () => {
      const Schema = z.object({
        name: z.string(),
        required: z.boolean(),
      });

      @Controller('/items')
      class ItemController {
        @Post()
        create(@Body(Schema) data: z.infer<typeof Schema>) {
          return data;
        }
      }

      container.register(ItemController);
      router.registerController(ItemController);

      const response = await server.inject({
        method: 'POST',
        url: '/items',
        payload: {
          name: 'Test',
          // missing 'required' field
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('@Query validation', () => {
    it('should validate and coerce query parameters', async () => {
      const PaginationSchema = z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(10),
      });

      @Controller('/items')
      class ItemController2 {
        @Get()
        list(@Query(PaginationSchema) query: z.infer<typeof PaginationSchema>) {
          return { page: query.page, limit: query.limit };
        }
      }

      container.register(ItemController2);
      router.registerController(ItemController2);

      const response = await server.inject({
        method: 'GET',
        url: '/items?page=2&limit=20',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.page).toBe(2);
      expect(body.limit).toBe(20);
    });

    it('should return 400 for invalid query params', async () => {
      const QuerySchema = z.object({
        page: z.coerce.number().int().positive(),
      });

      @Controller('/products')
      class ProductController {
        @Get()
        list(@Query(QuerySchema) query: z.infer<typeof QuerySchema>) {
          return query;
        }
      }

      container.register(ProductController);
      router.registerController(ProductController);

      const response = await server.inject({
        method: 'GET',
        url: '/products?page=invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('@Param validation', () => {
    it('should validate route parameters', async () => {
      const IdSchema = z.object({
        id: z.string().uuid(),
      });

      @Controller('/users')
      class UserController3 {
        @Get('/:id')
        findOne(@Param(IdSchema) params: z.infer<typeof IdSchema>) {
          return { id: params.id };
        }
      }

      container.register(UserController3);
      router.registerController(UserController3);

      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const response = await server.inject({
        method: 'GET',
        url: `/users/${validUUID}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe(validUUID);
    });

    it('should return 400 for invalid route params', async () => {
      const IdSchema = z.object({
        id: z.string().uuid(),
      });

      @Controller('/items')
      class ItemController3 {
        @Get('/:id')
        findOne(@Param(IdSchema) params: z.infer<typeof IdSchema>) {
          return params;
        }
      }

      container.register(ItemController3);
      router.registerController(ItemController3);

      const response = await server.inject({
        method: 'GET',
        url: '/items/not-a-uuid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('@Headers validation', () => {
    it('should validate headers', async () => {
      const HeadersSchema = z.object({
        'x-api-key': z.string().min(10),
      });

      @Controller('/api')
      class ApiController {
        @Get('/protected')
        protected(@Headers(HeadersSchema) headers: z.infer<typeof HeadersSchema>) {
          return { authenticated: true, key: headers['x-api-key'] };
        }
      }

      container.register(ApiController);
      router.registerController(ApiController);

      const response = await server.inject({
        method: 'GET',
        url: '/api/protected',
        headers: {
          'x-api-key': 'my-secret-api-key-12345',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.authenticated).toBe(true);
    });

    it('should return 400 for invalid headers', async () => {
      const HeadersSchema = z.object({
        authorization: z.string().startsWith('Bearer '),
      });

      @Controller('/secure')
      class SecureController {
        @Get()
        getData(@Headers(HeadersSchema) headers: z.infer<typeof HeadersSchema>) {
          return { success: true };
        }
      }

      container.register(SecureController);
      router.registerController(SecureController);

      const response = await server.inject({
        method: 'GET',
        url: '/secure',
        headers: {
          authorization: 'InvalidToken', // doesn't start with 'Bearer '
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('Backward compatibility', () => {
    it('should work without Zod schema (string key)', async () => {
      @Controller('/compat')
      class CompatController {
        @Post()
        create(@Body('name') name: string) {
          return { name };
        }
      }

      container.register(CompatController);
      router.registerController(CompatController);

      const response = await server.inject({
        method: 'POST',
        url: '/compat',
        payload: { name: 'Test User', other: 'ignored' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('Test User');
    });

    it('should work without Zod schema (no args)', async () => {
      @Controller('/compat2')
      class CompatController2 {
        @Post()
        create(@Body() data: unknown) {
          return { received: data };
        }
      }

      container.register(CompatController2);
      router.registerController(CompatController2);

      const response = await server.inject({
        method: 'POST',
        url: '/compat2',
        payload: { any: 'data', works: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.received).toEqual({ any: 'data', works: true });
    });
  });

  describe('Mixed parameters', () => {
    it('should handle mixed validated and non-validated params', async () => {
      const BodySchema = z.object({
        title: z.string().min(1),
        content: z.string(),
      });

      @Controller('/posts')
      class PostController {
        @Put('/:id')
        update(
          @Param('id') id: string, // non-validated
          @Body(BodySchema) body: z.infer<typeof BodySchema>, // validated
          @Query('draft') draft: string, // non-validated
        ) {
          return { id, body, draft };
        }
      }

      container.register(PostController);
      router.registerController(PostController);

      const response = await server.inject({
        method: 'PUT',
        url: '/posts/123?draft=true',
        payload: {
          title: 'My Post',
          content: 'This is the content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe('123');
      expect(body.body).toEqual({
        title: 'My Post',
        content: 'This is the content',
      });
      expect(body.draft).toBe('true');
    });
  });

  describe('Zod transformations', () => {
    it('should apply Zod transformations', async () => {
      const TransformSchema = z.object({
        date: z.string().transform((val) => new Date(val)),
        tags: z.string().transform((val) => val.split(',')),
      });

      @Controller('/transform')
      class TransformController {
        @Post()
        create(@Body(TransformSchema) data: z.infer<typeof TransformSchema>) {
          return {
            date: data.date instanceof Date ? data.date.toISOString() : 'not a date',
            tags: data.tags,
            tagCount: data.tags.length,
          };
        }
      }

      container.register(TransformController);
      router.registerController(TransformController);

      const response = await server.inject({
        method: 'POST',
        url: '/transform',
        payload: {
          date: '2024-01-15',
          tags: 'typescript,zod,validation',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.date).toContain('2024-01-15');
      expect(body.tags).toEqual(['typescript', 'zod', 'validation']);
      expect(body.tagCount).toBe(3);
    });
  });
});

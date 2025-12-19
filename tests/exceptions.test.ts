import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '../src/core/container';
import { Registry } from '../src/core/registry';
import { Rikta } from '../src/core/application';
import { Controller } from '../src/core/decorators/controller.decorator';
import { Get, Post } from '../src/core/decorators/route.decorator';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { Body } from '../src/core/decorators/param.decorator';
import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  TooManyRequestsException,
  InternalServerErrorException,
  ServiceUnavailableException,
  ExceptionFilter,
  ExceptionContext,
  GlobalExceptionFilter,
  Catch,
  getCatchMetadata,
} from '../src/core/exceptions';

describe('Exceptions', () => {
  beforeEach(() => {
    Container.reset();
    Registry.reset();
  });

  describe('HttpException', () => {
    it('should create exception with message', () => {
      const exception = new HttpException('Test error', 500);
      
      expect(exception.message).toBe('Test error');
      expect(exception.statusCode).toBe(500);
      expect(exception.getStatus()).toBe(500);
      expect(exception.name).toBe('HttpException');
    });

    it('should create exception with object response', () => {
      const exception = new HttpException({
        message: 'Validation failed',
        error: 'Validation Error',
        details: { field: 'email', reason: 'Invalid format' },
        code: 'VALIDATION_001',
      }, 400);

      const response = exception.getResponse();
      
      expect(response.statusCode).toBe(400);
      expect(response.message).toBe('Validation failed');
      expect(response.error).toBe('Validation Error');
      expect(response.details).toEqual({ field: 'email', reason: 'Invalid format' });
      expect(response.code).toBe('VALIDATION_001');
      expect(response.timestamp).toBeDefined();
    });

    it('should use default error name for known status codes', () => {
      const notFound = new HttpException('Not found', 404);
      expect(notFound.getResponse().error).toBe('Not Found');

      const badRequest = new HttpException('Bad request', 400);
      expect(badRequest.getResponse().error).toBe('Bad Request');

      const serverError = new HttpException('Server error', 500);
      expect(serverError.getResponse().error).toBe('Internal Server Error');
    });

    it('should have timestamp in ISO format', () => {
      const exception = new HttpException('Test', 500);
      const response = exception.getResponse();
      
      // Should be a valid ISO date string
      expect(() => new Date(response.timestamp)).not.toThrow();
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should capture stack trace', () => {
      const exception = new HttpException('Test', 500);
      expect(exception.stack).toBeDefined();
      expect(exception.stack).toContain('HttpException');
    });
  });

  describe('Specific Exceptions', () => {
    describe('4xx Client Errors', () => {
      it('BadRequestException should have status 400', () => {
        const ex = new BadRequestException('Invalid input');
        expect(ex.getStatus()).toBe(400);
        expect(ex.getResponse().error).toBe('Bad Request');
      });

      it('UnauthorizedException should have status 401', () => {
        const ex = new UnauthorizedException('Invalid token');
        expect(ex.getStatus()).toBe(401);
        expect(ex.getResponse().error).toBe('Unauthorized');
      });

      it('ForbiddenException should have status 403', () => {
        const ex = new ForbiddenException('Access denied');
        expect(ex.getStatus()).toBe(403);
        expect(ex.getResponse().error).toBe('Forbidden');
      });

      it('NotFoundException should have status 404', () => {
        const ex = new NotFoundException('User not found');
        expect(ex.getStatus()).toBe(404);
        expect(ex.getResponse().error).toBe('Not Found');
      });

      it('ConflictException should have status 409', () => {
        const ex = new ConflictException('Email already exists');
        expect(ex.getStatus()).toBe(409);
        expect(ex.getResponse().error).toBe('Conflict');
      });

      it('UnprocessableEntityException should have status 422', () => {
        const ex = new UnprocessableEntityException({
          message: 'Validation failed',
          details: { email: 'Invalid format' },
        });
        expect(ex.getStatus()).toBe(422);
        expect(ex.getResponse().error).toBe('Unprocessable Entity');
        expect(ex.getResponse().details).toEqual({ email: 'Invalid format' });
      });

      it('TooManyRequestsException should have status 429', () => {
        const ex = new TooManyRequestsException('Rate limit exceeded');
        expect(ex.getStatus()).toBe(429);
        expect(ex.getResponse().error).toBe('Too Many Requests');
      });
    });

    describe('5xx Server Errors', () => {
      it('InternalServerErrorException should have status 500', () => {
        const ex = new InternalServerErrorException('Database error');
        expect(ex.getStatus()).toBe(500);
        expect(ex.getResponse().error).toBe('Internal Server Error');
      });

      it('ServiceUnavailableException should have status 503', () => {
        const ex = new ServiceUnavailableException('Under maintenance');
        expect(ex.getStatus()).toBe(503);
        expect(ex.getResponse().error).toBe('Service Unavailable');
      });
    });

    describe('Default Messages', () => {
      it('should use default message when none provided', () => {
        expect(new BadRequestException().message).toBe('Bad Request');
        expect(new UnauthorizedException().message).toBe('Unauthorized');
        expect(new ForbiddenException().message).toBe('Forbidden');
        expect(new NotFoundException().message).toBe('Not Found');
        expect(new InternalServerErrorException().message).toBe('Internal Server Error');
      });
    });
  });

  describe('@Catch() Decorator', () => {
    it('should store exception types in metadata', () => {
      @Catch(NotFoundException)
      class NotFoundFilter implements ExceptionFilter {
        catch() {}
      }

      const metadata = getCatchMetadata(NotFoundFilter);
      expect(metadata).toBeDefined();
      expect(metadata!.exceptions).toHaveLength(1);
      expect(metadata!.exceptions[0]).toBe(NotFoundException);
    });

    it('should store multiple exception types', () => {
      @Catch(BadRequestException, UnprocessableEntityException)
      class ValidationFilter implements ExceptionFilter {
        catch() {}
      }

      const metadata = getCatchMetadata(ValidationFilter);
      expect(metadata!.exceptions).toHaveLength(2);
      expect(metadata!.exceptions).toContain(BadRequestException);
      expect(metadata!.exceptions).toContain(UnprocessableEntityException);
    });

    it('should handle catch-all (no arguments)', () => {
      @Catch()
      class AllExceptionsFilter implements ExceptionFilter {
        catch() {}
      }

      const metadata = getCatchMetadata(AllExceptionsFilter);
      expect(metadata!.exceptions).toHaveLength(0);
    });
  });

  describe('GlobalExceptionFilter', () => {
    it('should build response for HttpException', () => {
      const filter = new GlobalExceptionFilter({ logErrors: false });
      const exception = new NotFoundException('User not found');
      
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const context: ExceptionContext = {
        exception,
        request: { url: '/users/123', method: 'GET', id: 'req-1' } as any,
        reply: mockReply as any,
        path: '/users/123',
        method: 'GET',
        requestId: 'req-1',
      };

      filter.catch(exception, context);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found',
          error: 'Not Found',
          path: '/users/123',
          requestId: 'req-1',
        })
      );
    });

    it('should handle unknown errors as 500', () => {
      const filter = new GlobalExceptionFilter({ 
        logErrors: false, 
        includeStack: false 
      });
      const exception = new Error('Something went wrong');
      
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const context: ExceptionContext = {
        exception,
        request: { url: '/test', method: 'POST', id: 'req-2' } as any,
        reply: mockReply as any,
        path: '/test',
        method: 'POST',
        requestId: 'req-2',
      };

      filter.catch(exception, context);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Internal Server Error',
        })
      );
    });

    it('should include stack trace when enabled', () => {
      const filter = new GlobalExceptionFilter({ 
        logErrors: false, 
        includeStack: true 
      });
      const exception = new InternalServerErrorException('DB Error');
      
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const context: ExceptionContext = {
        exception,
        request: { url: '/test', method: 'GET' } as any,
        reply: mockReply as any,
        path: '/test',
        method: 'GET',
      };

      filter.catch(exception, context);

      const sentResponse = mockReply.send.mock.calls[0][0];
      expect(sentResponse.stack).toBeDefined();
    });

    it('should not include stack trace when disabled', () => {
      const filter = new GlobalExceptionFilter({ 
        logErrors: false, 
        includeStack: false 
      });
      const exception = new InternalServerErrorException('DB Error');
      
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const context: ExceptionContext = {
        exception,
        request: { url: '/test', method: 'GET' } as any,
        reply: mockReply as any,
        path: '/test',
        method: 'GET',
      };

      filter.catch(exception, context);

      const sentResponse = mockReply.send.mock.calls[0][0];
      expect(sentResponse.stack).toBeUndefined();
    });
  });

  describe('Application Integration', () => {
    it('should return JSON error for HttpException', async () => {
      @Controller('/users')
      class UserController {
        @Get('/:id')
        getUser() {
          throw new NotFoundException('User not found');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [UserController],
        exceptionFilter: { includeStack: false, logErrors: false },
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/users/123',
      });

      expect(response.statusCode).toBe(404);
      
      const body = response.json();
      expect(body.statusCode).toBe(404);
      expect(body.message).toBe('User not found');
      expect(body.error).toBe('Not Found');
      expect(body.path).toBe('/users/123');
      expect(body.timestamp).toBeDefined();

      await app.close();
    });

    it('should return 400 for BadRequestException', async () => {
      @Controller('/validate')
      class ValidateController {
        @Post()
        validate(@Body() body: any) {
          if (!body?.email) {
            throw new BadRequestException({
              message: 'Validation failed',
              details: { email: 'Email is required' },
            });
          }
          return { ok: true };
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [ValidateController],
        exceptionFilter: { includeStack: false, logErrors: false },
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'POST',
        url: '/validate',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      
      const body = response.json();
      expect(body.message).toBe('Validation failed');
      expect(body.details).toEqual({ email: 'Email is required' });

      await app.close();
    });

    it('should return 401 for UnauthorizedException', async () => {
      @Controller('/protected')
      class ProtectedController {
        @Get()
        protected() {
          throw new UnauthorizedException('Invalid token');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [ProtectedController],
        exceptionFilter: { includeStack: false, logErrors: false },
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Invalid token');

      await app.close();
    });

    it('should handle unknown errors as 500', async () => {
      @Controller('/crash')
      class CrashController {
        @Get()
        crash() {
          throw new Error('Unexpected error');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [CrashController],
        exceptionFilter: { includeStack: false, logErrors: false },
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/crash',
      });

      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe('Internal Server Error');

      await app.close();
    });

    it('should use custom exception filter', async () => {
      // Custom exception for testing
      class CustomException extends HttpException {
        constructor(public readonly customData: string) {
          super({ message: 'Custom error', error: 'Custom' }, 418);
        }
      }

      @Injectable()
      @Catch(CustomException)
      class CustomExceptionFilter implements ExceptionFilter {
        catch(exception: CustomException, context: ExceptionContext) {
          context.reply.status(418).send({
            type: 'CUSTOM_ERROR',
            data: exception.customData,
            path: context.path,
          });
        }
      }

      @Controller('/custom')
      class CustomController {
        @Get()
        test() {
          throw new CustomException('test-data');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [CustomController],
        exceptionFilters: [CustomExceptionFilter],
        exceptionFilter: { logErrors: false },
      });
      await app.listen();

      const response = await app.server.inject({
        method: 'GET',
        url: '/custom',
      });

      expect(response.statusCode).toBe(418);
      
      const body = response.json();
      expect(body.type).toBe('CUSTOM_ERROR');
      expect(body.data).toBe('test-data');
      expect(body.path).toBe('/custom');

      await app.close();
    });

    it('should fall back to global filter for unhandled exceptions', async () => {
      @Injectable()
      @Catch(NotFoundException)
      class NotFoundOnlyFilter implements ExceptionFilter {
        catch(exception: NotFoundException, context: ExceptionContext) {
          context.reply.status(404).send({
            type: 'NOT_FOUND_CUSTOM',
            message: exception.message,
          });
        }
      }

      @Controller('/fallback')
      class FallbackController {
        @Get('/notfound')
        notFound() {
          throw new NotFoundException('Resource not found');
        }

        @Get('/badrequest')
        badRequest() {
          throw new BadRequestException('Bad data');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [FallbackController],
        exceptionFilters: [NotFoundOnlyFilter],
        exceptionFilter: { includeStack: false, logErrors: false },
      });
      await app.listen();

      // Should use custom filter for NotFoundException
      const notFoundResponse = await app.server.inject({
        method: 'GET',
        url: '/fallback/notfound',
      });
      expect(notFoundResponse.statusCode).toBe(404);
      expect(notFoundResponse.json().type).toBe('NOT_FOUND_CUSTOM');

      // Should fall back to global filter for BadRequestException
      const badRequestResponse = await app.server.inject({
        method: 'GET',
        url: '/fallback/badrequest',
      });
      expect(badRequestResponse.statusCode).toBe(400);
      expect(badRequestResponse.json().error).toBe('Bad Request');
      expect(badRequestResponse.json().type).toBeUndefined();

      await app.close();
    });
  });
});

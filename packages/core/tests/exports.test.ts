import { describe, it, expect } from 'vitest';

import {
  z,
  
  Controller,
  Injectable,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Headers,
  Autowired,
  HttpCode,
  
  HttpException,
  ValidationException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  
  Rikta,
  RiktaFactory,
  
  Container,
  InjectionToken,
  
  type ParamMetadata,
  type ValidationErrorDetails,
} from '../src';

describe('Package Exports', () => {
  describe('Zod exports', () => {
    it('should export z from zod', () => {
      expect(z).toBeDefined();
      expect(typeof z.object).toBe('function');
      expect(typeof z.string).toBe('function');
      expect(typeof z.number).toBe('function');
    });

    it('should be able to create schemas with exported z', () => {
      const UserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const result = UserSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Decorator exports', () => {
    it('should export all route decorators', () => {
      expect(Controller).toBeDefined();
      expect(Get).toBeDefined();
      expect(Post).toBeDefined();
      expect(Put).toBeDefined();
      expect(Patch).toBeDefined();
      expect(Delete).toBeDefined();
    });

    it('should export all param decorators', () => {
      expect(Body).toBeDefined();
      expect(Query).toBeDefined();
      expect(Param).toBeDefined();
      expect(Headers).toBeDefined();
    });

    it('should export DI decorators', () => {
      expect(Injectable).toBeDefined();
      expect(Autowired).toBeDefined();
    });

    it('should export utility decorators', () => {
      expect(HttpCode).toBeDefined();
    });
  });

  describe('Exception exports', () => {
    it('should export base HttpException', () => {
      expect(HttpException).toBeDefined();
      const exception = new HttpException('Test', 400);
      expect(exception.statusCode).toBe(400);
    });

    it('should export ValidationException', () => {
      expect(ValidationException).toBeDefined();
    });

    it('should export specific exceptions', () => {
      expect(BadRequestException).toBeDefined();
      expect(NotFoundException).toBeDefined();
      expect(UnauthorizedException).toBeDefined();
    });
  });

  describe('Application exports', () => {
    it('should export Rikta and RiktaFactory', () => {
      expect(Rikta).toBeDefined();
      expect(RiktaFactory).toBeDefined();
      expect(Rikta).toBe(RiktaFactory);
    });
  });

  describe('Container exports', () => {
    it('should export Container', () => {
      expect(Container).toBeDefined();
    });

    it('should export InjectionToken', () => {
      expect(InjectionToken).toBeDefined();
    });
  });

  describe('Type exports', () => {
    it('should be able to use ParamMetadata type', () => {
      const metadata: ParamMetadata = {
        index: 0,
        type: 'body' as any,
      };
      expect(metadata.index).toBe(0);
    });

    it('should be able to use ValidationErrorDetails type', () => {
      const error: ValidationErrorDetails = {
        path: ['name'],
        message: 'Required',
        code: 'invalid_type',
      };
      expect(error.path).toEqual(['name']);
    });
  });

  describe('Integration: Zod with decorators', () => {
    it('should work together for type-safe validation', () => {
      const CreateUserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      type CreateUser = z.infer<typeof CreateUserSchema>;

      const validData: CreateUser = { name: 'John', email: 'john@example.com' };
      const result = CreateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

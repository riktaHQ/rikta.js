/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createJobSchema,
  JobSchema,
  JobSchemaValidationError,
  CommonJobSchemas,
} from '../src/utils/validation.js';

describe('Validation Utilities', () => {
  describe('createJobSchema', () => {
    it('should create a JobSchema wrapper', () => {
      const schema = createJobSchema(z.object({ name: z.string() }));
      expect(schema).toBeInstanceOf(JobSchema);
    });
  });

  describe('JobSchema', () => {
    const testSchema = createJobSchema(z.object({
      email: z.string().email(),
      age: z.number().min(0).max(150),
    }));

    describe('validate', () => {
      it('should return valid data', () => {
        const data = { email: 'test@example.com', age: 25 };
        const result = testSchema.validate(data);
        expect(result).toEqual(data);
      });

      it('should throw JobSchemaValidationError for invalid data', () => {
        expect(() => {
          testSchema.validate({ email: 'invalid', age: -5 });
        }).toThrow(JobSchemaValidationError);
      });
    });

    describe('validateSafe', () => {
      it('should return data for valid input', () => {
        const data = { email: 'test@example.com', age: 25 };
        const result = testSchema.validateSafe(data);
        expect(result).toEqual(data);
      });

      it('should return undefined for invalid input', () => {
        const result = testSchema.validateSafe({ email: 'invalid' });
        expect(result).toBeUndefined();
      });
    });

    describe('isValid', () => {
      it('should return true for valid data', () => {
        expect(testSchema.isValid({ email: 'test@example.com', age: 25 })).toBe(true);
      });

      it('should return false for invalid data', () => {
        expect(testSchema.isValid({ email: 'invalid' })).toBe(false);
      });
    });

    describe('getErrors', () => {
      it('should return empty array for valid data', () => {
        const errors = testSchema.getErrors({ email: 'test@example.com', age: 25 });
        expect(errors).toEqual([]);
      });

      it('should return error messages for invalid data', () => {
        const errors = testSchema.getErrors({ email: 'invalid', age: -5 });
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.includes('email'))).toBe(true);
      });
    });

    describe('getSchema', () => {
      it('should return the underlying Zod schema', () => {
        const zodSchema = z.object({ name: z.string() });
        const jobSchema = createJobSchema(zodSchema);
        expect(jobSchema.getSchema()).toBe(zodSchema);
      });
    });
  });

  describe('JobSchemaValidationError', () => {
    it('should include error details in message', () => {
      const result = z.object({ email: z.string().email() }).safeParse({ email: 'bad' });
      
      if (!result.success) {
        const error = new JobSchemaValidationError('Validation failed', result.error);
        expect(error.message).toContain('email');
        expect(error.name).toBe('JobSchemaValidationError');
      }
    });

    it('should provide getErrors method', () => {
      const result = z.object({ 
        email: z.string().email(),
        age: z.number().min(0),
      }).safeParse({ email: 'bad', age: -1 });
      
      if (!result.success) {
        const error = new JobSchemaValidationError('Validation failed', result.error);
        const errors = error.getErrors();
        
        expect(errors.length).toBe(2);
        expect(errors[0]).toHaveProperty('path');
        expect(errors[0]).toHaveProperty('message');
      }
    });
  });

  describe('CommonJobSchemas', () => {
    describe('email', () => {
      it('should validate a valid email job', () => {
        const result = CommonJobSchemas.email.safeParse({
          to: 'test@example.com',
          subject: 'Hello',
          body: 'World',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const result = CommonJobSchemas.email.safeParse({
          to: 'invalid-email',
          subject: 'Hello',
          body: 'World',
        });
        expect(result.success).toBe(false);
      });

      it('should accept optional fields', () => {
        const result = CommonJobSchemas.email.safeParse({
          to: 'test@example.com',
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
          subject: 'Hello',
          body: 'World',
          html: true,
          attachments: [{ filename: 'file.txt', content: 'data' }],
        });
        expect(result.success).toBe(true);
      });
    });

    describe('notification', () => {
      it('should validate a valid notification job', () => {
        const result = CommonJobSchemas.notification.safeParse({
          userId: 'user-123',
          title: 'New Message',
          message: 'You have a new message',
        });
        expect(result.success).toBe(true);
      });

      it('should apply default type', () => {
        const result = CommonJobSchemas.notification.parse({
          userId: 'user-123',
          title: 'New Message',
          message: 'You have a new message',
        });
        expect(result.type).toBe('info');
      });
    });

    describe('fileProcessing', () => {
      it('should validate a valid file processing job', () => {
        const result = CommonJobSchemas.fileProcessing.safeParse({
          fileId: 'file-123',
          filePath: '/uploads/image.jpg',
          operation: 'resize',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid operation', () => {
        const result = CommonJobSchemas.fileProcessing.safeParse({
          fileId: 'file-123',
          filePath: '/uploads/image.jpg',
          operation: 'invalid',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('webhook', () => {
      it('should validate a valid webhook job', () => {
        const result = CommonJobSchemas.webhook.safeParse({
          url: 'https://api.example.com/webhook',
          method: 'POST',
          body: { data: 'test' },
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid URL', () => {
        const result = CommonJobSchemas.webhook.safeParse({
          url: 'not-a-url',
        });
        expect(result.success).toBe(false);
      });

      it('should apply defaults', () => {
        const result = CommonJobSchemas.webhook.parse({
          url: 'https://api.example.com/webhook',
        });
        expect(result.method).toBe('POST');
        expect(result.timeout).toBe(30000);
      });
    });
  });
});

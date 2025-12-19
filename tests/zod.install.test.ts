import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Zod Installation', () => {
  it('should have zod installed and working', () => {
    expect(typeof z.object).toBe('function');
    expect(typeof z.string).toBe('function');
    expect(typeof z.number).toBe('function');
  });

  it('should create and validate a simple schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().int().positive(),
    });

    const validData = { name: 'John', age: 30 };
    const result = schema.safeParse(validData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should return errors for invalid data', () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const invalidData = { email: 'not-an-email' };
    const result = schema.safeParse(invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].code).toBe('invalid_string');
    }
  });

  it('should support type inference with z.infer', () => {
    const UserSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
    });

    type User = z.infer<typeof UserSchema>;

    // This is a compile-time check - if it compiles, the type inference works
    const user: User = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const result = UserSchema.safeParse(user);
    expect(result.success).toBe(true);
  });
});

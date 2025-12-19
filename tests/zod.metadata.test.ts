import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { z } from 'zod';
import { PARAM_METADATA, ParamType } from '../src/core/constants';
import type { ParamMetadata } from '../src/core/decorators/param.decorator';

describe('Zod Metadata', () => {
  it('should store ParamMetadata without zodSchema', () => {
    class TestClass {}
    
    const metadata: ParamMetadata = {
      index: 0,
      type: ParamType.BODY,
      key: 'name',
    };
    
    Reflect.defineMetadata(PARAM_METADATA, [metadata], TestClass, 'testMethod');
    
    const retrieved = Reflect.getMetadata(PARAM_METADATA, TestClass, 'testMethod') as ParamMetadata[];
    
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].index).toBe(0);
    expect(retrieved[0].type).toBe(ParamType.BODY);
    expect(retrieved[0].key).toBe('name');
    expect(retrieved[0].zodSchema).toBeUndefined();
  });

  it('should store ParamMetadata with zodSchema', () => {
    class TestClass {}
    
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });
    
    const metadata: ParamMetadata = {
      index: 0,
      type: ParamType.BODY,
      zodSchema: schema,
    };
    
    Reflect.defineMetadata(PARAM_METADATA, [metadata], TestClass, 'createUser');
    
    const retrieved = Reflect.getMetadata(PARAM_METADATA, TestClass, 'createUser') as ParamMetadata[];
    
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].index).toBe(0);
    expect(retrieved[0].type).toBe(ParamType.BODY);
    expect(retrieved[0].zodSchema).toBeDefined();
    expect(retrieved[0].zodSchema).toBe(schema);
  });

  it('should be able to validate data using stored zodSchema', () => {
    class TestClass {}
    
    const schema = z.object({
      id: z.string().uuid(),
      count: z.number().int().positive(),
    });
    
    const metadata: ParamMetadata = {
      index: 0,
      type: ParamType.BODY,
      zodSchema: schema,
    };
    
    Reflect.defineMetadata(PARAM_METADATA, [metadata], TestClass, 'process');
    
    const retrieved = Reflect.getMetadata(PARAM_METADATA, TestClass, 'process') as ParamMetadata[];
    const storedSchema = retrieved[0].zodSchema;
    
    // Valid data
    const validResult = storedSchema?.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      count: 42,
    });
    expect(validResult?.success).toBe(true);
    
    // Invalid data
    const invalidResult = storedSchema?.safeParse({
      id: 'not-a-uuid',
      count: -5,
    });
    expect(invalidResult?.success).toBe(false);
  });

  it('should store multiple ParamMetadata with mixed zodSchema presence', () => {
    class TestClass {}
    
    const bodySchema = z.object({ name: z.string() });
    
    const metadata: ParamMetadata[] = [
      { index: 0, type: ParamType.BODY, zodSchema: bodySchema },
      { index: 1, type: ParamType.PARAM, key: 'id' },
      { index: 2, type: ParamType.QUERY, key: 'page' },
    ];
    
    Reflect.defineMetadata(PARAM_METADATA, metadata, TestClass, 'mixedMethod');
    
    const retrieved = Reflect.getMetadata(PARAM_METADATA, TestClass, 'mixedMethod') as ParamMetadata[];
    
    expect(retrieved).toHaveLength(3);
    expect(retrieved[0].zodSchema).toBe(bodySchema);
    expect(retrieved[1].zodSchema).toBeUndefined();
    expect(retrieved[2].zodSchema).toBeUndefined();
  });
});

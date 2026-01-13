/**
 * Zod validation utilities for job payloads
 */

import { z, type ZodSchema, type ZodError } from 'zod';

/**
 * Creates a wrapper around a Zod schema for job validation
 * 
 * @param schema - The Zod schema to use for validation
 * @returns A wrapped schema with job-specific utilities
 * 
 * @example
 * ```typescript
 * const EmailJobSchema = createJobSchema(z.object({
 *   to: z.string().email(),
 *   subject: z.string().min(1),
 *   body: z.string(),
 * }));
 * 
 * // Validate job data
 * const result = EmailJobSchema.validate({ to: 'test@example.com', subject: 'Hello', body: 'World' });
 * ```
 */
export function createJobSchema<T>(schema: ZodSchema<T>): JobSchema<T> {
  return new JobSchema(schema);
}

/**
 * Wrapper class for Zod schemas with job-specific utilities
 */
export class JobSchema<T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  /**
   * Get the underlying Zod schema
   */
  getSchema(): ZodSchema<T> {
    return this.schema;
  }

  /**
   * Validate job data
   * @throws JobValidationError if validation fails
   */
  validate(data: unknown): T {
    const result = this.schema.safeParse(data);
    
    if (!result.success) {
      throw new JobSchemaValidationError(
        'Job data validation failed',
        result.error
      );
    }
    
    return result.data;
  }

  /**
   * Validate job data, returning undefined on failure
   */
  validateSafe(data: unknown): T | undefined {
    const result = this.schema.safeParse(data);
    return result.success ? result.data : undefined;
  }

  /**
   * Check if data is valid without throwing
   */
  isValid(data: unknown): data is T {
    return this.schema.safeParse(data).success;
  }

  /**
   * Get validation errors for data
   */
  getErrors(data: unknown): string[] {
    const result = this.schema.safeParse(data);
    
    if (result.success) {
      return [];
    }
    
    return result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  }

  /**
   * Parse and transform data with defaults
   */
  parse(data: unknown): T {
    return this.schema.parse(data);
  }
}

/**
 * Error thrown when job schema validation fails
 */
export class JobSchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly zodError: ZodError
  ) {
    const details = zodError.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    
    super(`${message}: ${details}`);
    this.name = 'JobSchemaValidationError';
  }

  /**
   * Get formatted validation errors
   */
  getErrors(): Array<{ path: string; message: string }> {
    return this.zodError.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }
}

// Re-export z for convenience
export { z };

/**
 * Common job schemas for typical use cases
 */
export const CommonJobSchemas = {
  /**
   * Email job schema
   */
  email: z.object({
    to: z.string().email(),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    subject: z.string().min(1).max(998),
    body: z.string(),
    html: z.boolean().optional().default(false),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.string(),
      contentType: z.string().optional(),
    })).optional(),
  }),

  /**
   * Notification job schema
   */
  notification: z.object({
    userId: z.string(),
    title: z.string().max(100),
    message: z.string().max(1000),
    type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
    metadata: z.record(z.unknown()).optional(),
  }),

  /**
   * File processing job schema
   */
  fileProcessing: z.object({
    fileId: z.string(),
    filePath: z.string(),
    operation: z.enum(['resize', 'compress', 'convert', 'thumbnail']),
    options: z.record(z.unknown()).optional(),
  }),

  /**
   * Webhook job schema
   */
  webhook: z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    headers: z.record(z.string()).optional(),
    body: z.unknown().optional(),
    timeout: z.number().positive().optional().default(30000),
  }),
};

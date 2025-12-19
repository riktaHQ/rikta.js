import type { ZodError, ZodIssue } from 'zod';
import { HttpException } from './http-exception';

/**
 * Structured validation error details
 */
export interface ValidationErrorDetails {
  /** The field path where the error occurred */
  path: (string | number)[];
  /** Human-readable error message */
  message: string;
  /** Zod error code */
  code: string;
  /** Expected type/value (if applicable) */
  expected?: string;
  /** Received type/value (if applicable) */
  received?: string;
}

/**
 * Validation Exception
 * 
 * Thrown when request validation fails using Zod schemas.
 * Provides detailed error information for each validation issue.
 * 
 * @example
 * ```typescript
 * // The framework throws this automatically when @Body(schema) validation fails
 * // But you can also throw it manually:
 * 
 * const result = MySchema.safeParse(data);
 * if (!result.success) {
 *   throw new ValidationException(result.error);
 * }
 * ```
 */
export class ValidationException extends HttpException {
  /**
   * The original Zod error object
   */
  readonly zodError: ZodError;

  /**
   * Structured validation error details
   */
  readonly errors: ValidationErrorDetails[];

  constructor(zodError: ZodError, message: string = 'Validation failed') {
    // Transform Zod issues to structured format
    const errors = zodError.issues.map((issue: ZodIssue): ValidationErrorDetails => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
      ...(('expected' in issue) ? { expected: String(issue.expected) } : {}),
      ...(('received' in issue) ? { received: String(issue.received) } : {}),
    }));

    super(
      {
        message,
        error: 'Validation Error',
        details: {
          errors,
          errorCount: errors.length,
        },
      },
      400
    );

    this.zodError = zodError;
    this.errors = errors;
  }

  /**
   * Get formatted errors for client response
   */
  getValidationErrors(): ValidationErrorDetails[] {
    return this.errors;
  }

  /**
   * Get the flattened Zod error format
   */
  getFlattenedErrors() {
    return this.zodError.flatten();
  }

  /**
   * Get the formatted Zod error
   */
  getFormattedErrors() {
    return this.zodError.format();
  }
}

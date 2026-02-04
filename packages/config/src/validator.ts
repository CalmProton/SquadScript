/**
 * @squadscript/config
 *
 * Schema validation utilities.
 *
 * @module
 */

import { z } from 'zod';
import { type Result, Ok, Err } from '@squadscript/types';
import { ConfigError, type ValidationErrorDetail } from './errors.js';

/**
 * Result of a validation operation.
 */
export type ValidationResult<T> = Result<T, ConfigError>;

/**
 * Convert Zod errors to our ValidationErrorDetail format.
 */
function zodErrorToDetails(error: z.ZodError): ValidationErrorDetail[] {
  return error.errors.map((issue) => {
    const detail: ValidationErrorDetail = {
      path: issue.path.join('.') || 'root',
      message: issue.message,
    };
    if ('expected' in issue && issue.expected !== undefined) {
      detail.expected = String(issue.expected);
    }
    if ('received' in issue && issue.received !== undefined) {
      detail.received = issue.received;
    }
    return detail;
  });
}

/**
 * Validate data against a Zod schema.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns A Result containing the validated data or a ConfigError
 *
 * @example
 * ```typescript
 * import { validate } from '@squadscript/config';
 * import { ServerConfigSchema } from '@squadscript/config/schemas';
 *
 * const result = validate(ServerConfigSchema, rawConfig);
 * if (result.ok) {
 *   console.log('Valid config:', result.value);
 * } else {
 *   console.error(result.error.formatDetails());
 * }
 * ```
 */
export function validate<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): ValidationResult<z.output<TSchema>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return Ok(result.data as z.output<TSchema>);
  }

  const details = zodErrorToDetails(result.error);
  return Err(ConfigError.validationError(details));
}

/**
 * Validate data and throw on error.
 *
 * Use this when you want exceptions rather than Result types.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated data
 * @throws ConfigError if validation fails
 */
export function validateOrThrow<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): z.output<TSchema> {
  const result = validate(schema, data);

  if (result.ok) {
    return result.value;
  }

  throw result.error;
}

/**
 * Create a validator function for a specific schema.
 *
 * @param schema - The Zod schema
 * @returns A validation function
 */
export function createValidator<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): (data: unknown) => ValidationResult<z.output<TSchema>> {
  return (data: unknown) => validate(schema, data);
}

/**
 * Merge multiple validation results.
 *
 * @param results - Array of validation results
 * @returns A combined result with all values or all errors
 */
export function mergeValidationResults<T extends readonly ValidationResult<unknown>[]>(
  results: T,
): ValidationResult<{ [K in keyof T]: T[K] extends ValidationResult<infer U> ? U : never }> {
  const values: unknown[] = [];
  const allDetails: ValidationErrorDetail[] = [];

  for (const result of results) {
    if (result.ok) {
      values.push(result.value);
    } else {
      if (result.error.details) {
        allDetails.push(...result.error.details);
      } else {
        allDetails.push({
          path: 'unknown',
          message: result.error.message,
        });
      }
    }
  }

  if (allDetails.length > 0) {
    return Err(ConfigError.validationError(allDetails));
  }

  return Ok(values as { [K in keyof T]: T[K] extends ValidationResult<infer U> ? U : never });
}

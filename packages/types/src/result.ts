/**
 * @squadscript/types
 *
 * Result type for explicit error handling.
 *
 * The Result pattern makes error handling explicit in the type system,
 * preventing accidentally ignoring errors and making it clear which
 * functions can fail.
 *
 * @example
 * ```typescript
 * import { type Result, Ok, Err, unwrapOr, tryCatch } from '@squadscript/types';
 *
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return Err('Division by zero');
 *   }
 *   return Ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log(`Result: ${result.value}`);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 * ```
 *
 * @module
 */

/**
 * Represents either a successful value or an error.
 *
 * @typeParam T - The type of the success value
 * @typeParam E - The type of the error (defaults to Error)
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Creates a successful Result containing the given value.
 *
 * @param value - The success value
 * @returns A Result in the success state
 *
 * @example
 * ```typescript
 * const result = Ok(42);
 * // result.ok === true
 * // result.value === 42
 * ```
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Creates a failed Result containing the given error.
 *
 * @param error - The error value
 * @returns A Result in the error state
 *
 * @example
 * ```typescript
 * const result = Err(new Error('Something went wrong'));
 * // result.ok === false
 * // result.error instanceof Error
 * ```
 */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Wraps an async function in try/catch and returns a Result.
 *
 * This is useful for converting promise-based APIs that throw
 * into the Result pattern.
 *
 * @param fn - An async function that may throw
 * @returns A Result containing either the value or the caught error
 *
 * @example
 * ```typescript
 * const result = await tryCatch(async () => {
 *   const response = await fetch('https://api.example.com/data');
 *   return response.json();
 * });
 *
 * if (result.ok) {
 *   console.log(result.value);
 * } else {
 *   console.error('Fetch failed:', result.error);
 * }
 * ```
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
): Promise<Result<T, Error>> {
  try {
    const value = await fn();
    return Ok(value);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Synchronous version of tryCatch.
 *
 * @param fn - A function that may throw
 * @returns A Result containing either the value or the caught error
 */
export function tryCatchSync<T>(fn: () => T): Result<T, Error> {
  try {
    const value = fn();
    return Ok(value);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Extracts the value from a Result, or returns a default value if it's an error.
 *
 * @param result - The Result to unwrap
 * @param defaultValue - The value to return if result is an error
 * @returns Either the success value or the default value
 *
 * @example
 * ```typescript
 * const result = Err('not found');
 * const value = unwrapOr(result, 'default');
 * // value === 'default'
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Extracts the value from a Result, or computes a default using a function.
 *
 * @param result - The Result to unwrap
 * @param fn - Function that computes the default value from the error
 * @returns Either the success value or the computed default
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T,
): T {
  return result.ok ? result.value : fn(result.error);
}

/**
 * Maps a Result's success value using the provided function.
 *
 * @param result - The Result to map
 * @param fn - The mapping function for the success value
 * @returns A new Result with the mapped value
 *
 * @example
 * ```typescript
 * const result = Ok(5);
 * const doubled = mapResult(result, x => x * 2);
 * // doubled.value === 10
 * ```
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}

/**
 * Maps a Result's error value using the provided function.
 *
 * @param result - The Result to map
 * @param fn - The mapping function for the error value
 * @returns A new Result with the mapped error
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return result.ok ? result : Err(fn(result.error));
}

/**
 * Chains Result-returning operations together.
 *
 * @param result - The Result to chain from
 * @param fn - A function that takes the success value and returns a new Result
 * @returns The Result from fn, or the original error
 *
 * @example
 * ```typescript
 * const result = Ok(5);
 * const chained = flatMapResult(result, x =>
 *   x > 0 ? Ok(x * 2) : Err('must be positive')
 * );
 * ```
 */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/**
 * Returns true if the Result is a success.
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/**
 * Returns true if the Result is an error.
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

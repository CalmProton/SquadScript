/**
 * @squadscript/server
 *
 * Utilities for integrating drizzle-typebox schemas with Elysia validation.
 *
 * The `spread` / `spreads` helpers extract the `properties` record from a
 * TypeBox object schema so that individual columns can be cherry-picked
 * into Elysia `t.Object()` calls.
 *
 * @see https://elysiajs.com/recipe/drizzle.html
 *
 * @module
 */

import type { TObject } from '@sinclair/typebox';

/**
 * Spreads the properties of a TypeBox object schema so individual fields
 * can be picked/omitted inside `t.Object({ ...spread(schema, ['field']) })`.
 *
 * @param schema - A TypeBox `t.Object()` or drizzle-typebox result
 * @param pick - Optional list of property keys to include (omit = include all)
 * @returns A plain object of TypeBox property schemas
 */
export function spread<T extends TObject, K extends keyof T['properties'] & string>(
  schema: T,
  pick?: K[],
): Pick<T['properties'], K> {
  const properties = schema.properties as T['properties'];
  if (!pick) return properties as Pick<T['properties'], K>;

  return pick.reduce(
    (acc, key) => {
      (acc as Record<string, unknown>)[key] = properties[key];
      return acc;
    },
    {} as Pick<T['properties'], K>,
  );
}

/**
 * Like `spread` but accepts multiple schemas and merges them.
 *
 * @param schemas - Array of TypeBox `t.Object()` schemas
 * @returns Merged properties object
 */
export function spreads<T extends TObject>(
  ...schemas: T[]
): T['properties'] {
  return schemas.reduce(
    (acc, schema) => Object.assign(acc, schema.properties),
    {} as T['properties'],
  );
}

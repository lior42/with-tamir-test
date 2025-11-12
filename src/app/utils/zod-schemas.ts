import { isValidObjectId, Types } from "mongoose";
import * as z from "zod";

/**
 * Zod type to get mongo's object id from a string
 * @example
 * ```js
 * const possibleObjectId1 = "69112f1cece0c307866069a1";
 * const possibleObjectId2 = "not an objectid";
 *
 * const asObjectId1 = zodObjectId.parse(possibleObjectId1); // <- success with a valid object id.
 * const asObjectId2 = zodObjectId.parse(possibleObjectId2); // <- yields a parsing error.
 * ```
 */
export const zodObjectId = z
  .string()
  .refine((x) => isValidObjectId(x), { error: "Invalid ObjectId" })
  .transform((x) => new Types.ObjectId(x));

/**
 * adds a typical "_id" field (by mongo) to a zod schema
 * @example
 * ```js
 * const mySchema = z.object({
 *  name: z.string().min(2), // whatever
 * }).extend(withId.shape);
 * ```
 */
export const withId = z.object({
  _id: zodObjectId,
});

/**
 * adds the well known "createdAt"/"updatedAt" columns to a zod schema
 * @example
 * ```js
 * const mySchema = z.object({
 *  name: z.string().min(2), // whatever
 * }).extend(withTimestamps.shape);
 * ```
 */
export const withTimestamps = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// assistant for converting strings into positive integers
// because "z.coerce.number().int()" is deprecated
// see: https://github.com/colinhacks/zod/issues/4212
const strPositiveNumber = z.coerce.number().pipe(z.int().positive());

export const withPagination = z.object({
  "current-page": strPositiveNumber.default(1),
  limit: strPositiveNumber.default(10),
});

/**
 * a common query-param for searching endpoints.
 * @example
 * export const searchValidator = defineValidator({
 *  query: searchParams,
 * });
 */
export const searchParams = z
  .object({
    "search-query": z.string().min(1),
  })
  .extend(withPagination.shape);

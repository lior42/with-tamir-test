/**
 * An error to indicate that retries should be stopped.
 * @example
 * ```ts
 * // example-function.ts
 * import { withRetry } from "@/lib/utils/async";
 * import { StopRetryError } from "@/lib/errors/stop-retry-error";
 * async function exampleFunction(url: string) {
 *   if(!isValidUrl(url)) {
 *     throw new StopRetryError("Invalid URL, will not retry");
 *   }
 *   return fetch(url);
 * }
 * export const retriedExampleFunction = withRetry(exampleFunction, { retries: 5 });
 * // index.ts
 * import { retriedExampleFunction } from "./example-function";
 * try {
 *   const res = await retriedExampleFunction("invalid-url");
 * } catch(e) {
 *   // will reach here in case of invalid URL without retries
 *   console.error(e);
 * }
 * ```
 */
export class StopRetryError extends Error {}

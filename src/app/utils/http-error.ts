import type { HttpStatusCode, HttpStatusName } from "./http-codes";

/**
 * Simple utility error object to enable quick auto http check
 * @example
 * ```ts
 * import { Router } from "express";
 * import { HttpError } from "@/app/utils/http-error"
 *
 * export const router = Router();
 * router.get("/", () => {
 *  throw new HttpError(
 *    "IM_A_TEAPOT",          // error code, can be both a number and a string
 *    "Example Error",        // error message, always sent to the client
 *    { cause: "because" },   // normal error's option, safe in production
 *    "Some additional data", // additional data to send when needs to the client
 *    true,                   // disables the logging
 *    "TeapotExample"         // override the error's name in the logs
 *  );
 * });
 * ```
 */
export class HttpError extends Error {
  constructor(
    public statusCode: HttpStatusCode | HttpStatusName,
    message?: string,
    options?: ErrorOptions,
    public extraInfo?: any,
    public disableLogs: boolean = false,
    public override name: string = "HttpError",
  ) {
    super(message, options);
  }
}

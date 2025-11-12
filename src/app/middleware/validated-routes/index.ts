import type { NextFunction, Request, Response } from "express";
import type { Handler, ValidatedInfo, ValidationOptions } from "./types";
import * as z from "zod";
import { getInfoFromToken } from "@/app/utils/auth";
import { HttpError } from "@/app/utils/http-error";
import * as logger from "@/lib/logging";
import { isEmptyRecord } from "@/lib/utils/objects";
import { UsersModel } from "@/models/users";

const warningMessage =
  '{method: %s, path: %s} Calling "response.send" or a similar function within the handler would bypass the validation, use the return syntax instead.' as const;

const safetyChecks = [
  ["body", "body"],
  ["headers", "headers"],
  ["params", "params"],
  ["query", "query"],
] as const;

/**
 * Middleware to create a zod-based express request handler with data validations
 *
 * @param validators Zod schemas and flags for input/output
 * @param handler a function to act as the logic, can be both async and synchronous
 * @returns a valid express handler
 * @example
 * ```js
 * const validator = defineValidator({
 *  query: z.object({ recipient: z.string().default("World") }),
 *  output: z.object({ hello: z.string() }),
 * });
 *
 * router.get(
 *  "/say-hello",
 *  validatedRoute(validator, ({ info }) => ({ hello: info.query.recipient }))
 * );
 *
 * ```
 */
export function validatedRoute<T extends ValidationOptions>(
  validators: T,
  handler: Handler<T>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const valid: Partial<ValidatedInfo<T>> = {};
    const invalid: any = {};

    // authentication
    if (validators.addAuth) {
      // note - x-auth-token is not standard, used it for backward compatibility
      const properHeader =
        req.header("authorization") || req.header("x-auth-token");
      if (!properHeader) {
        throw new HttpError(
          "UNAUTHORIZED",
          "User Is Required",
          undefined,
          undefined,
          true,
        );
      }
      let token = properHeader;
      if (properHeader.toLowerCase().startsWith("bearer ")) {
        token = token.split(" ")[1] || "";
      }
      const userId = getInfoFromToken(token);
      let query = UsersModel.findById(userId);
      if (validators.addAuth !== "with-password") {
        query = query.select("-password");
      }
      const result = await query;
      if (!result) {
        throw new HttpError("UNAUTHORIZED", "Invalid UserID", {
          cause: {
            ip: req.ip,
          },
        });
      }
      (valid as any).session = result;
    }

    // validation
    for (const [validatorKey, requestKey] of safetyChecks) {
      const schema = validators[validatorKey];
      if (!schema) {
        continue;
      }
      const parsedInfo = schema.safeParse(req[requestKey]);
      if (parsedInfo.success) {
        valid[validatorKey] = parsedInfo.data as any;
      } else {
        invalid[validatorKey] = z.flattenError(parsedInfo.error).fieldErrors;
      }
    }

    if (!isEmptyRecord(invalid)) {
      // check: silent the error here?
      throw new HttpError(
        "UNPROCESSABLE_CONTENT",
        "Received Invalid Data",
        { cause: invalid },
        invalid,
      );
    }

    // execution
    let result = await handler({
      request: req,
      response: res,
      next,
      info: valid as ValidatedInfo<T>,
    });

    if (res.headersSent) {
      // edge case - needs validate output but called with response.json or response.send or something
      // so it cant check it since client already got the message
      if (validators.output) {
        const rawUrl = [req.baseUrl, req.route?.path]
          .filter(Boolean)
          .join("")
          .replaceAll("//", "/");
        logger.warn(
          "ValidationMiddleware",
          warningMessage,
          req.method,
          rawUrl || req.originalUrl,
        );
      }
      return;
    }

    // check output
    if (validators.output) {
      const checkedOutput = validators.output.safeParse(result);
      if (!checkedOutput.success) {
        throw new HttpError(
          "INTERNAL_SERVER_ERROR",
          "Handler Yielded Invalid Output",
          {
            cause: {
              output: result,
            },
          },
          {
            infoParsed: valid,
            errors: z.flattenError(checkedOutput.error).fieldErrors,
          },
        );
      }
      // note: in the off-chance we have fields to delete or transform here
      result = checkedOutput.data as any;
    }

    // send when validated
    res.send(result);
  };
}

/**
 * helper for validatedRoute, to enabled decoupled validators definitions.
 * @see validatedRoute
 */
export function defineValidator<T extends ValidationOptions>(info: T) {
  return info;
}

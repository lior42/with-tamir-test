/** biome-ignore-all lint/complexity/noBannedTypes: needed for clarity */

import type { NextFunction, Request, Response } from "express";
import type { HydratedDocument, InferSchemaType } from "mongoose";
import type * as z from "zod";
import type { UsersSchema } from "@/models/users";

export type ValidationOptions = Partial<{
  params: z.ZodObject<any>;
  body: z.ZodObject<any>;
  query: z.ZodObject<any>;
  headers: z.ZodObject<any>;
  addAuth: boolean | "with-password";
  output: z.ZodType;
}>;

type SessionType = HydratedDocument<InferSchemaType<typeof UsersSchema>>;

type InferZod<T> = T extends z.ZodType ? z.infer<T> : never;

type ValidatedAuthInfo<T extends ValidationOptions> = T["addAuth"] extends true
  ? { session: Omit<SessionType, "password"> }
  : T["addAuth"] extends "with-password"
    ? {
        session: SessionType;
      }
    : {};

export type ValidatedInfo<T extends ValidationOptions> = {
  [K in keyof T as K extends "addAuth" | "output" ? never : K]: InferZod<T[K]>;
} & ValidatedAuthInfo<T>;

type HandlerInput<T extends ValidationOptions> = {
  request: Request;
  response: Response;
  next: NextFunction;
  info: ValidatedInfo<T>;
};

export type Handler<T extends ValidationOptions> = (
  input: HandlerInput<T>,
) => T["output"] extends z.ZodType
  ? z.input<T["output"]> | Promise<z.input<T["output"]>>
  : any;

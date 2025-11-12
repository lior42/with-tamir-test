import * as z from "zod";
import { defineValidator } from "@/app/middleware/validated-routes";
import { searchParams, withId } from "../utils/zod-schemas";

const eightYearsMs = 8 * 365 * 24 * 60 * 60 * 1000;

export const usersBaseSchema = z.object({
  userName: z.string().min(2).max(64),
  email: z.email().trim().toLowerCase().max(256),
  profile: z
    .object({
      firstName: z.string().max(64),
      lastName: z.string().max(64),
      bio: z.string().max(1024),
      birthday: z.coerce
        .date()
        .refine((x) => Date.now() - eightYearsMs > x.getTime(), {
          error: "Too Young",
        }),
    })
    .partial()
    .optional(),
  role: z.enum(["admin", "dev", "regular"]).default("regular"),
});

export const withPassword = usersBaseSchema.extend({
  password: z
    .string()
    .min(8)
    .refine((x) => /[a-z]/g.test(x), {
      error: "Must contains at least one lowercase character",
    })
    .refine((x) => /[A-Z]/g.test(x), {
      error: "Must contains at least one upper character",
    })
    .refine((x) => /\d/g.test(x), {
      error: "Must contains at least one digit",
    }),
});

export const insert = defineValidator({
  body: withPassword.omit({ role: true }),
});

export const update = defineValidator({
  params: withId,
  body: withPassword.omit({ role: true }).partial(),
  addAuth: true,
});

export const signIn = defineValidator({
  body: z.object({
    email: z.email().trim().toLowerCase().max(256),
    password: z.string(),
  }),
});

// note - delete is a reserved word
export const deleteValidator = defineValidator({
  body: z.object({ password: z.string() }),
  addAuth: "with-password",
});

export const getDetails = defineValidator({
  addAuth: true,
  output: z.object({
    userName: z.string().min(2).max(64).nullable(),
    email: z.email().trim().toLowerCase().max(256).nullable(),
    profile: z
      .object({
        firstName: z.string().max(64).nullable(),
        lastName: z.string().max(64).nullable(),
        bio: z.string().max(1024).nullable(),
        birthday: z.coerce
          .date()
          .refine((x) => Date.now() - eightYearsMs > x.getTime(), {
            error: "Too Young",
          })
          .nullable(),
      })
      .partial()
      .optional()
      .nullable(),
    role: z.enum(["admin", "dev", "regular"]).default("regular").nullable(),
  }),
});

export const search = defineValidator({
  addAuth: true,
  query: searchParams,
});

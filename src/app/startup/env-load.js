import * as z from "zod";

const envSchema = z.looseObject({
  // generic
  PORT: z.coerce.number().pipe(z.int().positive().max(65535)).default(3333),
  NODE_ENV: z.enum(["production", "development"]).default("development"),
  BASE_URL: z.url().default("http://localhost:3333"),
  // logs
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("pretty"),
  // database
  DB_SOCKET_TIMEOUT_MS: z.coerce
    .number()
    .pipe(z.int().positive())
    .default(45000),
  DB_ADDRESS: z
    .url({ protocol: /mongodb/ })
    .default("mongodb://localhost:27017/mash_app"),
  // security
  ALLOWED_ORIGINS: z.string().optional(),
  BCRYPT_SALT: z.coerce.number().pipe(z.int().positive().max(20)).default(10),
  JWT_ALGORITHM: z.enum(["HS256", "HS384", "HS512"]).default("HS384"),
  JWT_SECRET: z
    .string()
    .default("some-super-secret-password")
    .refine((x) => {
      if (process.env.NODE_ENV !== "production") {
        return true;
      }
      return x.length > 32;
    }),
  JWT_EXP_SECONDS: z
    .number()
    .pipe(z.int().positive())
    .default(7 * 24 * 60 * 60),
});

export const env = envSchema.parse(process.env);

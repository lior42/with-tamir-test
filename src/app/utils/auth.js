import { hash } from "node:crypto";
import jwt from "jsonwebtoken";
import * as z from "zod";
import { env } from "../startup/env-load";
import { HttpError } from "./http-error";
import { zodObjectId } from "./zod-schemas";

// pretty much ensures that the password is a super complicated long string
const secretSuperSecure = hash("sha512", env.JWT_SECRET);

const internalSchema = z.object({
  userId: zodObjectId,
});

/**
 * @param {object} info
 */
function sign(info) {
  return jwt.sign(info, secretSuperSecure, {
    expiresIn: env.JWT_EXP_SECONDS,
    algorithm: env.JWT_ALGORITHM,
  });
}

/**
 *
 * @param {import("mongoose").HydratedDocument<import("mongoose").InferSchemaType<typeof import("@/models/users").UsersSchema>>} user
 */
export function generateToken(user) {
  return sign({
    userId: user._id.toString(),
  });
}

/**
 *
 * @param {string} token
 */
export function getInfoFromToken(token) {
  try {
    const decrypted = jwt.verify(token, secretSuperSecure, {
      algorithms: [env.JWT_ALGORITHM],
    });
    const { userId } = internalSchema.parse(decrypted);
    return userId;
  } catch {
    throw new HttpError("UNAUTHORIZED", "Invalid token was given", {
      cause: token,
    });
  }
}

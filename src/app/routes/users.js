import bcrypt from "bcryptjs";
import { Router } from "express";
import RegexEscape from "regex-escape";
import { safePromiseWrapper } from "@/lib/utils/async";
import { UsersModel } from "@/models/users";
import { validatedRoute } from "../middleware/validated-routes";
import { env } from "../startup/env-load";
import { generateToken } from "../utils/auth";
import { HTTP_CODES } from "../utils/http-codes";
import { HttpError } from "../utils/http-error";
import * as validators from "../validators/users";

export const router = Router();

router.get(
  "/me",
  validatedRoute(validators.getDetails, ({ info }) => info.session),
);

router.post(
  "/sign-up",
  validatedRoute(validators.insert, async ({ info, response }) => {
    const emailRegistered = await safePromiseWrapper(
      UsersModel.findOne({ email: info.body.email }),
    );
    if (emailRegistered.hasError) {
      throw new HttpError("SERVICE_UNAVAILABLE", "Data Not Accessible");
    }
    if (emailRegistered.result !== null) {
      throw new HttpError(
        "CONFLICT",
        "Email Already Registered",
        undefined,
        { email: info.body.email },
        true,
      );
    }
    const filledUp = validators.withPassword.parse(info.body);
    const encryptedPassword = await bcrypt.hash(
      filledUp.password,
      env.BCRYPT_SALT,
    );
    filledUp.password = encryptedPassword;
    const createResult = await safePromiseWrapper(UsersModel.create(filledUp));
    if (createResult.hasError) {
      throw new HttpError(
        "CONFLICT",
        "Email Already Registered",
        undefined,
        { email: info.body.email },
        true,
      );
    }
    const saveObj = createResult.result;

    const safeBaseReturn = await safePromiseWrapper(
      UsersModel.findById(saveObj._id).select("-password").lean(),
    );
    if (safeBaseReturn.hasError) {
      throw new HttpError("SERVICE_UNAVAILABLE", "Data Not Accessible");
    }
    const baseReturnObj = safeBaseReturn.result;
    if (baseReturnObj === null) {
      throw new HttpError("INTERNAL_SERVER_ERROR", "Unknown error was thrown");
    }
    const retValue = { ...baseReturnObj, _id: baseReturnObj._id.toString() };

    response.statusCode = HTTP_CODES.CREATED;

    return retValue;
  }),
);

router.post(
  "/sign-in",
  validatedRoute(validators.signIn, async ({ info }) => {
    const userRaw = await safePromiseWrapper(
      UsersModel.findOne({ email: info.body.email }),
    );
    if (userRaw.hasError) {
      throw new HttpError("SERVICE_UNAVAILABLE", "Data Not Accessible");
    }
    if (userRaw.result === null) {
      throw new HttpError(
        "UNAUTHORIZED",
        "User Not Exists",
        undefined,
        undefined,
        true,
      );
    }
    const passwordCheck = info.body.password;

    const isOk = await bcrypt.compare(passwordCheck, userRaw.result.password);
    if (!isOk) {
      throw new HttpError(
        "UNAUTHORIZED",
        "Incorrect Password",
        undefined,
        undefined,
        true,
      );
    }

    const token = generateToken(userRaw.result);
    return { token };
  }),
);

router.delete(
  "/me",
  validatedRoute(validators.deleteValidator, async ({ info, response }) => {
    const databasePassword = info.session.password;
    const checkPassword = info.body.password;

    const isIdentical = await bcrypt.compare(checkPassword, databasePassword);
    if (!isIdentical) {
      throw new HttpError(
        "FORBIDDEN",
        "Password is not user's password",
        undefined,
        undefined,
        true,
      );
    }

    const deleteResult = await safePromiseWrapper(
      UsersModel.deleteOne({ _id: info.session._id }),
    );
    if (deleteResult.hasError) {
      throw new HttpError(
        "SERVICE_UNAVAILABLE",
        "Delete Was Not Successful, try again later",
      );
    }

    if (deleteResult.result.deletedCount === 0) {
      response.statusCode = HTTP_CODES.ACCEPTED;
    }

    return { ok: true };
  }),
);

router.get(
  "/search",
  validatedRoute(validators.search, async ({ info }) => {
    if (info.session.role === "regular") {
      throw new HttpError(
        "UNAUTHORIZED",
        "Requires Admin Access",
        { cause: info.session.role },
        { request: info.query, role: info.session.role },
      );
    }

    const regex = new RegExp(RegexEscape(info.query["search-query"]), "i");

    const query = await safePromiseWrapper(
      UsersModel.find({
        $or: [
          {
            userName: { $regex: regex },
          },
          {
            email: { $regex: regex },
          },
        ],
      })
        .sort({ _id: 1 })
        .limit(info.query.limit)
        .skip((info.query["current-page"] - 1) * info.query.limit)
        .select("-password"),
    );

    if (query.hasError) {
      throw new HttpError("SERVICE_UNAVAILABLE", "Database inaccessible");
    }

    const totalRecords = await UsersModel.countDocuments({
      $or: [
        {
          userName: { $regex: regex },
        },
        {
          email: { $regex: regex },
        },
      ],
    });

    const totalPages = Math.ceil(totalRecords / info.query.limit);

    return {
      metadata: {
        "total-pages": totalPages,
        ...info.query,
      },
      data: query.result,
    };
  }),
);

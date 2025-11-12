import { model, Schema } from "mongoose";

export const UsersSchema = new Schema(
  {
    userName: {
      type: String,
      minLength: 2,
      required: true,
      maxLength: 64,
    },
    password: {
      type: String,
      required: true,
      // super duper important: validation comes externally
    },
    role: {
      type: String,
      enum: ["admin", "dev", "regular"],
      default: "regular",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      maxLength: 256,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    profile: {
      firstName: {
        type: String,
        maxLength: 64,
      },
      lastName: {
        type: String,
        maxLength: 64,
      },
      bio: {
        type: String,
        maxLength: 1024,
      },
      birthday: {
        type: Date,
      },
    },
    loginInfo: {
      last: {
        type: Date,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    preferences: {
      language: {
        type: String,
        enum: ["en"],
        default: "en",
      },
    },
  },
  { timestamps: true },
);

export const UsersModel = model("Users", UsersSchema);

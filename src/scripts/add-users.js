import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { initialDb } from "@/app/startup/database";
import { env } from "@/app/startup/env-load";
import { withPassword } from "@/app/validators/users";
import * as logger from "@/lib/logging";
import { UsersModel } from "@/models/users";

await initialDb();

const users = [
  {
    userName: "AdminGuy",
    email: "admin@example.com",
    password: "Admin1234",
    role: "admin",
    profile: {
      firstName: "Alice",
      lastName: "Admin",
      bio: "System overlord",
      birthday: "1990-01-01",
    },
  },
  {
    userName: "DevPerson",
    email: "dev@example.com",
    password: "DevPass123",
    role: "dev",
    profile: {
      firstName: "Bob",
      lastName: "Dev",
      bio: "Builds cool stuff",
      birthday: "1995-05-15",
    },
  },
  {
    userName: "RegularJoe",
    email: "joe@example.com",
    password: "JoePass123",
    role: "regular",
    profile: {
      firstName: "Joe",
      lastName: "User",
      bio: "Just a regular user",
      birthday: "2000-03-20",
    },
  },
]
  .map((x) => withPassword.parse(x))
  .map((x) => ({
    ...x,
    password: bcrypt.hashSync(x.password, env.BCRYPT_SALT),
  }));

logger.info("AddUsers", "Finished initial users");

await UsersModel.insertMany(users);

logger.info("AddUsers", "Finished inserts");

await mongoose.disconnect();

logger.info("AddUsers", "Finished Mongo Connection");

import mongoose from "mongoose";
import * as logger from "@/lib/logging";
import { safePromiseWrapper } from "@/lib/utils/async";
import { env } from "./env-load.js";

const logContext = "Mongo Handler";

export async function initialDb() {
  const url = env.DB_ADDRESS;
  const socketTimeoutMS = env.DB_SOCKET_TIMEOUT_MS;

  const checkConnection = await safePromiseWrapper(
    mongoose.connect(url, { socketTimeoutMS }),
  );

  if (checkConnection.hasError) {
    logger.error(logContext, "Mongo Cant Connect");
    logger.error(logContext, checkConnection.error);
    process.exit(1);
  }

  const dbName = mongoose.connection.name;
  logger.info(logContext, `Successfully connected to mongo database ${dbName}`);

  mongoose.connection.on("error", (err) => {
    logger.error(logContext, err);
  });

  process.on("SIGINT", async () => {
    const { hasError } = await safePromiseWrapper(mongoose.connection.close());
    const exitCode = Number(hasError);
    const prefix = hasError ? "un" : "";
    logger.info(logContext, `Closed mongo connection ${prefix}successfully`);
    process.exitCode = exitCode;
  });
}

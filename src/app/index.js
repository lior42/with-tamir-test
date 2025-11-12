import cors from "cors";
import express from "express";
import helmet from "helmet";
import * as logger from "@/lib/logging";
import { globalErrorHandler } from "./middleware/error-handler";
import { loggingMiddleware } from "./middleware/logging";
import { notFoundMiddleware } from "./middleware/not-found";
import { validatedRoute } from "./middleware/validated-routes";
import { initialDb } from "./startup/database";
import { env } from "./startup/env-load";
import { router } from "./startup/router";

await initialDb();

const app = express();

// security loading
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

if (env.ALLOWED_ORIGINS) {
  app.use(cors({ origin: env.ALLOWED_ORIGINS.split(",") }));
} else if (env.NODE_ENV === "production") {
  logger.error(
    "Main",
    "Security details were'nt provided for production, please set ALLOWED_ORIGINS environment variable",
  );
  process.exit(1);
} else {
  app.use(cors());
}

// generic express
// very important: size limit comes from reverse proxy or
// deployment platform, no need to do it again.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// logging internally handles debug mode
app.use(loggingMiddleware);

// main router
app.use("/api", router);

// health endpoint for tools
app.get(
  "/health",
  validatedRoute({}, () => ({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    environment: env.NODE_ENV,
  })),
);

// custom 404
app.all("/{*all}", notFoundMiddleware);

// fallback error handler
app.use(globalErrorHandler);

// final listen
app.listen(env.PORT, (err) => {
  if (err) {
    logger.error("Main", err);
    process.exit(1);
  }
  logger.info("Main", "Start Listening On Port %d", env.PORT);
});

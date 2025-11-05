import type { LogFormat, LogLevel } from "./types";
import { setupFromEnv } from "./utils";

export const logLevels: LogLevel[] = ["debug", "info", "warn", "error"];
const logFormats: LogFormat[] = ["json", "pretty"];

export const currentLogLevel = setupFromEnv(logLevels, "LOG_LEVEL", "debug");
export const currentFormat = setupFromEnv(logFormats, "LOG_FORMAT", "pretty");

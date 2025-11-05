import type { ArrayMember } from "@/lib/type-helpers";
import type { LogLevel } from "./types";

export function setupFromEnv<T extends any[]>(
  options: T,
  envVar: string,
  defaultVal: ArrayMember<T>,
  disableError?: boolean,
): ArrayMember<T> {
  const envVal = process.env[envVar]?.trim()?.toLowerCase();
  if (!envVal) {
    return defaultVal;
  }
  if (options.includes(envVal)) {
    return envVal as ArrayMember<T>;
  }
  if (!disableError) {
    throw new Error("Invalid Environment Variable Supplied", {
      cause: { envVar, envVal },
    });
  } else {
    return defaultVal;
  }
}

export function basicLog(level: LogLevel, ...info: any[]) {
  if (level === "error") {
    return console.error(...info);
  } else if (level === "warn") {
    return console.warn(...info);
  }
  return console.log(...info);
}

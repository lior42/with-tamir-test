import type { LogLevel } from "./types";
import { currentFormat, currentLogLevel, logLevels } from "./env-vars";
import * as formatters from "./formatters";
import { basicLog } from "./utils";

// biome-ignore lint/performance/noDynamicNamespaceImportAccess: It is very small in this case plus its saves up a lot.
const currentFormatter = formatters[currentFormat];

export function genericLog(
  logLevel: LogLevel,
  context: string,
  msg: any,
  ...extra: any[]
) {
  const rawMinLogLevel = logLevels.indexOf(currentLogLevel);
  const rawCurLogLevel = logLevels.indexOf(logLevel);
  if (rawCurLogLevel < rawMinLogLevel) {
    return;
  }

  basicLog(logLevel, ...currentFormatter(logLevel, context, msg, ...extra));
}

export function debug(context: string, msg: any, ...extra: any[]) {
  return genericLog("debug", context, msg, ...extra);
}

export function info(context: string, msg: any, ...extra: any[]) {
  return genericLog("info", context, msg, ...extra);
}

export function warn(context: string, msg: any, ...extra: any[]) {
  return genericLog("warn", context, msg, ...extra);
}

export function error(context: string, msg: any, ...extra: any[]) {
  return genericLog("error", context, msg, ...extra);
}

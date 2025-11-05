import type { LogLevel, NodeEnv } from "./types";
import { currentFormat } from "./env-vars";
import { setupFromEnv } from "./utils";

const nodeEnvOptions: NodeEnv[] = ["development", "production"];

const currentEnv = setupFromEnv(
  nodeEnvOptions,
  "NODE_ENV",
  "development",
  true,
);

const ANSI = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const colorMap: Record<LogLevel, string> = {
  debug: ANSI.gray,
  info: ANSI.cyan,
  warn: ANSI.yellow,
  error: ANSI.red,
};

export function json(
  logLevel: LogLevel,
  context: string,
  msg: any,
  ...extra: any[]
) {
  return [JSON.stringify(basicJsonInfo(logLevel, context, msg, ...extra))];
}

export function pretty(
  logLevel: LogLevel,
  context: string,
  msg: any,
  ...extra: any[]
) {
  const info = basicJsonInfo(logLevel, context, msg, ...extra);
  const ts = info.timestampISO.split("Z")[0]!.replace("T", " ");
  let final = `[${ts}] {${info.level.padEnd(5)}} (${info.context})`;
  if (msg instanceof Error) {
    const errMessage = JSON.parse(info.message);
    const currentMsg = [`Error Was Recorded: ${errMessage.name}`];
    const toAdd = errMessage.message?.split("\n") || [
      "No Error Message Provided",
    ];
    currentMsg.push(...toAdd);
    if (errMessage.cause) {
      const cause = formatMessage(errMessage.cause);
      if (typeof cause !== "string" || !isJson(cause)) {
        currentMsg.push(`Cause: ${formatMessage(errMessage.cause)}`);
      } else {
        currentMsg.push(`Cause:`, ...cause.split("\n"));
      }
    }
    if (errMessage.stack?.length) {
      currentMsg.push(
        "Stack Trace:",
        ...errMessage.stack
          .filter((x: string) => x.startsWith("at "))
          .map((x: any) => `- ${x}`),
      );
    }

    const padLength = final.length;
    const pad = "".padStart(padLength, " ");
    const msgFinal = currentMsg
      .map((row, idx) => (idx === 0 ? row : `${pad} ${row}`))
      .join("\n");
    final = `${final} ${msgFinal}`;
  } else if (!isJson(info.message)) {
    final = `${final} ${info.message}`;
  } else {
    const msgSplit = info.message.split("\n");
    const spaces = "".padStart(final.length + 1, " ");
    const finalMsg = msgSplit
      .map((x: string, idx: number) => (idx > 0 ? spaces + x : x))
      .join("\n");
    final = `${final} ${finalMsg}`;
  }
  if (currentEnv === "development" && process.stdout.isTTY) {
    return [`${colorMap[info.level]}${final}${ANSI.reset}`, ...extra];
  }
  return [final, ...extra];
}

function basicJsonInfo(
  logLevel: LogLevel,
  context: string,
  msg: any,
  ...extra: any[]
) {
  const timestampBase = new Date();
  return {
    context,
    level: logLevel,
    timestamp: Math.floor(timestampBase.getTime() / 1000),
    timestampISO: timestampBase.toISOString(),
    message: formatMessage(msg),
    extra: extra.length ? extra : undefined,
  };
}

function formatMessage(msg: any) {
  const allowedRawInfo = ["boolean", "number", "bigint", "string"];
  if (allowedRawInfo.includes(typeof msg)) {
    return msg;
  } else if (!msg) {
    return null;
  } else if (msg instanceof Map) {
    return formatMessage(Object.fromEntries(msg.entries()));
  } else if (msg instanceof Set) {
    return formatMessage([...msg]);
  } else if (msg instanceof Error) {
    const final: any = {
      message: msg.message,
      name: msg.name,
    };
    if (currentEnv !== "production") {
      final.cause = msg.cause;
      final.stack = msg.stack?.split("\n").map((row) => row.trim());
    }
    return formatMessage(final);
  }

  return currentFormat === "json" ? msg : JSON.stringify(msg, null, 2);
}

function isJson(str: string) {
  if (typeof str !== "string") {
    return false;
  }
  try {
    JSON.parse(str);
    return true;
  } catch (_) {
    return false;
  }
}

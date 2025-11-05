import * as logger from "@/lib/logging";
import { enumerateAsync } from "@/lib/utils/generators";
import { createIntervalLoop } from "@/lib/utils/generic";

const context = "IntervalLoop";

export function intervalLoopExample() {
  logger.info(context, "Setup");
  const controller = new AbortController();
  setImmediate(() => internalLoop(controller.signal));
  return { controller };
}

async function internalLoop(signal: AbortSignal) {
  const loop = createIntervalLoop(200, signal);
  try {
    for await (const { step } of enumerateAsync(loop)) {
      logger.info(context, `ping #${step}`);
    }
  } catch (e) {
    logger.info(context, "Done");
    logger.debug(context, e);
  }
}

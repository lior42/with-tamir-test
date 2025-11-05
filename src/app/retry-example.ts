import * as logger from "@/lib/logging";
import { withRetry } from "@/lib/utils/async";
import { delay } from "@/lib/utils/generic";

const context = "RetryExample";

async function internalImplementation(num: number) {
  logger.debug(context, "Starting Retry Example");
  await delay(Math.random() * 3000);
  if (Math.random() > 0.5) {
    throw new Error("Example Post-Processing Error");
  }
  return num;
}

export const retryExample = withRetry(internalImplementation, {
  timeoutOperation: 2000,
});

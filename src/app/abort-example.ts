import * as logger from "@/lib/logging";
import {
  runAbortable,
  runTimeout,
  safePromiseWrapper,
} from "@/lib/utils/async";
import { delay } from "@/lib/utils/generic";

const context = "AbortUtilityExample";

export async function abortExample() {
  logger.info(context, "Start Abort Example");
  const controller = new AbortController();
  const abortablePromise = safePromiseWrapper(
    runAbortable(
      delay(2000).then(() => 2),
      controller.signal,
    ),
  );
  controller.abort();
  const awaited = await abortablePromise;
  // note - always error in this case, but using safePromiseWrapper does requires proper handling always
  const unwrappedResults = awaited.hasError ? awaited.error : awaited.result;
  logger.info(context, unwrappedResults);
}

export async function timeoutExample() {
  logger.info(context, "Start Timeout Example");
  const info = await safePromiseWrapper(
    runTimeout(
      delay(1000).then(() => 69),
      500,
    ),
  );
  logger.info(context, info.hasError ? info.error : info.result);
}

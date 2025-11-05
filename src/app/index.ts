// a small data pipeline example to showcase the full template's capabilities

import * as logger from "@/lib/logging";
import { namedAllSettled, safePromiseWrapper } from "@/lib/utils/async";
import {
  chunkArr,
  chunkOperationArr,
  chunkOperationGeneratorSingle,
} from "@/lib/utils/chunks";
import { enumerateAsync } from "@/lib/utils/generators";
import { delay } from "@/lib/utils/generic";
import { abortExample, timeoutExample } from "./abort-example";
import { intervalLoopExample } from "./interval-loop-example";
import { retryExample } from "./retry-example";

// generally speaking - using file-based or module based context is recommended,
// be cautious about using "import.meta.filename" though, the current setting
// bundles everything to a single file.
const context = "Data Pipeline";

// some data to work with
const fakeData = Array.from({ length: 50 }, (_, i) => i + 1);

// just a setting for demo, in real world scenario its better to put it in
// a config file of sort.
const chunkSize = 10;

async function main() {
  const toWait = timeoutExample();
  const loop = intervalLoopExample();

  const retryExampleRun = await safePromiseWrapper(retryExample(42));
  if (retryExampleRun.hasError) {
    logger.error(context, retryExampleRun.error);
  } else {
    logger.info(context, `Retry Example: ${retryExampleRun.result}`);
  }

  logger.info(context, "Starting transform into doMath");
  logger.debug(context, { chunkSize });

  const equationResult: number[] = [];

  const iterator = chunkOperationGeneratorSingle(fakeData, chunkSize, doMath);

  // wrap the iterator with the enumerate-iterator to get the current step,
  // useful for feedback for users or logs
  for await (const { step, val: res } of enumerateAsync(iterator)) {
    if (res.hasError) {
      logger.error(context, res.error);
    } else {
      equationResult.push(res.result);
    }
    // note you can also use printf style syntax,
    // though discouraged, it can be useful when using json
    // output since it keeps proper types and order in the "extra"
    // field instead of bundle it inside the string.
    logger.info(context, `Step %d of %d completed`, step, fakeData.length);
  }

  logger.info(context, "Finished doMath, starting post-processing");

  // note that these two functions runs simultaneously and the end result is only resolved
  // once both are done.
  const results = await namedAllSettled(
    {
      summed: applySum(equationResult),
      formatted: applyFormat(equationResult),
    },
    true,
  );

  logger.info(context, "All tasks complete");
  logger.debug(context, results);
  await toWait;
  await abortExample();
  loop.controller.abort(new Error("Loop Aborted Externally"));
}

async function applySum(data: number[]) {
  logger.info(context, 'Starting "applySum"');
  const rawResult = await chunkOperationArr(data, chunkSize, sumArr);
  const result: number[] = [];

  for (const entry of rawResult) {
    if (!entry.hasError) {
      result.push(entry.result);
    }
  }

  logger.info(context, 'Finished "applySum"');
  return result;
}

async function applyFormat(data: number[]) {
  logger.info(context, 'Starting "applyFormat"');
  const result: string[] = [];

  for await (const res of chunkOperationGeneratorSingle(
    data,
    chunkSize,
    prettyNumberFormat,
  )) {
    if (res.hasError) {
      logger.error(context, res.error);
    } else {
      result.push(res.result);
    }
  }

  logger.info(context, 'Finished "applyFormat"');
  return result;
}

async function doMath(num: number) {
  await delayABit(1);
  // just to see how errors are logged.
  // note that in production mode the only the error type and message
  // are kept.
  if (num === 13) {
    throw new Error("Avoiding some bad luck", { cause: { num } });
  }
  return num * 17 + 500;
}

async function sumArr(arr: number[]) {
  await delayABit(1);
  return arr.reduce((p, c) => p + c, 0);
}

async function prettyNumberFormat(num: number) {
  await delayABit(0.3);
  // functionally identical, but might not look familiar:
  // const reversed = chunkArr(num.toString(), 1).reverse().join("");
  const reversed = num.toString().split("").reverse().join("");
  const withCommas = chunkArr(reversed, 3).join(",");
  return withCommas.split("").reverse().join("");
}

// minor function that simulate heavy workload
function delayABit(sec: number) {
  return delay(sec * 1000);
}

await main().catch((err) => logger.error(context, err));

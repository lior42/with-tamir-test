import type { RemapRecord } from "@/lib/type-helpers";
import { StopRetryError } from "../errors/stop-retry-error";
import { delay } from "./generic";
import { isEmptyRecord } from "./objects";

export type SafeWrapperResult<T, E = unknown> =
  | { hasError: true; error: E }
  | { hasError: false; result: Awaited<T> };

/**
 * wraps a promise with an error-as-value error handling technique
 */
export async function safePromiseWrapper<T, E = unknown>(
  promise: Promise<T>,
): Promise<SafeWrapperResult<T, E>> {
  try {
    const result = await promise;
    return { hasError: false, result };
  } catch (error) {
    return { hasError: true, error: error as E };
  }
}

type BasePromiseMap = Record<string, Promise<any>>;

// note - the "& {}" unpacks the type so it is easier to
// read in IDEs
type ResolvedPromisesMap<T extends BasePromiseMap> = {
  [K in keyof T]: Awaited<T[K]>;
} & {};

type NamedSettledResult<T extends BasePromiseMap> = {
  successes: Partial<ResolvedPromisesMap<T>>;
  fails: Partial<RemapRecord<T, unknown>>;
};

/**
 * A key-value version of Promise.allSettled, meant for slightly more clear usage with
 * many operations in parallel.
 */
export async function namedAllSettled<T extends BasePromiseMap>(
  mapping: T,
  unwrap?: false,
): Promise<NamedSettledResult<T>>;

/**
 * safe shortcut for the following code:
 * ```js
 * const result = await namedAllSettled({ one: someOperation(1), two: someOperation(2) });
 * if(Object.keys(result.fails).length > 0) {
 *   throw result.fails;
 * }
 * const { one, two } = result.successes as Required<typeof result.successes>
 * ```
 */
export async function namedAllSettled<T extends BasePromiseMap>(
  mapping: T,
  unwrap: true,
): Promise<ResolvedPromisesMap<T>>;

export async function namedAllSettled<T extends BasePromiseMap>(
  mapping: T,
  unwrap?: boolean,
): Promise<any> {
  const names: string[] = [];
  const promises: Promise<any>[] = [];

  for (const [name, promise] of Object.entries(mapping)) {
    names.push(name);
    promises.push(promise);
  }

  const results = await Promise.allSettled(promises);
  const ret: NamedSettledResult<any> = {
    successes: {},
    fails: {},
  };

  for (let i = 0; i < results.length; i++) {
    const toCheck = results[i]!;
    const name = names[i]!;
    if (toCheck.status === "fulfilled") {
      ret.successes[name] = toCheck.value;
    } else {
      ret.fails[name] = toCheck.reason;
    }
  }

  if (!unwrap) {
    return ret;
  }

  if (isEmptyRecord(ret.fails)) {
    return ret.successes;
  }

  throw ret.fails;
}

type WithRetryOptions = {
  /**
   * number to use as the base for the computation (measured in milliseconds)
   * of waiting between retries.
   * @default 100
   */
  backoffBaseMs: number;
  /**
   * how many retries to do before "giving up".
   * @default 3
   */
  retries: number;
  /**
   * add a timeout to each operation, in milliseconds.
   * @default Math.MAX_SAFE_INTEGER
   */
  timeoutOperation: number;
  /**
   * a factor for the jitter, so that the jitter is a random number
   * between [-jitterFactor, jitterFactor].
   * @default 1
   */
  jitterFactor: number;
  /**
   * which type of backoff to do.
   * @default "exponential"
   */
  retryType: "linear" | "exponential";
};

/**
 * add retry mechanism to any function.
 * @example
 * ```ts
 * // flaky-function.ts
 * async function someFlakyFunctionInternal(n: number) {
 *  await delay(Math.random() * 1000);
 *  if(Math.random() > 0.5) {
 *   throw new Error("random error");
 *  }
 *  return n;
 * }
 * export const someFlakyFunction = withRetry(someFlakyFunctionInternal, {
 *  timeoutOperation: 500,
 * });
 * // index.ts
 * import { someFlakyFunction } from "./flaky-function";
 * for (let i = 0; i < 10; i++) {
 *  try {
 *    console.log(await someFlakyFunction(i));
 *  } catch(e) {
 *    console.error(e);
 *  }
 * }
 * ```
 */
export function withRetry<F extends (...params: any[]) => Promise<any>>(
  func: F,
  options?: Partial<WithRetryOptions>,
): F {
  const { backoffBaseMs, retries, timeoutOperation, jitterFactor, retryType } =
    {
      backoffBaseMs: 100,
      retries: 3,
      jitterFactor: 1,
      timeoutOperation: Number.MAX_SAFE_INTEGER,
      retryType: "exponential" as "exponential",
      ...(options || {}),
    };
  const retryFunc =
    retryType === "exponential"
      ? (attempt: number) => backoffBaseMs * 2 ** (attempt - 1)
      : (attempt: number) => backoffBaseMs * attempt;

  return (async (...params: any[]) => {
    let lastError: any = null;

    for (let currentAttempt = 1; currentAttempt <= retries; currentAttempt++) {
      try {
        const res = await runTimeout(func(...params), timeoutOperation);
        return res;
      } catch (e) {
        if (e instanceof StopRetryError) {
          // todo - maybe just return null?
          throw e;
        }
        // probably an issue
        if (!(e instanceof Error)) {
          throw e;
        }
        lastError = e;
        const jitter = jitterFactor * (Math.random() - 0.5) * 2;
        const baseline = retryFunc(currentAttempt);
        await delay(Math.max(baseline + jitter, 1));
      }
    }
    throw lastError;
  }) as F;
}

/**
 * Adds an abort option to any promise.
 * best to be used with "safePromiseWrapper".
 * @example
 * ```ts
 * const controller = new AbortController();
 * const promise = safePromiseWrapper(runAbortable(delay(2000).then(() => 42), controller.signal));
 * controller.abort();
 * const promiseInfo = await promise;
 * if(promiseInfo.hasError) { // always true here
 *   console.error(promiseInfo.error);
 * }
 * ```
 */
export function runAbortable<F extends Promise<any>>(
  func: F,
  signal: AbortSignal,
): Promise<Awaited<F>> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason);
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort);

    func
      .then(resolve)
      .catch(reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/**
 * adds a timeout to any promise.
 * similar to `runAbortable`.
 */
export async function runTimeout<F extends Promise<any>>(
  func: F,
  timeout: number,
) {
  if (timeout < 0 || timeout >= Number.MAX_SAFE_INTEGER) {
    return func;
  }
  if (!Number.isFinite(timeout)) {
    return func;
  }
  const controller = new AbortController();
  const error = new Error("Operation Timed Out", { cause: timeout });
  const processId = setTimeout(() => {
    error.name = "TimeoutError";
    controller.abort(error);
  }, timeout);

  try {
    return await runAbortable(func, controller.signal);
  } finally {
    clearTimeout(processId);
  }
}

import type { ArrayMember } from "../type-helpers";
import { type SafeWrapperResult, safePromiseWrapper } from "./async";
import { asyncGeneratorReduce } from "./generators";

type Sliceable<T> = {
  slice: (start: number, end?: number) => T;
  length: number;
};

/**
 * slice an array-like into chunks, optimized for high volume inputs.
 * each chunk has upto "size" length.
 * the order of the array is maintained.
 */
export function* chunkGenerator<T extends Sliceable<T>>(arr: T, size: number) {
  checkNumber(size);

  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

/**
 * same as chunkGenerator, but yield an array instead of a generator.
 * its for convenience-over-optimization results.
 */
export function chunkArr<T extends Sliceable<T>>(arr: T, size: number) {
  return Array.from(chunkGenerator(arr, size));
}

/**
 * run async operation on each chunk.
 */
export async function* chunkOperationGenerator<
  T extends Sliceable<T>,
  F extends (x: T) => Promise<any>,
>(
  inputs: T,
  size: number,
  func: F,
): AsyncGenerator<SafeWrapperResult<ReturnType<F>>> {
  for (const chunk of chunkGenerator(inputs, size)) {
    yield safePromiseWrapper(func(chunk));
  }
}

/**
 * run async operation of each member of an array, similar to Promise.allSettled
 * but built for extremely large arrays where you need to locally limit
 * the amount of promises run at once.
 */
export async function* chunkOperationGeneratorSingle<
  T extends any[],
  F extends (x: ArrayMember<T>) => Promise<any>,
>(
  inputs: T,
  size: number,
  func: F,
): AsyncGenerator<SafeWrapperResult<ReturnType<F>>> {
  for (const chunk of chunkGenerator(inputs as any[], size)) {
    const chunkResult = await Promise.all(
      chunk.map((x) => safePromiseWrapper(func(x))),
    );
    for (const result of chunkResult) {
      yield result;
    }
  }
}

/**
 * same as "chunkOperationGenerator", but aggregate the result into array.
 * mostly useful for reducing boilerplate.
 */
export async function chunkOperationArr<
  T extends Sliceable<T>,
  F extends (x: T) => Promise<any>,
>(inputs: T, size: number, func: F) {
  return asyncGeneratorReduce(
    chunkOperationGenerator(inputs, size, func),
    (p, c) => {
      p.push(c);
      return p;
    },
    [] as SafeWrapperResult<ReturnType<F>>[],
  );
}

type AvailableStrategies = "repeat" | "swallow" | "stop";

/**
 * slice an array into chunks with varying sizes.
 */
export function chunkMultiSizes<T extends Sliceable<T>>(
  arr: T,
  sizes: number[],
  strategy: AvailableStrategies = "repeat",
) {
  const sizesSafe = sizes.map(checkNumber);
  switch (strategy) {
    case "repeat":
      return chunkRepeat(arr, sizesSafe);
    case "swallow":
      return chunkSwallow(arr, sizesSafe);
    case "stop":
      return chunkStop(arr, sizesSafe);
  }
}

function* chunkRepeat<T extends Sliceable<T>>(arr: T, sizes: number[]) {
  let current = 0;
  outer: while (current < arr.length) {
    for (const size of sizes) {
      if (current >= arr.length) {
        break outer;
      }
      yield arr.slice(current, current + size);
      current += size;
    }
  }
}

function* chunkStop<T extends Sliceable<T>>(arr: T, sizes: number[]) {
  let current = 0;
  for (const size of sizes) {
    const r = arr.slice(current, current + size);
    if (r.length > 0) {
      yield r;
    } else {
      break;
    }
    current += size;
  }
}

function* chunkSwallow<T extends Sliceable<T>>(arr: T, sizes: number[]) {
  yield* chunkStop(arr, sizes);
  const sum = sizes.reduce((p, c) => p + c, 0);
  if (sum < arr.length) {
    yield arr.slice(sum);
  }
}

/**
 * simple utility to check if n is a positive integer
 */
function checkNumber(n: number) {
  if (typeof n !== "number") {
    throw new Error("Not a number", { cause: n });
  }

  if (n < 0) {
    throw new Error("Cant use negative number", { cause: n });
  }

  if (n % 1 !== 0) {
    throw new Error("Cant use non-integer number", { cause: n });
  }

  return n;
}

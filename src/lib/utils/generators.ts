type InferIterable<T extends Iterable<any>> = T extends Iterable<infer K>
  ? K
  : never;

type InferAsyncIterable<T extends AsyncIterable<any>> = T extends AsyncIterable<
  infer K
>
  ? K
  : never;

/**
 * adds a step to every iteration over an iterator.
 * @example
 * ```ts
 * for(const {step, val} of enumerate(someIterator)) {
 *  console.log(step, val);
 * }
 * ```
 */
export function* enumerate<T extends Iterable<any>>(
  iterable: T,
): Generator<{ step: number; val: InferIterable<T> }> {
  let current = 1;
  for (const val of iterable) {
    yield { step: current++, val };
  }
}

/**
 * same as enumerate, but works on async iterators.
 */
export async function* enumerateAsync<T extends AsyncIterable<any>>(
  iterable: T,
): AsyncGenerator<{ step: number; val: InferAsyncIterable<T> }> {
  let current = 1;
  for await (const val of iterable) {
    yield { step: current++, val };
  }
}

/**
 * similar to Array.map but works on any iterable.
 * can be used as memory efficient map in extreme cases.
 * @example
 * ```js
 * const arr = Array.from({length: 1000}, (_, i) => i);
 * const step1 = generatorMap(arr, (x) => x * 2);
 * const step2 = generatorMap(step1, (x) => x ** 2);
 * const result = Array.from(step2);
 * ```
 */
export function* generatorMap<
  G extends Iterable<any>,
  F extends (input: InferIterable<G>) => any,
>(generator: G, func: F): Generator<ReturnType<F>> {
  for (const input of generator) {
    yield func(input);
  }
}

export async function* asyncGeneratorMap<
  G extends AsyncIterable<any>,
  F extends (input: InferAsyncIterable<G>) => any,
>(generator: G, func: F) {
  for await (const input of generator) {
    yield func(input);
  }
}

/**
 * similar to Array.reduce but works on any iterable.
 */
export function generatorReduce<
  G extends Iterable<any>,
  A,
  T extends InferIterable<G>,
>(generator: G, func: (previous: A, current: T) => A, initial: A) {
  let currentStage = initial;
  for (const current of generator) {
    currentStage = func(currentStage, current);
  }
  return currentStage;
}

/**
 * similar to Array.reduce but works on any async iterable.
 */
export async function asyncGeneratorReduce<
  G extends AsyncIterable<any>,
  A,
  T extends InferAsyncIterable<G>,
>(generator: G, func: (previous: A, current: T) => Promise<A> | A, initial: A) {
  let currentStage = initial;
  for await (const current of generator) {
    currentStage = await func(currentStage, current);
  }
  return currentStage;
}

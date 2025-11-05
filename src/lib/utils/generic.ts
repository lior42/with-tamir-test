/**
 * adds a small delay with an optional abort signal.
 * @example
 * ```ts
 * for(let i = 0; i < 10; i++) {
 *  await delay(1000);
 *  console.log("tick");
 * }
 * ```
 */
export function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((res, rej) => {
    let key: any = -1;
    const aborter = () => {
      clearTimeout(key);
      rej(signal?.reason);
    };
    if (signal?.aborted) {
      aborter();
      return;
    }

    signal?.addEventListener("abort", aborter, { once: true });

    key = setTimeout(res, ms);
  });
}

class IntervalProvider implements AsyncIterator<void>, AsyncIterable<void> {
  #signal?: AbortSignal;
  #time: number;

  constructor(time: number, signal?: AbortSignal) {
    this.#time = time;
    this.#signal = signal;
  }

  [Symbol.asyncIterator](): AsyncIterator<void, any, any> {
    return this;
  }

  async next(): Promise<IteratorResult<void, any>> {
    await delay(this.#time, this.#signal);
    return {
      done: this.#signal?.aborted || false,
      value: undefined,
    };
  }
}

/**
 * create an interval that runs in an async loop, mostly useful for data polling.
 * @example
 * ```ts
 * try {
 *  for await (const _ of createIntervalLoop(500, AbortSignal.timeout(10000))) {
 *    console.log("tick");
 *  }
 * } catch { // would throw an error when the signal is reached.
 *  console.log("done");
 * }
 * ```
 */
export function createIntervalLoop(ms: number, signal?: AbortSignal) {
  return new IntervalProvider(ms, signal);
}

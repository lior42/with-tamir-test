export type ArrayMember<T extends any[]> = T extends Array<infer K> ? K : never;

export type RecordKeyType<T extends Record<any, any>> = T extends Record<
  infer K,
  any
>
  ? K
  : never;

export type RecordValType<T extends Record<any, any>> = T extends Record<
  any,
  infer K
>
  ? K
  : never;

export type RemapRecord<T extends Record<any, any>, N> = {
  [K in keyof T]: N;
} & {};

import SuperJSON from "superjson";
import { ApolloSSRDataTransport } from "./ApolloRehydrateSymbols.js";
import type { RehydrationCache } from "./types.js";
import { registerLateInitializingQueue } from "./lateInitializingQueue.js";
import type { Cache, WatchQueryOptions } from "@apollo/client/index.js";
import invariant from "ts-invariant";
import { htmlEscapeJsonString } from "./htmlescape.js";

export type DataTransport<T> = Array<T> | { push(...args: T[]): void };

type DataToTransport = {
  rehydrate: RehydrationCache;
  results: Cache.WriteOptions[];
  backgroundQueries: WatchQueryOptions[];
};

/**
 * Returns a string of JavaScript that can be used to transport data to the client.
 */
export function transportDataToJS(data: DataToTransport) {
  const key = Symbol.keyFor(ApolloSSRDataTransport);
  return `(window[Symbol.for("${key}")] ??= []).push(${htmlEscapeJsonString(
    SuperJSON.stringify(data)
  )})`;
}

/**
 * Registers a lazy queue that will be filled with data by `transportDataToJS`.
 * All incoming data will be added either to the rehydration cache or the result cache.
 */
export function registerDataTransport({
  onRequestData,
  onRequestStarted,
  onRehydrate,
}: {
  onRequestData(options: Cache.WriteOptions): void;
  onRequestStarted(options: WatchQueryOptions): void;
  onRehydrate(rehydrate: RehydrationCache): void;
}) {
  registerLateInitializingQueue(ApolloSSRDataTransport, (data) => {
    const parsed = SuperJSON.deserialize<DataToTransport>(data);
    invariant.debug(`received data from the server:`, parsed);
    onRehydrate(parsed.rehydrate);
    for (const query of parsed.backgroundQueries) {
      onRequestStarted(query);
    }
    for (const result of parsed.results) {
      onRequestData(result);
    }
  });
}

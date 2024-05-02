import * as U from "@core/unknownutil";
import { type FeedEntry, isFeedEntry } from "./types.ts";

const KV_NAME = "GITHUB_STARRED" as const;

/**
 * Get the KV store
 */

export async function getFromKV() {
  const kv = await Deno.openKv();

  const { value } = await kv.get([KV_NAME]);

  return U.maybe(value, U.isArrayOf(isFeedEntry));
}

/**
 * Save the entries to KV store
 */
export async function saveToKV(entries: FeedEntry[]) {
  const kv = await Deno.openKv();

  await kv.set([KV_NAME], entries);
}

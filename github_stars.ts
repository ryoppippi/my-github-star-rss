import * as U from "@core/unknownutil";
import { type FeedEntry, isFeedEntry } from "./types.ts";
import { _ensureURL } from "./utils.ts";

/**
 * Fetch starred entries from the RSS feed
 * Return desc sorted entries
 */
export async function fetchStarredEntries(apiUrl: URL) {
  const res = await fetch(apiUrl);

  const json = await res.json();

  U.assert(json, U.isArrayOf(isFeedEntry));

  return json.map(({ full_name, html_url, description, created_at }) => ({
    full_name,
    html_url: _ensureURL(html_url).toString(),
    description,
    created_at,
  }));
}

/**
 * get new entries
 */
export function getNewEntries({ newEntries, oldEntries }: {
  newEntries: FeedEntry[];
  oldEntries: FeedEntry[] | undefined;
}) {
  if (U.isNullish(oldEntries)) {
    return newEntries;
  }

  /* get diff and extract new entries
  note that the diff in old part is ignored */
  const newSttarredEntries = newEntries.filter(
    (new_entry) =>
      !oldEntries.some((old_entry) =>
        old_entry.html_url === new_entry.html_url
      ),
  );

  return newSttarredEntries;
}

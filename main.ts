import * as U from "@core/unknownutil";
import { getOmnivoreClient, saveToOmnivore } from "./omnivore.ts";
import { getFromKV, saveToKV } from "./kv.ts";
import { _ensureURL } from "./utils.ts";
import { consola } from "consola";
import { fetchStarredEntries, getNewEntries } from "./github_stars.ts";

const GITHUB_USERNAME = U.ensure(Deno.env.get("GITHUB_USERNAME"), U.isString);
const API_URL = _ensureURL(
  Deno.env.get("API_URL") ??
    `https://api.github.com/users/${GITHUB_USERNAME}/starred`,
);

const OMNIVORE_BASE_URL = _ensureURL(
  Deno.env.get("OMNIVORE_BASE_URL") ??
    "https://api-prod.omnivore.app/api/graphql",
);
const OMNIVORE_API_KEY = Deno.env.get("OMNIVORE_API_KEY");

async function main() {
  const newEntries = await fetchStarredEntries(API_URL);
  const oldEntries = await getFromKV();

  const newStarredEntries = getNewEntries({ newEntries, oldEntries });

  if (newStarredEntries.length === 0) {
    consola.info("No new starred entries");
    return;
  }

  consola.info(`New starred entries: ${newStarredEntries.length}`);
  newStarredEntries.forEach((entry) => {
    consola.info(JSON.stringify(entry));
  });

  U.assert(OMNIVORE_BASE_URL, U.isInstanceOf(URL));
  U.assert(OMNIVORE_API_KEY, U.isString);
  const omnivore = getOmnivoreClient(OMNIVORE_BASE_URL, OMNIVORE_API_KEY);

  saveToOmnivore({ staredEntries: newStarredEntries, omnivore });
  consola.success("Successfully saved to Omnivore");

  await saveToKV(newEntries);
  consola.success("Successfully saved to KV");
}

Deno.cron(
  "Check new GITHUB STARS and Save to Omnivore",
  "0/10 * * * *",
  async () => {
    await main();
  },
);

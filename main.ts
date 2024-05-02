import * as U from "@core/unknownutil";
import { getOmnivoreClient, saveToOmnivore } from "./omnivore.ts";
import { getFromKV, saveToKV } from "./kv.ts";
import { _ensureURL } from "./utils.ts";
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

  console.log({
    message: "New starred entries",
    newStarredEntries,
  });

  U.assert(OMNIVORE_BASE_URL, U.isInstanceOf(URL));
  U.assert(OMNIVORE_API_KEY, U.isString);
  const omnivore = getOmnivoreClient(OMNIVORE_BASE_URL, OMNIVORE_API_KEY);

  saveToOmnivore({ staredEntries: newStarredEntries, omnivore });

  await saveToKV(newEntries);
}

Deno.cron(
  "Check new GITHUB STARS and Save to Omnivore",
  "0/5 * * * *",
  async () => {
    await main();
  },
);

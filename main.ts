import { Omnivore } from "@omnivore-app/api";
import * as U from "@core/unknownutil";

const GITHUB_USERNAME = U.ensure(Deno.env.get("GITHUB_USERNAME"), U.isString);
const API_URL = _ensureURL(
  Deno.env.get("API_URL") ??
    `https://api.github.com/users/${GITHUB_USERNAME}/starred`,
);

const KV_NAME = "GITHUB_STARRED" as const;

const OMNIVORE_BASE_URL = _ensureURL(
  Deno.env.get("OMNIVORE_BASE_URL") ??
    "https://api-prod.omnivore.app/api/graphql",
);
const OMNIVORE_API_KEY = Deno.env.get("OMNIVORE_API_KEY");

const isFeedEntry = U.isObjectOf({
  full_name: U.isString,
  html_url: U.isString,
  description: U.isUnionOf([U.isNullish, U.isString]),
  created_at: U.isString,
});

type FeedEntry = U.PredicateType<typeof isFeedEntry>;

function _ensureURL(url: string) {
  // return U.ensure(URL.parse(url), U.isInstanceOf(URL));
  return U.ensure(new URL(url), U.isInstanceOf(URL));
}

/**
 * Fetch starred entries from the RSS feed
 * Return desc sorted entries
 */
async function fetchStarredEntries() {
  const res = await fetch(API_URL);

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
 * Get the KV store
 */

async function getKV() {
  const kv = await Deno.openKv();

  const { value } = await kv.get([KV_NAME]);

  return U.maybe(value, U.isArrayOf(isFeedEntry));
}

/**
 * Save the entries to KV store
 */
async function saveToKV(entries: FeedEntry[]) {
  const kv = await Deno.openKv();

  await kv.set([KV_NAME], entries);
}

/**
 * get new entries
 */
function getNewEntries({ newEntries, oldEntries }: {
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

/**
 * Get the Omnivore client
 */
function getOmnivoreClient() {
  U.assert(OMNIVORE_BASE_URL, U.isInstanceOf(URL));
  U.assert(OMNIVORE_API_KEY, U.isString);

  return new Omnivore({
    baseUrl: OMNIVORE_BASE_URL?.toString(),
    apiKey: OMNIVORE_API_KEY,
  });
}

function guessTags(entry: FeedEntry) {
  const { html_url: url, description: desc } = entry;
  const ldesc = desc?.toLowerCase();
  const lurl = url.toLowerCase();

  const includesWord = (...words: string[]) =>
    words.some((word) => ldesc?.includes(word) || lurl.includes(word));

  const tagMap = [
    { keywords: ["javascript", "typescript", ".js", ".ts"], tag: "javascript" },
    { keywords: ["vim", "nvim", "neovim"], tag: "vim" },
    { keywords: ["openai"], tag: "ai" },
    { keywords: ["llm"], tag: "ai" },
    { keywords: ["python", ".py"], tag: "python" },
    { keywords: ["zig"], tag: "zig" },
    { keywords: ["cloudflare"], tag: "Cloudflare" },
    { keywords: ["rust", ".rs"], tag: "rust" },
    { keywords: ["deno"], tag: "deno" },
    { keywords: [".go"], tag: "golang" },
    { keywords: ["svelte"], tag: "svelte" },
    { keywords: ["react"], tag: "react" },
  ] as const satisfies Array<{ keywords: string[]; tag: string }>;

  return tagMap
    .filter(({ keywords }) => includesWord(...keywords))
    .map(({ tag }) => ({
      name: tag,
      color: null,
      description: null,
    }));
}

async function saveToOmnivore({ staredEntries, omnivore }: {
  staredEntries: Awaited<ReturnType<typeof fetchStarredEntries>>;
  omnivore: ReturnType<typeof getOmnivoreClient>;
}) {
  const now = (new Date()).toString();
  staredEntries.forEach(async (entry) => {
    await omnivore.items.saveByUrl({
      url: entry.html_url,
      timezone: "BST",
      publishedAt: entry.created_at,
      savedAt: now,
      labels: [
        { name: "github-starred", color: null, description: null },
        ...guessTags(entry),
      ],
    });
  });
}

async function main() {
  const newEntries = await fetchStarredEntries();
  const oldEntries = await getKV();

  const newStarredEntries = getNewEntries({ newEntries, oldEntries });

  console.log({
    message: "New starred entries",
    newStarredEntries,
  });

  const omnivore = getOmnivoreClient();

  await saveToOmnivore({ staredEntries: newStarredEntries, omnivore });

  await saveToKV(newEntries);
}

Deno.cron(
  "Check new GITHUB STARS and Save to Omnivore",
  "0/15 * * * *",
  async () => {
    await main();
  },
);

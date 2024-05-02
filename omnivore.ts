import { Omnivore } from "@omnivore-app/api";
import { type FeedEntry } from "./types.ts";

/** Map of keywords to tags */
const TAG_MAP = [
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

/**
 * Get the Omnivore client
 */
export function getOmnivoreClient(baseUrl: URL, apiKey: string) {
  return new Omnivore({
    baseUrl: baseUrl.toString(),
    apiKey,
  });
}

function guessTags(entry: FeedEntry) {
  const { html_url: url, description: desc } = entry;
  const ldesc = desc?.toLowerCase();
  const lurl = url.toLowerCase();

  const includesWord = (...words: string[]) =>
    words.some((word) => ldesc?.includes(word) || lurl.includes(word));

  return TAG_MAP
    .filter(({ keywords }) => includesWord(...keywords))
    .map(({ tag }) => ({
      name: tag,
      color: null,
      description: null,
    }));
}

/**
 * Save the entries to Omnivore
 */
export function saveToOmnivore({ staredEntries, omnivore }: {
  staredEntries: FeedEntry[];
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

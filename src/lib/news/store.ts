import Parser from "rss-parser";
import { feeds, type FeedConfig } from "./feeds";
import {
  normalizeArticle,
  type NormalizedArticle,
  type RawFeedItem,
} from "./normalize";

export const WINDOW_HOURS = 48;

// Serverless instances don't share memory, so each feed response is
// cached by Next's fetch cache instead.
const REVALIDATE_SECONDS = 600;

const parser = new Parser();

export type NewsSnapshot = {
  articles: NormalizedArticle[];
  fetchedAt: Date;
  failedFeeds: number;
};

async function fetchFeed(feed: FeedConfig): Promise<NormalizedArticle[]> {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "BrieflyPersonalReader/0.1 (RSS reader)",
      Accept:
        "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();

  if (xml.length > 5_000_000) {
    throw new Error("Feed exceeds the 5 MB size limit");
  }

  const parsed = await parser.parseString(xml);

  return (parsed.items as RawFeedItem[])
    .map((item) => normalizeArticle(item, feed))
    .filter((item) => item !== null);
}

// Keep only dated articles inside the window, deduplicated by URL,
// newest first.
export function filterRecent(
  articles: NormalizedArticle[],
  now: Date,
  hours = WINDOW_HOURS,
): NormalizedArticle[] {
  const cutoff = now.getTime() - hours * 3_600_000;
  const byUrl = new Map<string, NormalizedArticle>();

  for (const article of articles) {
    const time = article.publishedAt?.getTime();
    if (time === undefined || time < cutoff) continue;
    if (!byUrl.has(article.url)) byUrl.set(article.url, article);
  }

  return [...byUrl.values()].sort(
    (a, b) => b.publishedAt!.getTime() - a.publishedAt!.getTime(),
  );
}

export async function getNews(): Promise<NewsSnapshot> {
  const results = await Promise.allSettled(feeds.map(fetchFeed));

  const collected: NormalizedArticle[] = [];
  let failedFeeds = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      collected.push(...result.value);
    } else {
      failedFeeds++;
      console.error(
        `Feed failed (${feeds[index]!.url}):`,
        result.reason instanceof Error
          ? result.reason.message
          : result.reason,
      );
    }
  });

  const now = new Date();

  return {
    articles: filterRecent(collected, now),
    fetchedAt: now,
    failedFeeds,
  };
}

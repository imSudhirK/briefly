
import type { FeedConfig } from "./feeds";

export type RawFeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
};

export type NormalizedArticle = {
  title: string;
  description: string | null;
  url: string;
  source: string;
  category: string;
  region: string;
  publishedAt: Date | null;
};

function cleanText(value?: string): string | null {
  if (!value) return null;

  // Remove markup before storing RSS summaries as plain text.
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function safeArticleUrl(value: string): string | null {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase();

    if (
      host !== "indianexpress.com" &&
      !host.endsWith(".indianexpress.com")
    ) {
      return null;
    }

    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeArticle(
  item: RawFeedItem,
  feed: FeedConfig,
): NormalizedArticle | null {
  const title = cleanText(item.title);
  const url = item.link ? safeArticleUrl(item.link) : null;

  // A valid headline and an allowed original article URL are required.
  if (!title || !url) return null;

  const rawDate = item.isoDate ?? item.pubDate;
  const parsedDate = rawDate ? new Date(rawDate) : null;

  const publishedAt =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate
      : null;

  return {
    title,
    description: cleanText(
      item.contentSnippet ?? item.summary ?? item.content,
    ),
    url,
    source: feed.name,
    category: feed.category,
    region: feed.region,
    publishedAt,
  };
}

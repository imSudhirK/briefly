
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
  mediaThumbnail?: { $?: { url?: string }; url?: string } | string;
  mediaContent?:
    | Array<{ $?: { url?: string; medium?: string }; url?: string }>
    | { $?: { url?: string; medium?: string }; url?: string };
  enclosure?: { url?: string; type?: string };
  contentEncoded?: string;
  [key: string]: unknown;
};

export type NormalizedArticle = {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
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

export function safeImageUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    if (url.protocol === "http:") {
      url.protocol = "https:";
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function extractImageUrl(item: RawFeedItem): string | null {
  // 1. media:thumbnail
  const thumb = item.mediaThumbnail;
  if (thumb) {
    if (typeof thumb === "string") {
      const safe = safeImageUrl(thumb);
      if (safe) return safe;
    } else if (thumb.$?.url) {
      const safe = safeImageUrl(thumb.$.url);
      if (safe) return safe;
    } else if (thumb.url) {
      const safe = safeImageUrl(thumb.url);
      if (safe) return safe;
    }
  }

  // 2. media:content
  const mediaContent = item.mediaContent;
  if (Array.isArray(mediaContent)) {
    for (const m of mediaContent) {
      const url = m?.$?.url ?? m?.url;
      if (url && (m?.$?.medium === "image" || !m?.$?.medium)) {
        const safe = safeImageUrl(url);
        if (safe) return safe;
      }
    }
  } else if (mediaContent) {
    const url = mediaContent?.$?.url ?? mediaContent?.url;
    if (url) {
      const safe = safeImageUrl(url);
      if (safe) return safe;
    }
  }

  // 3. enclosure
  if (item.enclosure?.url) {
    const encType = item.enclosure.type ?? "";
    if (
      encType.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(item.enclosure.url)
    ) {
      const safe = safeImageUrl(item.enclosure.url);
      if (safe) return safe;
    }
  }

  // 4. Embedded HTML <img> tag in content, summary, or snippet
  const htmlCandidates = [
    item.contentEncoded,
    item.content,
    item.summary,
    item.contentSnippet,
  ];
  for (const html of htmlCandidates) {
    if (!html) continue;
    const match = html.match(/<img[^>]+src=["'](https?:\/\/[^"'>\s]+)["']/i);
    if (match && match[1]) {
      const safe = safeImageUrl(match[1]);
      if (safe) return safe;
    }
  }

  return null;
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
    imageUrl: extractImageUrl(item),
    source: feed.name,
    category: feed.category,
    region: feed.region,
    publishedAt,
  };
}

import { describe, expect, test } from "bun:test";
import type { NormalizedArticle } from "./normalize";
import { filterRecent } from "./store";

const now = new Date("2026-10-19T12:00:00Z");

function article(
  url: string,
  publishedAt: string | null,
): NormalizedArticle {
  return {
    title: url,
    description: null,
    url,
    source: "The Indian Express",
    category: "india",
    region: "india",
    publishedAt: publishedAt ? new Date(publishedAt) : null,
  };
}

describe("filterRecent", () => {
  test("keeps only articles from the last 48 hours", () => {
    const result = filterRecent(
      [
        article("https://a/1", "2026-10-19T11:00:00Z"),
        article("https://a/2", "2026-10-17T12:00:00Z"),
        article("https://a/3", "2026-10-17T11:59:59Z"),
      ],
      now,
    );

    expect(result.map((a) => a.url)).toEqual([
      "https://a/1",
      "https://a/2",
    ]);
  });

  test("drops articles without a publication date", () => {
    expect(filterRecent([article("https://a/1", null)], now)).toEqual([]);
  });

  test("deduplicates by URL and sorts newest first", () => {
    const result = filterRecent(
      [
        article("https://a/old", "2026-10-18T09:00:00Z"),
        article("https://a/new", "2026-10-19T09:00:00Z"),
        article("https://a/old", "2026-10-18T09:00:00Z"),
      ],
      now,
    );

    expect(result.map((a) => a.url)).toEqual([
      "https://a/new",
      "https://a/old",
    ]);
  });
});

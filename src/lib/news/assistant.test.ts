import { describe, expect, test } from "bun:test";
import {
  askNewsAssistant,
  rankRelevantArticles,
  toCitedSources,
} from "./assistant";
import type { NormalizedArticle } from "./normalize";

function makeArticle(
  title: string,
  category: string,
  description: string | null = null,
  publishedAt: string | null = "2026-10-19T10:00:00Z",
): NormalizedArticle {
  return {
    title,
    description,
    url: `https://indianexpress.com/article/${encodeURIComponent(title)}/`,
    imageUrl: "https://images.indianexpress.com/thumb.jpg",
    source: "The Indian Express",
    category,
    region: category === "world" ? "world" : "india",
    publishedAt: publishedAt ? new Date(publishedAt) : null,
  };
}

const mockArticles: NormalizedArticle[] = [
  makeArticle(
    "Elon Musk says comments on Reliance were misunderstood",
    "business",
    "Musk discussed the recent telecommunications and Starlink rollout in India.",
  ),
  makeArticle(
    "New quantum computing breakthrough announced by Indian scientists",
    "technology",
    "Quantum coherence time extended past previous limits.",
  ),
  makeArticle(
    "Supreme court hears petition on Andhra civic polls violence",
    "india",
    "Political parties argue over safety and election security.",
  ),
  makeArticle(
    "France protests escalate as university students join demonstrations",
    "world",
    "Streets of Paris see major youth rallies regarding education reforms.",
  ),
  makeArticle(
    "Sensex rises 400 points as foreign investors return to banking stocks",
    "business",
    "Markets ended in green following upbeat quarterly earnings.",
  ),
];

describe("rankRelevantArticles", () => {
  test("ranks articles by keyword match in title and description", () => {
    const results = rankRelevantArticles("Elon Musk Starlink", mockArticles, 3);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.title).toContain("Elon Musk");
  });

  test("ranks category-aligned articles when query mentions topic", () => {
    const results = rankRelevantArticles("technology and quantum", mockArticles, 2);

    expect(results[0]?.category).toBe("technology");
    expect(results[0]?.title).toContain("quantum");
  });

  test("respects the limit parameter", () => {
    const results = rankRelevantArticles("news", mockArticles, 2);
    expect(results.length).toBe(2);
  });

  test("handles empty articles list without throwing", () => {
    const results = rankRelevantArticles("test query", [], 5);
    expect(results).toEqual([]);
  });
});

describe("toCitedSources", () => {
  test("formats articles into clean cited sources", () => {
    const sources = toCitedSources([mockArticles[0]!]);

    expect(sources.length).toBe(1);
    expect(sources[0]?.title).toBe(mockArticles[0]?.title);
    expect(sources[0]?.url).toBe(mockArticles[0]?.url);
    expect(sources[0]?.category).toBe("business");
    expect(sources[0]?.publishedAt).toBe("2026-10-19T10:00:00.000Z");
  });
});

describe("askNewsAssistant", () => {
  test("returns empty query prompt when message is whitespace", async () => {
    const res = await askNewsAssistant({
      message: "   ",
      articles: mockArticles,
    });

    expect(res.answer).toContain("Please ask a question");
    expect(res.sources).toEqual([]);
  });

  test("returns local fallback summary when GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await askNewsAssistant({
        message: "What happened with Elon Musk?",
        articles: mockArticles,
      });

      expect(res.hasApiKey).toBe(false);
      expect(res.answer).toContain("Elon Musk");
      expect(res.sources.length).toBeGreaterThan(0);
      expect(res.sources[0]?.title).toContain("Elon Musk");
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });
});

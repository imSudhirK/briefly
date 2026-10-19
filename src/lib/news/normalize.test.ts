
import { describe, expect, test } from "bun:test";
import { feeds } from "./feeds";
import { normalizeArticle } from "./normalize";

const feed = feeds[0]!;

describe("normalizeArticle", () => {
  test("normalizes a valid article", () => {
    const article = normalizeArticle(
      {
        title: "  Example headline  ",
        link: "https://indianexpress.com/article/example/#comments",
        pubDate: "Mon, 19 Oct 2026 10:00:00 GMT",
        contentSnippet: "An &amp; important story",
      },
      feed,
    );

    expect(article).not.toBeNull();
    expect(article?.title).toBe("Example headline");
    expect(article?.url).toBe(
      "https://indianexpress.com/article/example/",
    );
    expect(article?.description).toBe("An & important story");
    expect(article?.category).toBe("india");
    expect(article?.region).toBe("india");
    expect(article?.publishedAt?.toISOString()).toBe(
      "2026-10-19T10:00:00.000Z",
    );
  });

  test("rejects a non-HTTPS article URL", () => {
    expect(
      normalizeArticle(
        {
          title: "Unsafe URL",
          link: "http://indianexpress.com/article/example",
        },
        feed,
      ),
    ).toBeNull();
  });

  test("rejects URLs from unrelated domains", () => {
    expect(
      normalizeArticle(
        {
          title: "Unexpected domain",
          link: "https://example.org/article",
        },
        feed,
      ),
    ).toBeNull();
  });

  test("rejects articles without a title or valid URL", () => {
    expect(normalizeArticle({ link: "https://indianexpress.com/" }, feed))
      .toBeNull();

    expect(normalizeArticle({ title: "Missing link" }, feed)).toBeNull();
  });

  test("handles missing or invalid publication dates", () => {
    const article = normalizeArticle(
      {
        title: "Article without a valid date",
        link: "https://indianexpress.com/article/example",
        pubDate: "not-a-date",
      },
      feed,
    );

    expect(article?.publishedAt).toBeNull();
  });
});

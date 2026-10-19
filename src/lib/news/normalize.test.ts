
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

  test("extracts image URL from mediaThumbnail", () => {
    const article = normalizeArticle(
      {
        title: "Article with thumbnail",
        link: "https://indianexpress.com/article/example",
        mediaThumbnail: {
          $: { url: "https://images.indianexpress.com/2026/10/photo.jpg" },
        },
      },
      feed,
    );

    expect(article?.imageUrl).toBe(
      "https://images.indianexpress.com/2026/10/photo.jpg",
    );
  });

  test("extracts image URL from mediaContent", () => {
    const article = normalizeArticle(
      {
        title: "Article with media content",
        link: "https://indianexpress.com/article/example",
        mediaContent: [
          {
            $: {
              url: "https://images.indianexpress.com/2026/10/media.jpg",
              medium: "image",
            },
          },
        ],
      },
      feed,
    );

    expect(article?.imageUrl).toBe(
      "https://images.indianexpress.com/2026/10/media.jpg",
    );
  });

  test("extracts image URL from enclosure or embedded HTML", () => {
    const withEnclosure = normalizeArticle(
      {
        title: "Article with enclosure",
        link: "https://indianexpress.com/article/example-1",
        enclosure: {
          url: "https://images.indianexpress.com/2026/10/enc.jpg",
          type: "image/jpeg",
        },
      },
      feed,
    );
    expect(withEnclosure?.imageUrl).toBe(
      "https://images.indianexpress.com/2026/10/enc.jpg",
    );

    const withHtml = normalizeArticle(
      {
        title: "Article with HTML image",
        link: "https://indianexpress.com/article/example-2",
        content:
          '<p>Text</p><img src="https://images.indianexpress.com/2026/10/html-img.png" alt="test" />',
      },
      feed,
    );
    expect(withHtml?.imageUrl).toBe(
      "https://images.indianexpress.com/2026/10/html-img.png",
    );
  });

  test("sets imageUrl to null when no image is available", () => {
    const article = normalizeArticle(
      {
        title: "Article without image",
        link: "https://indianexpress.com/article/example",
      },
      feed,
    );

    expect(article?.imageUrl).toBeNull();
  });
});

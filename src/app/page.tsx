
"use client";

import { useEffect, useRef, useState } from "react";

type Article = {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  source: string;
  category: string;
  publishedAt: string | null;
};

const categories = ["all", "india", "world", "technology", "business"];

function formatTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;

  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }

  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const feedSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      try {
        const response = await fetch("/api/news?limit=500");

        if (!response.ok) {
          throw new Error("The news API returned an error.");
        }

        const data = (await response.json()) as {
          articles: Article[];
          fetchedAt: string;
        };

        if (!cancelled) {
          setArticles(data.articles);
          setFetchedAt(data.fetchedAt);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not load the news. Please try again shortly."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadNews();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCategorySelect = (item: string) => {
    setCategory(item);
    setCurrentPage(1);
  };

  const handlePageSelect = (newPage: number) => {
    setCurrentPage(newPage);
    feedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const filteredArticles =
    category === "all"
      ? articles
      : articles.filter(
          (article) =>
            article.category.toLowerCase() === category.toLowerCase()
        );

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredArticles.length);
  const currentStories = filteredArticles.slice(startIndex, endIndex);

  return (
    <main className="page">
      <header className="header">
        <a className="brand" href="/">briefly<span>.</span></a>
        <span className="header-note">Your personal newspaper</span>
      </header>

      <section className="hero">
        <p className="eyebrow">LESS NOISE. MORE CONTEXT.</p>
        <h1>Your world, <span>well read.</span></h1>
        <p className="intro">
          A quieter way to keep up with India, world affairs,
          technology and business.
        </p>

        <div className="chat-placeholder">
          <span aria-hidden="true">✳</span>
          <span>Ask your news assistant — coming soon</span>
        </div>
      </section>

      <section className="feed" ref={feedSectionRef}>
        <div className="feed-heading">
          <div>
            <p className="eyebrow">YOUR DAILY BRIEFING</p>
            <h2>Last 48 hours</h2>
          </div>
          <span className="story-count">
            {filteredArticles.length} stories
            {totalPages > 1 && ` · Page ${safePage} of ${totalPages}`}
            {fetchedAt &&
              ` · Updated ${new Date(fetchedAt).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
              })}`}
          </span>
        </div>

        <nav className="filters" aria-label="Filter news">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "filter active" : "filter"}
              onClick={() => handleCategorySelect(item)}
            >
              {item === "all"
                ? "All stories"
                : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>

        {loading && <p className="message">Loading your briefing…</p>}
        {!loading && error && <p className="message error">{error}</p>}

        {!loading && !error && filteredArticles.length === 0 && (
          <p className="message">
            No stories in this category yet. Try another filter.
          </p>
        )}

        <div className="story-list">
          {currentStories.map((article) => (
            <article className="story" key={article.url}>
              <div
                className={`story-layout ${
                  article.imageUrl ? "has-image" : "no-image"
                }`}
              >
                <div className="story-body">
                  <div className="story-meta">
                    <span className="category">
                      {article.category}
                    </span>
                    <span className="meta-sep" aria-hidden="true">·</span>
                    <span className="source">{article.source}</span>
                    {article.publishedAt && (
                      <>
                        <span className="meta-sep" aria-hidden="true">·</span>
                        <time dateTime={article.publishedAt}>
                          {formatTime(article.publishedAt)}
                        </time>
                      </>
                    )}
                  </div>

                  <h3 className="headline">
                    <a href={article.url} target="_blank" rel="noreferrer">
                      {article.title}
                    </a>
                  </h3>

                  {article.description && (
                    <p className="description">{article.description}</p>
                  )}

                  <div className="story-footer">
                    <a
                      className="read-link"
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read original article ↗
                    </a>
                  </div>
                </div>

                {article.imageUrl && (
                  <div className="story-media">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="media-link"
                    >
                      <img
                        src={article.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const container = e.currentTarget.closest(".story-media");
                          if (container) {
                            (container as HTMLElement).style.display = "none";
                          }
                        }}
                      />
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {!loading && !error && totalPages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            <div className="pagination-info">
              Showing <strong>{startIndex + 1}–{endIndex}</strong> of{" "}
              <strong>{filteredArticles.length}</strong> stories
            </div>

            <div className="pagination-bar">
              <button
                type="button"
                className="pagination-btn nav-btn"
                onClick={() => handlePageSelect(safePage - 1)}
                disabled={safePage <= 1}
                aria-label="Go to previous page"
              >
                ← Prev
              </button>

              <div className="pagination-pages">
                {getPageNumbers(safePage, totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="pagination-ellipsis"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`pagination-btn page-number ${
                        safePage === p ? "active" : ""
                      }`}
                      onClick={() => handlePageSelect(p as number)}
                      aria-label={`Page ${p}`}
                      aria-current={safePage === p ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className="pagination-btn nav-btn"
                onClick={() => handlePageSelect(safePage + 1)}
                disabled={safePage >= totalPages}
                aria-label="Go to next page"
              >
                Next →
              </button>
            </div>

            <div className="pagination-size">
              <span className="size-label">Per page:</span>
              {[10, 20, 50].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`size-btn ${pageSize === size ? "active" : ""}`}
                  onClick={() => handlePageSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </nav>
        )}
      </section>

      <footer>
        Briefly · Your news, without the noise.
      </footer>
    </main>
  );
}

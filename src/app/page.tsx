
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

function formatAssistantContent(content: string) {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    if (line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ")) {
      const cleanLine = line.replace(/^[•\-\*]\s*/, "");
      currentList.push(
        <li key={`li-${index}`} className="assistant-list-item">
          {formatInline(cleanLine)}
        </li>,
      );
    } else {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${index}`} className="assistant-list">
            {currentList}
          </ul>,
        );
        currentList = [];
      }
      elements.push(
        <p key={`p-${index}`} className="assistant-para">
          {formatInline(line)}
        </p>,
      );
    }
  });

  if (currentList.length > 0) {
    elements.push(
      <ul key="ul-end" className="assistant-list">
        {currentList}
      </ul>,
    );
  }

  return elements;
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

  // Assistant states
  const [assistantInput, setAssistantInput] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [assistantResult, setAssistantResult] = useState<{
    answer: string;
    sources: Array<{
      title: string;
      url: string;
      source: string;
      category: string;
      publishedAt: string | null;
      imageUrl: string | null;
    }>;
    hasApiKey: boolean;
  } | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantCardRef = useRef<HTMLDivElement>(null);

  const SUGGESTED_QUESTIONS = [
    "Top headlines right now",
    "Latest in Technology & AI",
    "Business & market highlights",
    "World affairs summary",
  ];

  const handleAskAssistant = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setAssistantLoading(true);
    setAssistantError("");
    setActiveQuestion(trimmed);
    setAssistantOpen(true);
    setAssistantInput("");

    setTimeout(() => {
      assistantCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 80);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        throw new Error("The assistant could not complete your request.");
      }

      const data = await response.json();
      setAssistantResult(data);
    } catch {
      setAssistantError("Could not reach the assistant. Please try again.");
    } finally {
      setAssistantLoading(false);
    }
  };

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

        <div className="assistant-widget">
          <form
            className="assistant-search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAskAssistant(assistantInput);
            }}
          >
            <span className="assistant-icon" aria-hidden="true">✳</span>
            <input
              type="text"
              className="assistant-input"
              placeholder="Ask anything about today's news…"
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              disabled={assistantLoading}
            />
            <button
              type="submit"
              className="assistant-submit-btn"
              disabled={!assistantInput.trim() || assistantLoading}
              aria-label="Ask assistant"
            >
              {assistantLoading ? "Thinking…" : "Ask ↵"}
            </button>
          </form>

          <div className="assistant-chips" aria-label="Suggested questions">
            <span className="chips-label">Try:</span>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className="chip-btn"
                onClick={() => void handleAskAssistant(q)}
                disabled={assistantLoading}
              >
                {q}
              </button>
            ))}
          </div>

          {assistantOpen && (
            <div className="assistant-card" ref={assistantCardRef}>
              <div className="assistant-card-header">
                <div className="assistant-query">
                  <span className="query-badge">Question</span>
                  <span className="query-text">{activeQuestion}</span>
                </div>
                <button
                  type="button"
                  className="assistant-close-btn"
                  onClick={() => {
                    setAssistantOpen(false);
                    setAssistantResult(null);
                    setAssistantError("");
                  }}
                  aria-label="Close assistant answer"
                >
                  ✕
                </button>
              </div>

              {assistantLoading && (
                <div className="assistant-loading">
                  <div className="pulse-loader" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>Searching today's news and synthesizing an editorial briefing…</p>
                </div>
              )}

              {!assistantLoading && assistantError && (
                <div className="assistant-error-box">
                  <p>{assistantError}</p>
                  <button
                    type="button"
                    className="retry-btn"
                    onClick={() => void handleAskAssistant(activeQuestion)}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!assistantLoading && assistantResult && (
                <div className="assistant-content">
                  <div className="assistant-answer">
                    {formatAssistantContent(assistantResult.answer)}
                  </div>

                  {assistantResult.sources.length > 0 && (
                    <div className="assistant-sources-section">
                      <h4 className="sources-title">
                        Stories referenced in this answer ({assistantResult.sources.length})
                      </h4>
                      <div className="sources-grid">
                        {assistantResult.sources.map((src) => (
                          <a
                            key={src.url}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="source-card"
                          >
                            {src.imageUrl && (
                              <div className="source-thumb">
                                <img
                                  src={src.imageUrl}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) parent.style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                            <div className="source-details">
                              <span className="source-category">{src.category}</span>
                              <h5 className="source-headline">{src.title}</h5>
                              <span className="source-meta">
                                {src.source} · Read story ↗
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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

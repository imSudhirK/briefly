
"use client";

import { useEffect, useState } from "react";

type Article = {
  title: string;
  description: string | null;
  url: string;
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

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState("all");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const filteredArticles =
    category === "all"
      ? articles
      : articles.filter(
          (article) =>
            article.category.toLowerCase() === category.toLowerCase()
        );

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

      <section className="feed">
        <div className="feed-heading">
          <div>
            <p className="eyebrow">YOUR DAILY BRIEFING</p>
            <h2>Last 48 hours</h2>
          </div>
          <span className="story-count">
            {filteredArticles.length} stories
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
              onClick={() => setCategory(item)}
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
          {filteredArticles.map((article) => (
            <article className="story" key={article.url}>
              <div className="story-meta">
                <span className="category">
                  {article.category}
                </span>
                <span>{article.source}</span>
                {article.publishedAt && (
                  <time dateTime={article.publishedAt}>
                    {formatTime(article.publishedAt)}
                  </time>
                )}
              </div>

              <h3>
                <a href={article.url} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
              </h3>

              {article.description && (
                <p className="description">{article.description}</p>
              )}

              <a
                className="read-link"
                href={article.url}
                target="_blank"
                rel="noreferrer"
              >
                Read original article ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <footer>
        Briefly · Your news, without the noise.
      </footer>
    </main>
  );
}

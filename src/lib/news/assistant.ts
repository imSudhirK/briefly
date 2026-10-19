import type { NormalizedArticle } from "./normalize";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CitedSource = {
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string | null;
  imageUrl: string | null;
};

export type AssistantResult = {
  answer: string;
  sources: CitedSource[];
  hasApiKey: boolean;
};

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an",
  "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
  "before", "being", "below", "between", "both", "but", "by", "can",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
  "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
  "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't",
  "having", "he", "her", "here", "hers", "herself", "him", "himself",
  "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "its",
  "itself", "just", "me", "more", "most", "my", "myself", "no", "nor",
  "not", "now", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
  "shouldn't", "so", "some", "such", "than", "that", "the", "their",
  "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "were", "weren't", "what", "when",
  "where", "which", "while", "who", "whom", "why", "with", "won't",
  "would", "wouldn't", "you", "your", "yours", "yourself", "yourselves",
  "tell", "news", "today", "latest", "summarize", "explain", "give", "brief"
]);

export function rankRelevantArticles(
  query: string,
  articles: NormalizedArticle[],
  limit = 6,
): NormalizedArticle[] {
  if (!articles || articles.length === 0) return [];

  const rawTokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const keywords = rawTokens.filter((t) => !STOP_WORDS.has(t));
  const tokens = keywords.length > 0 ? keywords : rawTokens;

  // Category intent detection
  const lowerQuery = query.toLowerCase();
  const categoryIntent: string[] = [];
  if (lowerQuery.includes("tech") || lowerQuery.includes("ai") || lowerQuery.includes("apple") || lowerQuery.includes("google") || lowerQuery.includes("software")) {
    categoryIntent.push("technology");
  }
  if (lowerQuery.includes("business") || lowerQuery.includes("market") || lowerQuery.includes("economy") || lowerQuery.includes("stock") || lowerQuery.includes("trade") || lowerQuery.includes("rupee") || lowerQuery.includes("dollar")) {
    categoryIntent.push("business");
  }
  if (lowerQuery.includes("world") || lowerQuery.includes("global") || lowerQuery.includes("international") || lowerQuery.includes("us") || lowerQuery.includes("war") || lowerQuery.includes("china")) {
    categoryIntent.push("world");
  }
  if (lowerQuery.includes("india") || lowerQuery.includes("delhi") || lowerQuery.includes("court") || lowerQuery.includes("election") || lowerQuery.includes("minister")) {
    categoryIntent.push("india");
  }

  const scored = articles.map((article) => {
    let score = 0;
    const title = article.title.toLowerCase();
    const desc = (article.description ?? "").toLowerCase();
    const category = article.category.toLowerCase();

    // Full query substring match
    if (tokens.length > 1 && title.includes(lowerQuery)) {
      score += 20;
    }

    for (const token of tokens) {
      if (title.includes(token)) {
        score += 8;
      }
      if (desc.includes(token)) {
        score += 3;
      }
      if (category.includes(token)) {
        score += 5;
      }
    }

    if (categoryIntent.includes(category)) {
      score += 4;
    }

    // Recency bonus: within 12 hours gets up to 2 points
    if (article.publishedAt) {
      const ageHours = (Date.now() - article.publishedAt.getTime()) / 3_600_000;
      if (ageHours <= 12) score += 2;
      else if (ageHours <= 24) score += 1;
    }

    return { article, score };
  });

  // Sort by score desc; if scores equal, newest first
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeB = b.article.publishedAt?.getTime() ?? 0;
    const timeA = a.article.publishedAt?.getTime() ?? 0;
    return timeB - timeA;
  });

  // If top scores are 0 (e.g. "top stories" or generic greeting), return newest
  return scored.slice(0, limit).map((s) => s.article);
}

export function toCitedSources(articles: NormalizedArticle[]): CitedSource[] {
  return articles.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source,
    category: a.category,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    imageUrl: a.imageUrl,
  }));
}

function buildFallbackAnswer(
  query: string,
  articles: NormalizedArticle[],
): string {
  if (articles.length === 0) {
    return "No recent stories matched your question in the current 48-hour briefing. Try searching for topics like Technology, India, World affairs, or Business.";
  }

  const highlights = articles
    .slice(0, 4)
    .map((a) => `• **${a.title}** (${a.source} · ${a.category})`)
    .join("\n");

  return (
    `Here are the most relevant stories from Briefly's briefing for "${query}":\n\n` +
    `${highlights}\n\n` +
    `*Note: Add a \`GEMINI_API_KEY\` to your \`.env.local\` file to unlock full generative summaries and in-depth AI question answering.*`
  );
}

export async function askNewsAssistant(options: {
  message: string;
  history?: ChatMessage[];
  articles: NormalizedArticle[];
}): Promise<AssistantResult> {
  const { message, history = [], articles } = options;
  const trimmed = message.trim();

  if (!trimmed) {
    return {
      answer: "Please ask a question about today's news.",
      sources: [],
      hasApiKey: false,
    };
  }

  const relevantArticles = rankRelevantArticles(trimmed, articles, 6);
  const sources = toCitedSources(relevantArticles);

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      answer: buildFallbackAnswer(trimmed, relevantArticles),
      sources,
      hasApiKey: false,
    };
  }

  // Grounded context prompt for Gemini
  const contextList = relevantArticles
    .map(
      (a, i) =>
        `[Story ${i + 1}]\nTitle: ${a.title}\nCategory: ${a.category}\nSource: ${a.source}\nPublished: ${
          a.publishedAt ? a.publishedAt.toISOString() : "recent"
        }\nSummary: ${a.description ?? "N/A"}\nURL: ${a.url}`,
    )
    .join("\n\n");

  const systemInstructionText =
    "You are Briefly's personal AI news assistant. Your job is to answer the reader's question in a calm, clear, objective, and well-written editorial tone. " +
    "Base your answer strictly on the provided recent news stories. If the stories do not contain enough information to answer, state that honestly. " +
    "Keep answers concise (1 to 3 paragraphs or a few bullet points). Mention relevant publication names or story context when appropriate. " +
    "Do not invent facts, hallucinate, or bring in outdated information.";

  const userPrompt =
    `RECENT NEWS STORIES IN TODAY'S BRIEFING:\n\n${contextList}\n\n` +
    `READER'S QUESTION: ${trimmed}`;

  const contents = [
    ...history.slice(-4).map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    {
      role: "user",
      parts: [{ text: userPrompt }],
    },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      // Fallback on API failure
      return {
        answer: buildFallbackAnswer(trimmed, relevantArticles),
        sources,
        hasApiKey: true,
      };
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const answerText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      buildFallbackAnswer(trimmed, relevantArticles);

    return {
      answer: answerText,
      sources,
      hasApiKey: true,
    };
  } catch (err) {
    console.error("Error communicating with Gemini:", err);
    return {
      answer: buildFallbackAnswer(trimmed, relevantArticles),
      sources,
      hasApiKey: true,
    };
  }
}

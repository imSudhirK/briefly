import { getNews, WINDOW_HOURS } from "@/lib/news/store";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get("limit") ?? "100");

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return Response.json(
      { error: "limit must be an integer between 1 and 500" },
      { status: 400 },
    );
  }

  const { articles, fetchedAt, failedFeeds } = await getNews();
  const category = params.get("category")?.toLowerCase();

  const results = (
    category
      ? articles.filter((article) => article.category === category)
      : articles
  ).slice(0, limit);

  return Response.json({
    articles: results,
    fetchedAt,
    failedFeeds,
    windowHours: WINDOW_HOURS,
  });
}

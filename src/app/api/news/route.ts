import { getNews, WINDOW_HOURS } from "@/lib/news/store";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limitParam = params.get("limit");
  const pageParam = params.get("page");
  const pageSizeParam = params.get("pageSize");

  const page = pageParam !== null ? Number(pageParam) : null;
  const pageSize =
    pageSizeParam !== null
      ? Number(pageSizeParam)
      : Number(limitParam ?? "100");

  if (page !== null && (!Number.isInteger(page) || page < 1)) {
    return Response.json(
      { error: "page must be a positive integer" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    return Response.json(
      { error: "limit/pageSize must be an integer between 1 and 500" },
      { status: 400 },
    );
  }

  const { articles, fetchedAt, failedFeeds } = await getNews();
  const category = params.get("category")?.toLowerCase();

  const filtered = category
    ? articles.filter((article) => article.category === category)
    : articles;

  const totalArticles = filtered.length;

  if (page !== null) {
    const totalPages = Math.max(1, Math.ceil(totalArticles / pageSize));
    const offset = (page - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    return Response.json({
      articles: paginated,
      page,
      pageSize,
      totalArticles,
      totalPages,
      fetchedAt,
      failedFeeds,
      windowHours: WINDOW_HOURS,
    });
  }

  const results = filtered.slice(0, pageSize);

  return Response.json({
    articles: results,
    totalArticles,
    fetchedAt,
    failedFeeds,
    windowHours: WINDOW_HOURS,
  });
}

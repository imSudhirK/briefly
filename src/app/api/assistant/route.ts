import { askNewsAssistant, type ChatMessage } from "@/lib/news/assistant";
import { getNews } from "@/lib/news/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: unknown;
      history?: unknown;
    };

    if (typeof body.message !== "string" || !body.message.trim()) {
      return Response.json(
        { error: "Message is required and must be a non-empty string." },
        { status: 400 },
      );
    }

    const message = body.message.trim().slice(0, 500);

    let history: ChatMessage[] = [];
    if (Array.isArray(body.history)) {
      history = body.history
        .filter(
          (h): h is ChatMessage =>
            Boolean(h) &&
            typeof h === "object" &&
            (h.role === "user" || h.role === "assistant") &&
            typeof h.content === "string",
        )
        .slice(-6);
    }

    const { articles } = await getNews();
    const result = await askNewsAssistant({
      message,
      history,
      articles,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Failed to process assistant request:", error);
    return Response.json(
      { error: "An unexpected error occurred while processing your request." },
      { status: 500 },
    );
  }
}

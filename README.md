# Briefly

Briefly is a single Next.js app with no database. `GET /api/news` fetches
the Indian Express RSS feeds, caches each feed for 10 minutes, and returns
only stories from the last 48 hours.

```bash
bun install
# Add your GEMINI_API_KEY to .env.local (see .env.example)
bun run dev        # http://localhost:3000
bun test
```

`GET /api/news?limit=100&category=india` returns
`{ articles, fetchedAt, failedFeeds, windowHours }`.

`POST /api/assistant` with `{ "message": "What happened today?" }` returns
grounded AI news summaries citing recent stories.

## Deploying to Netlify (free)

1. Sign in at https://app.netlify.com with GitHub.
2. **Add new site** → **Import an existing project** → **GitHub** → `briefly`.
3. In Netlify Site Settings:
   - Go to **Site configuration** → **Environment variables**.
   - Click **Add a variable** → **Add single variable**.
   - Key: `GEMINI_API_KEY`
   - Value: `your_gemini_api_key` (from https://aistudio.google.com/app/apikey).
   - Scope: *All scopes* (Builds and Functions).
4. Click **Deploy**. Build settings come from `netlify.toml`.
5. Every push to `main` redeploys automatically.


# Briefly

Briefly is a single Next.js app with no database. `GET /api/news` fetches
the Indian Express RSS feeds, caches each feed for 10 minutes, and returns
only stories from the last 48 hours.

```bash
bun install
bun run dev        # http://localhost:3000
bun test
```

`GET /api/news?limit=100&category=india` returns
`{ articles, fetchedAt, failedFeeds, windowHours }`.

## Deploying to Netlify (free)

1. Sign in at https://app.netlify.com with GitHub.
2. Add new site → Import an existing project → GitHub → `briefly`.
3. Build settings come from `netlify.toml`; no env vars are needed.
4. Deploy. Every push to `main` redeploys.

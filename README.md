# Economic Cascade Analyzer

Analyzes news events and produces cascading economic impact reports across sectors.

## Quick Start

### 1. Set your OpenRouter API key

Copy the example env file and fill in your key:

```bash
cp .env.example .env
# then edit .env and set OPENROUTER_API_KEY=sk-or-...
```

### 2. Start the backend (port 3001)

```bash
node node_modules/tsx/dist/cli.mjs watch server/index.ts
```

### 3. Start the frontend (port 5173)

```bash
node node_modules/vite/bin/vite.js
```

Open http://localhost:5173 — the frontend proxies `/api/*` to the backend automatically.

## Architecture

```
Frontend (Vite + React)  →  /api/*  →  Backend (Express + OpenAI)
     port 5173                              port 3001
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/consistency` | Fact consistency report across sources |
| POST | `/api/cascade` | Recursive cascading economic impacts by sector |
| POST | `/api/summary` | Chart-ready summary data + narrative |
| GET  | `/api/health` | Health check |

All POST endpoints accept `{ "event": "string", "sources": ["NYT", "Reuters", ...] }`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | — | Required. Your OpenRouter API key (openrouter.ai) |
| `OPENROUTER_MODEL` | `anthropic/claude-3.5-haiku` | Any model slug from openrouter.ai/models |
| `PORT` | `3001` | Backend port |

## CI/CD

GitHub Actions runs on every push to `main`:

1. **Unit tests** — vitest, no API key needed, runs on all pushes and PRs
2. **API integration tests** — hits real OpenRouter API with a fixed event, validates response shapes (main branch only)
3. **Build** — `npm run build`, uploads dist artifact
4. **Deploy frontend → Vercel** — automatic after tests pass
5. **Deploy backend → Railway** — automatic after tests pass

### Running tests locally

```bash
# Unit tests (fast, no API key)
node node_modules/vite/bin/vite.js --run   # or: npm test

# API integration tests (requires OPENROUTER_API_KEY in .env)
node node_modules/tsx/dist/cli.mjs node_modules/vitest/vitest.mjs --run --config vitest.api.config.ts
```

### Required GitHub Secrets

| Secret | Where to get it |
|--------|----------------|
| `OPENROUTER_API_KEY` | openrouter.ai/keys |
| `VERCEL_TOKEN` | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `vercel env pull` or Vercel project settings |
| `VERCEL_PROJECT_ID` | Vercel project settings |
| `RAILWAY_TOKEN` | railway.app → Account Settings → Tokens |

### Required GitHub Variables

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | Your Railway backend URL e.g. `https://your-app.railway.app` |

### First-time setup

1. Push repo to GitHub
2. Connect repo to Vercel (vercel.com/new) — it auto-detects Vite
3. Create a Railway project, add the repo, set `OPENROUTER_API_KEY` and `FRONTEND_URL` env vars
4. Add all secrets/variables to GitHub repo settings
5. Push to main — CI runs, tests pass, both services deploy

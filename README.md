# Economic Cascade Analyzer

Analyzes news events and produces cascading economic impact reports across sectors.

## Quick Start

### 1. Set your OpenAI API key

```bash
# Windows
set OPENAI_API_KEY=sk-...

# macOS/Linux
export OPENAI_API_KEY=sk-...
```

### 2. Start the backend (port 3001)

```bash
npx tsx server/index.ts
```

### 3. Start the frontend (port 5173)

```bash
npm run dev
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
| `OPENAI_API_KEY` | — | Required. Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use |
| `PORT` | `3001` | Backend port |

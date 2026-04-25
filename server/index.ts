/**
 * server/index.ts
 *
 * Express backend for the Economic Cascade Analyzer.
 * Exposes three endpoints consumed by the frontend wizard:
 *   POST /api/consistency  → ConsistencyReport
 *   POST /api/cascade      → CascadeData
 *   POST /api/summary      → SummaryData
 *
 * All three use OpenRouter (openrouter.ai) as the LLM provider.
 * OpenRouter exposes an OpenAI-compatible API, so the openai SDK is used
 * with a custom baseURL pointing at OpenRouter.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Load .env (if present) before reading process.env
// ---------------------------------------------------------------------------

try {
  const envPath = resolve(process.cwd(), ".env");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env not present — that's fine, fall back to real env vars
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = process.env.PORT ?? 3001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-haiku";

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "Economic Cascade Analyzer",
  },
});

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

const log = {
  info:  (...a: unknown[]) => console.log( `\x1b[36m[${ts()}] INFO \x1b[0m`, ...a),
  ok:    (...a: unknown[]) => console.log( `\x1b[32m[${ts()}] OK   \x1b[0m`, ...a),
  warn:  (...a: unknown[]) => console.warn(`\x1b[33m[${ts()}] WARN \x1b[0m`, ...a),
  error: (...a: unknown[]) => console.error(`\x1b[31m[${ts()}] ERR  \x1b[0m`, ...a),
};

// ---------------------------------------------------------------------------
// Web search via DuckDuckGo (no API key required)
// Hits DDG's HTML endpoint and parses result snippets out of the response.
// ---------------------------------------------------------------------------

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function duckDuckGoSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  log.info(`[search] DDG query="${query.slice(0, 80)}"`);
  const t0 = Date.now();

  try {
    // DDG HTML endpoint — returns a simple HTML page we can parse
    const params = new URLSearchParams({ q: query, kl: "us-en" });
    const res = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EconomicCascadeAnalyzer/1.0)",
        "Accept": "text/html",
      },
    });

    if (!res.ok) {
      log.warn(`[search] DDG HTTP ${res.status} — skipping`);
      return [];
    }

    const html = await res.text();

    // Parse results from DDG HTML structure
    const results: SearchResult[] = [];
    // Match result blocks: <a class="result__a" href="...">title</a> and <a class="result__snippet">snippet</a>
    const resultBlocks = html.matchAll(
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    );

    for (const match of resultBlocks) {
      if (results.length >= maxResults) break;
      const url = match[1].startsWith("//") ? "https:" + match[1] : match[1];
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      const snippet = match[3].replace(/<[^>]+>/g, "").trim();
      if (title && url && !url.includes("duckduckgo.com")) {
        results.push({ title, url, snippet });
      }
    }

    // Fallback: simpler pattern if the above didn't match
    if (results.length === 0) {
      const links = html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g);
      for (const match of links) {
        if (results.length >= maxResults) break;
        const url = match[1];
        const title = match[2].replace(/<[^>]+>/g, "").trim();
        if (title && url && !url.includes("duckduckgo.com")) {
          results.push({ title, url, snippet: "" });
        }
      }
    }

    log.ok(`[search] DDG got ${results.length} results in ${Date.now() - t0}ms`);
    return results;
  } catch (err) {
    log.warn(`[search] DDG failed (${Date.now() - t0}ms):`, err instanceof Error ? err.message : err);
    return [];
  }
}

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "";
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}${r.snippet ? `\n${r.snippet}` : ""}`)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// LLM call — search first, then single clean LLM request
// ---------------------------------------------------------------------------

async function callLLM(endpoint: string, systemPrompt: string, userPrompt: string, searchQuery: string): Promise<string> {
  // Step 1: fetch search results
  const results = await duckDuckGoSearch(searchQuery);
  const searchContext = results.length > 0
    ? `\n\n---\nWeb search results for: "${searchQuery}"\n\n${formatSearchResults(results)}\n---\n\nUse the above search results to ground your analysis. Cite sources by their URL where relevant.`
    : "";

  // Step 2: single LLM call with context injected
  log.info(`[${endpoint}] → OpenRouter  model=${MODEL}  search_results=${results.length}`);
  const t0 = Date.now();

  let response;
  try {
    response = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt + searchContext },
      ],
      temperature: 0.3,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[${endpoint}] LLM request failed after ${Date.now() - t0}ms:`, msg);
    throw err;
  }

  const elapsed = Date.now() - t0;
  const usage = response.usage;
  log.ok(
    `[${endpoint}] done in ${elapsed}ms` +
    (usage ? `  |  tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out` : "")
  );

  const content = response.choices[0]?.message?.content?.trim() ?? "";

  if (!content) {
    log.error(`[${endpoint}] Empty response from LLM (${elapsed}ms)`);
    throw new Error("LLM returned empty response");
  }

  // Strip markdown code fences if present
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/s);
  const json = fenced ? fenced[1].trim() : content;

  try {
    JSON.parse(json);
  } catch {
    log.warn(`[${endpoint}] LLM returned non-JSON:\n${json.slice(0, 400)}`);
    throw new Error("LLM returned invalid JSON");
  }

  return json;
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

interface AnalyzeBody {
  event: string;
  sources: string[];
}

function validateBody(body: unknown): AnalyzeBody {
  if (!body || typeof body !== "object") throw new Error("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (typeof b.event !== "string" || b.event.trim().length < 10) {
    throw new Error("event must be a string of at least 10 characters");
  }
  if (b.event.trim().length > 500) {
    throw new Error("event must be at most 500 characters");
  }
  if (!Array.isArray(b.sources) || b.sources.length === 0) {
    throw new Error("sources must be a non-empty array of strings");
  }

  return { event: b.event.trim(), sources: b.sources as string[] };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const CONSISTENCY_SYSTEM = `You are an expert economic and news analyst.
Given a news event and a list of news sources, search the web for real coverage of this event, then return a fact consistency report.

CRITICAL: Your ENTIRE response must be a single valid JSON object. No prose, no markdown, no code fences. Start with { and end with }.

Return ONLY a valid JSON object with this exact structure:
{
  "unknown_percentage": <number 0-100>,
  "no_sources_found": <boolean>,
  "facts": [
    {
      "id": "fact-1",
      "statement": "<factual claim>",
      "status": "consistent" | "inconsistent" | "unverified",
      "agreement_percentage": <number 0-100>,
      "supporting_sources": ["<source name>"],
      "contradicting_sources": ["<source name>"]
    }
  ],
  "sourceScores": [
    {
      "name": "<source name e.g. NYT>",
      "consistencyScore": <number 0-100>,
      "factCount": <number>
    }
  ]
}

Rules:
- If no articles can be found, return { "no_sources_found": true, "unknown_percentage": 100, "facts": [], "sourceScores": [] }
- agreement_percentage = (supporting sources count / total selected sources count) × 100
- status is "consistent" if agreement_percentage >= 70, "inconsistent" if < 70 and at least one source contradicts, "unverified" otherwise
- sourceScores: for each selected source, compute what % of facts it agrees on and how many facts it contributes to
- Return 5-15 facts for a typical event`;

function buildConsistencyPrompt(event: string, sources: string[]): string {
  return `News Event: "${event}"

Selected Sources: ${sources.join(", ")}

Search the web for recent coverage of this event from the selected sources (${sources.join(", ")}). Use the search results to identify key factual claims and assess consistency across sources. Then return the consistency report JSON.`;
}

const CASCADE_SYSTEM = `You are an expert economic analyst specializing in cascading economic impacts.
Given a news event and sources, search the web for real reporting and economic analysis, then return a cascading impact breakdown.

CRITICAL: Your ENTIRE response must be a single valid JSON object. No prose, no markdown, no code fences. Start with { and end with }.

Return ONLY a valid JSON object with this exact structure:
{
  "sources": [
    { "title": "<article title>", "url": "<full URL>" }
  ],
  "sectors": [
    {
const CASCADE_SYSTEM = `You are an expert economic analyst specializing in cascading economic impacts.
Given a news event and sources, search the web for real reporting and economic analysis, then return a cascading impact breakdown.

CRITICAL: Your ENTIRE response must be a single valid JSON object. No prose, no markdown, no code fences. Start with { and end with }.

Return ONLY a valid JSON object with this exact structure:
{
  "sectors": [
    {
      "name": "<sector name>",
      "icon": "<emoji>",
      "impacts": [
        {
          "id": "<unique-id>",
          "title": "<short title>",
          "description": "<1-2 sentence description>",
          "type": "direct" | "indirect",
          "is_hidden_factor": <boolean>,
          "hidden_factor_category": "<category>" | null,
          "confidence": <number 0.0-1.0>,
          "severity": <number 1-10>,
          "causal_chain": ["<step 1>", "<step 2>", ...],
          "originating_facts": ["fact-1", ...],
          "children": [<same Impact structure, recursive>]
        }
      ]
    }
  ]
}

Rules:
- Include ALL relevant sectors — Agriculture, Energy, Transport, Finance, Retail, Health, Environment, Manufacturing, Tourism, Education, Real Estate, Labor, etc.
- Impacts MUST be recursive with children forming causal chains (depth 2-4 levels)
- Include at least one is_hidden_factor: true impact per analysis
- hidden_factor_category must be one of: "Environmental Debt", "Social Capital", "Supply Chain Ripple", "Regulatory Risk", "Labor Market Shift"
- Sort impacts by severity descending at every level`;

function buildCascadePrompt(event: string, sources: string[]): string {
  return `News Event: "${event}"

Sources analyzed: ${sources.join(", ")}

Search the web for recent reporting and economic analysis of this event. Use the search results to ground your analysis in real reporting, then generate the complete cascading economic impact analysis JSON. Be thorough — include second and third-order effects, hidden factors, and cross-sector ripples.`;
}

const SUMMARY_SYSTEM = `You are an expert economic analyst creating a comprehensive summary report.
Given a news event and sources, search the web for economic data and forecasts, then generate chart-ready summary data and narrative text.

CRITICAL: Your ENTIRE response must be a single valid JSON object. No prose, no markdown, no code fences. Start with { and end with }.

Return ONLY a valid JSON object with this exact structure:
{
  "sectors": [
    {
      "name": "<sector name matching cascade data>",
      "icon": "<emoji>",
      "summary_blurb": "<1-3 sentence overview>",
      "worldwide_implications": "<global impact description>",
      "charts": [
        {
          "chart_type": "bar" | "pie" | "donut" | "line" | "area",
          "title": "<chart title>",
          "labels": ["<label1>", "<label2>", ...],
          "datasets": [
            {
              "label": "<series name>",
              "values": [<number>, <number>, ...]
            }
          ]
        }
      ],
      "impacts_summary": [
        {
          "title": "<impact title>",
          "description": "<description>",
          "severity": <number 1-10>
        }
      ]
    }
  ],
  "hidden_factors_summary": [
    {
      "factor": "<hidden factor name>",
      "category": "<one of the 5 categories>",
      "explanation": "<2-3 sentence explanation>"
    }
  ],
  "narrative_summary": "<multi-paragraph plain text summary>"
}

Rules:
- Use real data from search results for chart values where possible
- Each sector must have at least 1 chart; datasets[].values MUST be same length as labels
- hidden_factors_summary aggregates ALL hidden factors from the analysis`;

function buildSummaryPrompt(event: string, sources: string[]): string {
  return `News Event: "${event}"

Sources analyzed: ${sources.join(", ")}

Search the web for any additional economic data, forecasts, or expert commentary on this event. Use the search results to produce realistic chart values and a well-grounded narrative. Then generate the complete summary data with charts and narrative for this economic cascade analysis.`;
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    // Production Vercel URL — set FRONTEND_URL env var on Railway
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    // Allow any vercel.app subdomain for preview deployments
    /\.vercel\.app$/,
  ],
}));
app.use(express.json());

// Request logger — logs every incoming request
app.use((req: Request, _res: Response, next: NextFunction) => {
  log.info(`${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/api/consistency", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, sources } = validateBody(req.body);
    log.info(`[consistency] event="${event.slice(0, 60)}${event.length > 60 ? "…" : ""}"  sources=[${sources.join(", ")}]`);
    const raw = await callLLM("consistency", CONSISTENCY_SYSTEM, buildConsistencyPrompt(event, sources), `${event} ${sources.join(" ")}`);
    const data = JSON.parse(raw);
    log.ok(`[consistency] returning ${data.facts?.length ?? 0} facts  unknown=${data.unknown_percentage}%`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/api/cascade", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, sources } = validateBody(req.body);
    log.info(`[cascade] event="${event.slice(0, 60)}${event.length > 60 ? "…" : ""}"  sources=[${sources.join(", ")}]`);
    const raw = await callLLM("cascade", CASCADE_SYSTEM, buildCascadePrompt(event, sources), `${event} economic impact analysis`);
    const data = JSON.parse(raw);
    log.ok(`[cascade] returning ${data.sectors?.length ?? 0} sectors`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/api/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, sources } = validateBody(req.body);
    log.info(`[summary] event="${event.slice(0, 60)}${event.length > 60 ? "…" : ""}"  sources=[${sources.join(", ")}]`);
    const raw = await callLLM("summary", SUMMARY_SYSTEM, buildSummaryPrompt(event, sources), `${event} economic forecast data`);
    const data = JSON.parse(raw);
    log.ok(`[summary] returning ${data.sectors?.length ?? 0} sectors  hidden_factors=${data.hidden_factors_summary?.length ?? 0}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    message.includes("at least 10") || message.includes("at most 500") || message.includes("non-empty")
      ? 400
      : 500;
  log.error(`HTTP ${status} —`, message);
  res.status(status).json({ error: message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  log.info(`listening on http://localhost:${PORT}`);
  log.info(`model: ${MODEL}`);
  if (!OPENROUTER_API_KEY) {
    log.warn("OPENROUTER_API_KEY is not set — LLM calls will fail");
  } else {
    log.info(`OPENROUTER_API_KEY: ${OPENROUTER_API_KEY.slice(0, 8)}...`);
  }
});

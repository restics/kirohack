/**
 * server/index.ts
 *
 * Express backend for the Economic Cascade Analyzer.
 * Exposes three endpoints consumed by the frontend wizard:
 *   POST /api/consistency  → ConsistencyReport
 *   POST /api/cascade      → CascadeData
 *   POST /api/summary      → SummaryData
 *
 * All three use an LLM (OpenAI by default, Anthropic as fallback) to
 * generate structured JSON responses based on the event description and
 * selected news sources.
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = process.env.PORT ?? 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// LLM helper
// ---------------------------------------------------------------------------

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");
  return content;
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
Given a news event and a list of news sources, analyze the event across those sources and return a fact consistency report.

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
  ]
}

Rules:
- If no articles can be found for the event from any selected source, return { "no_sources_found": true, "unknown_percentage": 100, "facts": [] }
- agreement_percentage = (supporting sources count / total selected sources count) × 100
- status is "consistent" if agreement_percentage >= 70, "inconsistent" if < 70 and at least one source contradicts, "unverified" otherwise
- Return 5-15 facts for a typical event
- Use your training knowledge about these news sources and the event`;

function buildConsistencyPrompt(event: string, sources: string[]): string {
  return `News Event: "${event}"

Selected Sources: ${sources.join(", ")}

Analyze this event across the selected sources and return the consistency report JSON.`;
}

const CASCADE_SYSTEM = `You are an expert economic analyst specializing in cascading economic impacts.
Given a news event and sources, identify all direct and indirect economic impacts organized by sector.

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
- Include ALL relevant sectors — not a fixed list. Think broadly: Agriculture, Energy, Transport, Finance, Retail, Health, Environment, Manufacturing, Tourism, Education, Real Estate, Labor, etc.
- Impacts MUST be recursive with children forming causal chains (depth 2-4 levels)
- Include at least one is_hidden_factor: true impact per analysis
- hidden_factor_category must be one of: "Environmental Debt", "Social Capital", "Supply Chain Ripple", "Regulatory Risk", "Labor Market Shift"
- Sort impacts by severity descending at every level
- 3-10 impacts per sector with recursive depth of 2-4 for significant chains
- originating_facts should reference fact IDs like "fact-1", "fact-2" etc.`;

function buildCascadePrompt(event: string, sources: string[]): string {
  return `News Event: "${event}"

Sources analyzed: ${sources.join(", ")}

Generate the complete cascading economic impact analysis JSON. Be thorough — include second and third-order effects, hidden factors, and cross-sector ripples.`;
}

const SUMMARY_SYSTEM = `You are an expert economic analyst creating a comprehensive summary report.
Given a news event and sources, generate chart-ready summary data and narrative text.

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
- Each sector must have at least 1 chart, use varied chart types
- datasets[].values MUST be the same length as labels
- Use realistic numbers based on the event
- narrative_summary should tie together key findings across all sectors
- hidden_factors_summary aggregates ALL hidden factors from the analysis`;

function buildSummaryPrompt(event: string, sources: string[]): string {
  return `News Event: "${event}"

Sources analyzed: ${sources.join(", ")}

Generate the complete summary data with charts and narrative for this economic cascade analysis.`;
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();

app.use(cors({ origin: ["http://localhost:5173", "http://localhost:4173"] }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/api/consistency", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, sources } = validateBody(req.body);
    const raw = await callLLM(CONSISTENCY_SYSTEM, buildConsistencyPrompt(event, sources));
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/api/cascade", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, sources } = validateBody(req.body);
    const raw = await callLLM(CASCADE_SYSTEM, buildCascadePrompt(event, sources));
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/api/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, sources } = validateBody(req.body);
    const raw = await callLLM(SUMMARY_SYSTEM, buildSummaryPrompt(event, sources));
    const data = JSON.parse(raw);
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
  console.error("[server error]", message);
  res.status(status).json({ error: message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  if (!OPENAI_API_KEY) {
    console.warn("[backend] WARNING: OPENAI_API_KEY is not set — LLM calls will fail");
  }
});

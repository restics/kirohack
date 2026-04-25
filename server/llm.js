import Anthropic from '@anthropic-ai/sdk';
import { fetchArticles, formatArticlesForLLM } from './news.js';

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const DEFAULT_FREE_MODEL = 'openrouter/free';

/**
 * opts: { apiKey?, newsApiKey? }
 */
async function callLLM(systemPrompt, userPrompt, opts = {}) {
  if (opts.apiKey) {
    return callAnthropic(systemPrompt, userPrompt, opts.apiKey);
  }
  return callOpenRouter(systemPrompt, userPrompt, DEFAULT_FREE_MODEL);
}

async function callAnthropic(systemPrompt, userPrompt, apiKey) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return parseJSON(content.text);
}

async function callOpenRouter(systemPrompt, userPrompt, model) {
  if (!OPENROUTER_KEY) throw new Error('No OpenRouter key configured on server');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Economic Cascade Analyzer',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${text}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content in OpenRouter response');
  return parseJSON(text);
}

function parseJSON(text) {
  let cleaned = text;
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : cleaned.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse LLM JSON. Raw:', text.slice(0, 500));
    throw new Error('LLM returned invalid JSON — please try again');
  }
}

// ─── PROMPTS ───

const CONSISTENCY_SYSTEM = `You are an expert economic analyst. You will be given a news event, a list of news sources the user selected, and REAL ARTICLES fetched from news APIs.

Analyze the REAL ARTICLES to extract factual claims and determine cross-source consistency.

Return ONLY valid JSON matching this schema:
{
  "unknown_percentage": number (0-100),
  "no_sources_found": false,
  "facts": [
    {
      "id": "fact-1",
      "statement": "string — a factual claim extracted from the articles",
      "status": "consistent" | "inconsistent" | "unverified",
      "agreement_percentage": number (0-100),
      "supporting_sources": ["source names from the articles"],
      "contradicting_sources": ["source names"]
    }
  ]
}

Rules:
- Extract 8-15 distinct factual claims FROM THE PROVIDED ARTICLES
- Only use information actually present in the articles — do not hallucinate facts
- For each fact, check which article sources support or contradict it
- "consistent" if agreement_percentage >= 70, "inconsistent" if < 70 and contradicted, "unverified" otherwise
- agreement_percentage = (supporting sources / total sources that mention the topic) × 100
- If no articles were found, set no_sources_found to true and return empty facts
- Return ONLY the JSON object, no markdown, no explanation`;

const CASCADE_SYSTEM = `You are an expert economic analyst specializing in cascading impact analysis. You will be given a news event and REAL ARTICLES about it.

Based on the REAL information from these articles, produce a recursive cascading impact breakdown by sector.

Return ONLY valid JSON matching this schema:
{
  "sectors": [
    {
      "name": "Sector Name",
      "icon": "emoji",
      "impacts": [
        {
          "id": "unique-id",
          "title": "Short title",
          "description": "1-2 sentences",
          "type": "direct" | "indirect",
          "is_hidden_factor": boolean,
          "hidden_factor_category": null | "Environmental Debt" | "Social Capital" | "Supply Chain Ripple" | "Regulatory Risk" | "Labor Market Shift",
          "confidence": number (0.0-1.0),
          "severity": number (1-10),
          "causal_chain": ["step1", "step2"],
          "originating_facts": ["fact-1"],
          "children": [ ...recursive same structure ]
        }
      ]
    }
  ]
}

Rules:
- Ground your analysis in the REAL ARTICLES provided
- 4-8 sectors (include non-obvious second/third-order effects)
- 2-5 top-level impacts per sector, sorted by severity descending
- Recursive children forming cascading chains (depth 2-4)
- At least 2-3 hidden factors (things NOT mentioned in articles but logically implied)
- Hidden factors must have a valid hidden_factor_category
- Realistic severity and confidence scores based on article evidence
- Return ONLY the JSON object, no markdown, no explanation`;

const SUMMARY_SYSTEM = `You are an expert economic analyst. You will be given a news event and REAL ARTICLES about it. Each article is numbered [Article 1], [Article 2], etc.

Based on the REAL information, produce a comprehensive summary with chart-ready data and IN-TEXT CITATIONS.

Return ONLY valid JSON matching this schema:
{
  "sectors": [
    {
      "name": "Sector Name",
      "icon": "emoji",
      "summary_blurb": "1-3 sentences with citations like [1] [2]",
      "worldwide_implications": "Global impact description with citations [3]",
      "charts": [
        {
          "chart_type": "bar" | "pie" | "donut" | "line" | "area",
          "title": "Chart title",
          "labels": ["Label1", "Label2"],
          "datasets": [{ "label": "Series", "values": [10, 20] }]
        }
      ],
      "impacts_summary": [
        { "title": "Title", "description": "Brief description with citation [1]", "severity": 8 }
      ]
    }
  ],
  "hidden_factors_summary": [
    {
      "factor": "Factor name",
      "category": "Environmental Debt" | "Social Capital" | "Supply Chain Ripple" | "Regulatory Risk" | "Labor Market Shift",
      "explanation": "2-3 sentences with citations [2] [4]"
    }
  ],
  "narrative_summary": "Multi-paragraph summary with in-text citations [1] [3] [5] throughout"
}

CHART RULES — THIS IS CRITICAL:
- Every chart MUST make logical sense. The labels and datasets must have a coherent relationship.
- A bar chart comparing items must compare THE SAME UNIT across different categories (e.g., "GDP impact in $B" across countries, or "price change %" across commodities)
- NEVER mix unrelated metrics on the same chart (e.g., do NOT plot "deaths" against "ceasefire status" or "oil price" against "refugee count")
- NEVER use boolean/status values as numeric data points
- Each chart must have a clear, specific unit of measurement (dollars, percentages, barrels, tons, etc.)
- Use ONLY these chart patterns:
  * BAR: Compare the same metric across different categories (e.g., "Oil Price Change by Region ($)" with labels ["Asia", "Europe", "Americas"])
  * LINE: Show how ONE metric changes over time (e.g., "Brent Crude Price Projection ($/barrel)" with labels ["Q1", "Q2", "Q3", "Q4"])
  * PIE/DONUT: Show parts of a whole that add up to ~100% (e.g., "Global Oil Transit Share (%)" with labels ["Hormuz", "Malacca", "Suez", "Other"])
  * AREA: Show cumulative or stacked trends over time
- Use REAL numbers from the articles. If articles say "20% of global oil passes through Hormuz", use that exact figure.
- If you cannot find a specific number in the articles for a chart, DO NOT make one up. Skip the chart for that sector instead.
- Maximum 1-2 charts per sector. Quality over quantity.
- datasets[].values MUST match labels array length
- Chart titles must include the unit in parentheses, e.g., "Impact on Oil Prices ($/barrel)"

OTHER RULES:
- USE IN-TEXT CITATIONS: reference articles as [1], [2], [3] etc. matching the article numbers provided
- Include citations in summary_blurb, worldwide_implications, narrative_summary, impact descriptions, and hidden factor explanations
- narrative_summary should be 2-3 paragraphs with citations throughout
- 2-4 hidden factors
- Return ONLY the JSON object, no markdown, no explanation`;

// ─── EXPORTS ───

function buildUserPrompt(event, sources, articleText) {
  return `Event: "${event}"
Sources: ${sources.join(', ')}

=== REAL ARTICLES FROM NEWS API ===
${articleText}
=== END ARTICLES ===`;
}

export async function analyzeConsistency(event, sources, opts = {}) {
  const articles = await fetchArticles(event, sources, opts.newsApiKey);
  const articleText = formatArticlesForLLM(articles);
  const prompt = buildUserPrompt(event, sources, articleText) + '\n\nAnalyze these real articles and produce the consistency report JSON.';
  return callLLM(CONSISTENCY_SYSTEM, prompt, opts);
}

export async function analyzeCascade(event, sources, opts = {}) {
  const articles = await fetchArticles(event, sources, opts.newsApiKey);
  const articleText = formatArticlesForLLM(articles);
  const prompt = buildUserPrompt(event, sources, articleText) + '\n\nBased on these real articles, produce the cascading impact breakdown JSON.';
  return callLLM(CASCADE_SYSTEM, prompt, opts);
}

export async function analyzeSummary(event, sources, opts = {}) {
  const articles = await fetchArticles(event, sources, opts.newsApiKey);
  const articleText = formatArticlesForLLM(articles);
  const prompt = buildUserPrompt(event, sources, articleText) + '\n\nBased on these real articles, produce the summary infographic JSON with chart data.';
  const result = await callLLM(SUMMARY_SYSTEM, prompt, opts);

  // Attach the real article sources to the response
  result.sources_used = articles.map(a => ({
    source: a.source,
    title: a.title,
    url: a.url,
    publishedAt: a.publishedAt,
  }));

  return result;
}

import Anthropic from '@anthropic-ai/sdk';
import { fetchArticles, formatArticlesForLLM } from './news.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
  process.exit(1);
}

async function callLLM(systemPrompt, userPrompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const text = content.text;

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse LLM JSON. Raw:', text.slice(0, 500));
    throw new Error('LLM returned invalid JSON');
  }
}

// ─── CONSISTENCY ───

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

export async function analyzeConsistency(event, sources) {
  const articles = await fetchArticles(event, sources);
  const articleText = formatArticlesForLLM(articles);

  const userPrompt = `Event: "${event}"
Selected sources: ${sources.join(', ')}

=== REAL ARTICLES FROM NEWS API ===
${articleText}
=== END ARTICLES ===

Analyze these real articles and produce the consistency report JSON.`;

  return callLLM(CONSISTENCY_SYSTEM, userPrompt);
}

// ─── CASCADE ───

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

export async function analyzeCascade(event, sources) {
  const articles = await fetchArticles(event, sources);
  const articleText = formatArticlesForLLM(articles);

  const userPrompt = `Event: "${event}"
Sources: ${sources.join(', ')}

=== REAL ARTICLES FROM NEWS API ===
${articleText}
=== END ARTICLES ===

Based on these real articles, produce the cascading impact breakdown JSON.`;

  return callLLM(CASCADE_SYSTEM, userPrompt);
}

// ─── SUMMARY ───

const SUMMARY_SYSTEM = `You are an expert economic analyst. You will be given a news event and REAL ARTICLES about it.

Based on the REAL information, produce a comprehensive summary with chart-ready data.

Return ONLY valid JSON matching this schema:
{
  "sectors": [
    {
      "name": "Sector Name",
      "icon": "emoji",
      "summary_blurb": "1-3 sentences",
      "worldwide_implications": "Global impact description",
      "charts": [
        {
          "chart_type": "bar" | "pie" | "donut" | "line" | "area",
          "title": "Chart title",
          "labels": ["Label1", "Label2"],
          "datasets": [{ "label": "Series", "values": [10, 20] }]
        }
      ],
      "impacts_summary": [
        { "title": "Title", "description": "Brief", "severity": 8 }
      ]
    }
  ],
  "hidden_factors_summary": [
    {
      "factor": "Factor name",
      "category": "Environmental Debt" | "Social Capital" | "Supply Chain Ripple" | "Regulatory Risk" | "Labor Market Shift",
      "explanation": "2-3 sentences"
    }
  ],
  "narrative_summary": "Multi-paragraph summary text"
}

Rules:
- Ground charts and data in REAL information from the articles
- Each sector needs 1-2 charts with realistic numeric data from articles
- Vary chart types across sectors
- datasets[].values MUST match labels array length
- narrative_summary should be 2-3 paragraphs referencing real article findings
- 2-4 hidden factors
- Return ONLY the JSON object, no markdown, no explanation`;

export async function analyzeSummary(event, sources) {
  const articles = await fetchArticles(event, sources);
  const articleText = formatArticlesForLLM(articles);

  const userPrompt = `Event: "${event}"
Sources: ${sources.join(', ')}

=== REAL ARTICLES FROM NEWS API ===
${articleText}
=== END ARTICLES ===

Based on these real articles, produce the summary infographic JSON with chart data.`;

  return callLLM(SUMMARY_SYSTEM, userPrompt);
}

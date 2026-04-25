import Anthropic from '@anthropic-ai/sdk';
import { fetchArticles, formatArticlesForLLM } from './news.js';
import { validateConsistency, validateCascade, validateSummary } from './validate.js';

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

const SUMMARY_CHART_PLANNING_SYSTEM = `You are a data visualization strategist. You will be given news articles about an economic event.

Your job is to think through what charts would be MOST COMPELLING and INFORMATIVE for understanding this event's economic impact. For each chart idea, explain:
1. What ARGUMENT or INSIGHT the chart communicates
2. What specific data from the articles supports it
3. Why this chart type is the right choice for this data

Return ONLY valid JSON:
{
  "chart_plans": [
    {
      "sector": "Which economic sector",
      "argument": "The specific insight this chart communicates, e.g., 'Oil prices have spiked 15% since the blockade began, with Brent crude rising faster than WTI'",
      "data_source": "Where in the articles this data comes from",
      "chart_type": "bar | line | pie | donut",
      "why_this_type": "Why this chart type fits — e.g., 'bar chart because we are comparing the same metric (price change %) across different oil benchmarks'",
      "title": "Chart title with unit, e.g., 'Oil Price Change Since Blockade ($/barrel)'",
      "unit": "The single unit all values share",
      "labels": ["Category1", "Category2"],
      "dataset_label": "What the numbers represent",
      "values": [number, number]
    }
  ]
}

CRITICAL RULES:
- Think like a journalist or analyst: what charts would make a reader UNDERSTAND the situation?
- Every chart must make a clear ARGUMENT — not just display data for the sake of it
- ALL values in a single chart MUST share the same unit. If you want to show two different metrics, make two separate charts.
- Use real numbers from the articles. If the articles don't contain specific numbers for a chart idea, SKIP IT.
- Prefer charts that show: comparisons (before/after, country vs country), proportions (share of global trade), or trends (price over time)
- 4-8 chart plans total, spread across sectors
- labels and values arrays MUST be the same length
- Return ONLY the JSON, no explanation`;

const SUMMARY_NARRATIVE_SYSTEM = `You are an expert economic analyst. You will be given a news event, real articles (numbered [Article 1], [Article 2], etc.), and extracted data.

Write the narrative analysis with IN-TEXT CITATIONS. Do NOT generate any chart data — that is handled separately.

Return ONLY valid JSON matching this schema:
{
  "sectors": [
    {
      "name": "Sector Name",
      "icon": "emoji",
      "summary_blurb": "1-3 sentences with citations [1] [2]",
      "worldwide_implications": "Global impact description with citations [3]",
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

Rules:
- USE IN-TEXT CITATIONS: reference articles as [1], [2], [3] etc.
- narrative_summary should be 2-3 paragraphs with citations throughout
- 2-4 hidden factors
- Do NOT include any "charts" field — charts are generated separately
- Return ONLY the JSON, no explanation`;

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
  const raw = await callLLM(CONSISTENCY_SYSTEM, prompt, opts);
  return validateConsistency(raw);
}

export async function analyzeCascade(event, sources, opts = {}) {
  const articles = await fetchArticles(event, sources, opts.newsApiKey);
  const articleText = formatArticlesForLLM(articles);
  const prompt = buildUserPrompt(event, sources, articleText) + '\n\nBased on these real articles, produce the cascading impact breakdown JSON.';
  const raw = await callLLM(CASCADE_SYSTEM, prompt, opts);
  return validateCascade(raw);
}

export async function analyzeSummary(event, sources, opts = {}, cascadeData = null) {
  const articles = await fetchArticles(event, sources, opts.newsApiKey);
  const articleText = formatArticlesForLLM(articles);
  const basePrompt = buildUserPrompt(event, sources, articleText);

  // Build cascade context for the LLM so charts reflect step 3
  let cascadeContext = '';
  if (cascadeData?.sectors?.length > 0) {
    const sectorSummaries = cascadeData.sectors.map(s => {
      const topImpacts = (s.impacts || []).slice(0, 3).map(i =>
        `  - ${i.title} (severity: ${i.severity}/10, ${i.type}): ${i.description}`
      ).join('\n');
      return `${s.icon} ${s.name}:\n${topImpacts}`;
    }).join('\n\n');

    cascadeContext = `\n\n=== CASCADE ANALYSIS FROM STEP 3 (use these exact sectors and impacts) ===\n${sectorSummaries}\n=== END CASCADE ===`;
  }

  // Stage 1: Chart planning — LLM reasons about what charts would be compelling
  console.log('[summary] Stage 1: Planning charts...');
  let chartPlans = [];
  try {
    const planPrompt = basePrompt + cascadeContext + '\n\nAnalyze these articles and the cascade analysis. Propose compelling chart visualizations that illustrate the impacts identified above.';
    const planRaw = await callLLM(SUMMARY_CHART_PLANNING_SYSTEM, planPrompt, opts);
    chartPlans = Array.isArray(planRaw.chart_plans) ? planRaw.chart_plans : [];
    console.log(`[summary] Stage 1 complete: ${chartPlans.length} chart plans`);
    for (const p of chartPlans) {
      console.log(`  → ${p.sector}: "${p.title}" (${p.chart_type}) — ${p.argument?.slice(0, 60)}...`);
    }
  } catch (e) {
    console.warn('[summary] Stage 1 failed, continuing without charts:', e.message);
  }

  // Stage 2: Validate chart plans deterministically
  const chartsBySector = {};
  for (const plan of chartPlans) {
    if (!plan || !plan.sector || !plan.title) continue;
    const labels = Array.isArray(plan.labels) ? plan.labels.map(String) : [];
    let values = Array.isArray(plan.values) ? plan.values.map(v => Number(v) || 0) : [];

    if (values.length > labels.length) values = values.slice(0, labels.length);
    while (values.length < labels.length) values.push(0);

    if (labels.length < 2) continue;
    if (values.every(v => v === values[0])) continue;

    const chartType = ['bar', 'line', 'pie', 'donut', 'area'].includes(plan.chart_type) ? plan.chart_type : 'bar';
    if ((chartType === 'pie' || chartType === 'donut') && values.some(v => v < 0)) continue;

    const chart = {
      chart_type: chartType,
      title: String(plan.title),
      labels,
      datasets: [{ label: String(plan.dataset_label || plan.unit || 'Value'), values }],
    };

    const sector = String(plan.sector);
    if (!chartsBySector[sector]) chartsBySector[sector] = [];
    if (chartsBySector[sector].length < 2) {
      chartsBySector[sector].push(chart);
    }
  }
  console.log(`[summary] Stage 2: Validated charts for ${Object.keys(chartsBySector).length} sectors`);

  // Stage 3: Generate narrative — constrained to the same sectors from cascade
  console.log('[summary] Stage 3: Generating narrative...');
  const narrativePrompt = basePrompt + cascadeContext + '\n\nWrite the narrative analysis. Use the SAME sectors from the cascade analysis above.';
  const narrativeRaw = await callLLM(SUMMARY_NARRATIVE_SYSTEM, narrativePrompt, opts);
  const validated = validateSummary(narrativeRaw);

  // Merge charts into matching sectors (fuzzy match)
  for (const sector of validated.sectors) {
    const sectorLower = sector.name.toLowerCase();
    const matched = [];
    for (const [key, charts] of Object.entries(chartsBySector)) {
      if (sectorLower.includes(key.toLowerCase()) || key.toLowerCase().includes(sectorLower)) {
        matched.push(...charts);
      }
    }
    sector.charts = matched.length > 0 ? matched : (sector.charts ?? []);
  }

  // Unmatched charts — try partial word match
  for (const [sectorName, charts] of Object.entries(chartsBySector)) {
    const alreadyMatched = validated.sectors.some(s =>
      s.name.toLowerCase().includes(sectorName.toLowerCase()) ||
      sectorName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (!alreadyMatched && charts.length > 0) {
      const existing = validated.sectors.find(s =>
        s.name.toLowerCase().split(/\s+/).some(w => sectorName.toLowerCase().includes(w))
      );
      if (existing && (existing.charts ?? []).length < 2) {
        existing.charts = [...(existing.charts ?? []), ...charts.slice(0, 2 - (existing.charts?.length ?? 0))];
      }
    }
  }

  // Attach article sources for in-text citations
  validated.sources_used = articles.map(a => ({
    source: a.source,
    title: a.title,
    url: a.url,
    publishedAt: a.publishedAt,
  }));

  return validated;
}

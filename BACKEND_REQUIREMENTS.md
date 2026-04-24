# Backend Requirements — Economic Cascade Analyzer

## Overview

The backend serves the Economic Cascade Analyzer frontend by accepting a news event description and a list of news sources, then returning three sequential JSON responses: a Consistency Report, Cascade Data, and Summary Data. The backend is responsible for fetching/searching news articles, extracting facts, cross-referencing sources, performing cascading economic impact analysis (using an LLM), and generating chart-ready summary data.

The frontend calls three endpoints sequentially. Each must return JSON conforming exactly to the schemas below.

---

## API Endpoints

### 1. `POST /api/consistency`

Analyzes the news event across selected sources and returns a fact consistency report.

**Request Body:**
```json
{
  "event": "string (10-500 characters)",
  "sources": ["string"] // e.g. ["NYT", "Reuters", "Bloomberg"]
}
```

**Response — `ConsistencyReport`:**
```json
{
  "unknown_percentage": 12,
  "no_sources_found": false,
  "facts": [
    {
      "id": "fact-1",
      "statement": "The US has imposed a 25% tariff on imported coffee beans.",
      "status": "consistent",
      "agreement_percentage": 100,
      "supporting_sources": ["NYT", "Reuters", "Bloomberg"],
      "contradicting_sources": []
    }
  ]
}
```

**Field Details:**

| Field | Type | Description |
|---|---|---|
| `unknown_percentage` | number [0, 100] | Percentage of information that could not be verified across sources |
| `no_sources_found` | boolean | `true` if the backend could not find ANY articles related to the event from the selected sources. When `true`, `facts` should be an empty array. |
| `facts` | array | List of extracted facts |
| `facts[].id` | string | Unique identifier for this fact (used to link to impacts later) |
| `facts[].statement` | string | The factual claim extracted from sources |
| `facts[].status` | `"consistent"` \| `"inconsistent"` \| `"unverified"` | Whether sources agree on this fact |
| `facts[].agreement_percentage` | number [0, 100] | What percentage of the **selected** sources agree on this specific fact |
| `facts[].supporting_sources` | string[] | Names of sources that support this fact |
| `facts[].contradicting_sources` | string[] | Names of sources that contradict this fact |

**Key Behaviors:**
- If no articles can be found for the event from any selected source, return `{ "no_sources_found": true, "unknown_percentage": 100, "facts": [] }`
- The `agreement_percentage` is per-fact: (number of supporting sources) / (total selected sources) × 100
- A fact is `"consistent"` if agreement_percentage >= 70, `"inconsistent"` if < 70 and at least one source contradicts, `"unverified"` if no sources explicitly support or contradict
- Return at least 5-15 facts for a typical event to give the frontend enough data to display

---

### 2. `POST /api/cascade`

Takes the same event + sources and returns a recursive cascading impact breakdown by sector.

**Request Body:**
```json
{
  "event": "string",
  "sources": ["string"]
}
```

**Response — `CascadeData`:**
```json
{
  "sectors": [
    {
      "name": "Agriculture",
      "icon": "🌾",
      "impacts": [
        {
          "id": "ag-1",
          "title": "Coffee bean import costs surge",
          "description": "Direct 25% cost increase on all imported green coffee beans.",
          "type": "direct",
          "is_hidden_factor": false,
          "hidden_factor_category": null,
          "confidence": 0.95,
          "severity": 9,
          "causal_chain": ["US imposes 25% tariff", "Import costs rise 25%"],
          "originating_facts": ["fact-1"],
          "children": [
            {
              "id": "ag-1-1",
              "title": "Domestic roaster margin squeeze",
              "description": "US-based coffee roasters face compressed margins.",
              "type": "indirect",
              "is_hidden_factor": false,
              "hidden_factor_category": null,
              "confidence": 0.85,
              "severity": 7,
              "causal_chain": ["Tariff raises bean costs", "Roasters absorb partial cost", "Margins compress"],
              "originating_facts": ["fact-1", "fact-4"],
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Field Details:**

| Field | Type | Description |
|---|---|---|
| `sectors` | array | All economically impacted sectors. Include ALL relevant sectors — not a fixed list. |
| `sectors[].name` | string | Sector name (e.g., Agriculture, Energy, Transport, Finance, Retail, Health, Environment, Manufacturing, Tourism, Education, Real Estate, etc.) |
| `sectors[].icon` | string | Emoji representing the sector |
| `sectors[].impacts` | array | Top-level impacts for this sector, sorted by severity descending |
| `impacts[].id` | string | Unique identifier |
| `impacts[].title` | string | Short impact title |
| `impacts[].description` | string | 1-2 sentence description |
| `impacts[].type` | `"direct"` \| `"indirect"` | Whether this is a direct consequence of the event or an indirect cascading effect |
| `impacts[].is_hidden_factor` | boolean | `true` if this impact is NOT explicitly mentioned in any news source but inferred through analysis |
| `impacts[].hidden_factor_category` | string \| null | One of: `"Environmental Debt"`, `"Social Capital"`, `"Supply Chain Ripple"`, `"Regulatory Risk"`, `"Labor Market Shift"`, or `null` |
| `impacts[].confidence` | number [0.0, 1.0] | How confident the analysis is in this impact |
| `impacts[].severity` | number [1, 10] | Impact severity (10 = most severe) |
| `impacts[].causal_chain` | string[] | Ordered list of causal steps from the original event to this impact |
| `impacts[].originating_facts` | string[] | IDs of facts from the Consistency Report that this impact derives from |
| `impacts[].children` | Impact[] | **Recursive** — nested child impacts with the same structure. This is how cascading chains are represented. |

**Key Behaviors:**
- Impacts MUST be recursive. Each impact can have `children` which have the same structure, forming a tree. Example: "Strait of Hormuz blocked" → "food to South America disrupted" → "food shortages in South America"
- Include at least one `is_hidden_factor: true` impact per analysis — these are the hidden economic factors the Transparency Guardrail requires
- Hidden factors must have a valid `hidden_factor_category`
- Sort impacts by `severity` descending at every level of the tree
- Include ALL potentially related sectors, not just obvious ones. Think about second and third-order effects.
- `originating_facts` should reference fact IDs from the Consistency Report response
- Aim for 3-10 impacts per sector, with recursive depth of 2-4 levels for the most significant chains

---

### 3. `POST /api/summary`

Generates chart-ready summary data and narrative text for the Summary Infographic page.

**Request Body:**
```json
{
  "event": "string",
  "sources": ["string"]
}
```

**Response — `SummaryData`:**
```json
{
  "sectors": [
    {
      "name": "Agriculture",
      "icon": "🌾",
      "summary_blurb": "Agriculture bears the heaviest direct impact...",
      "worldwide_implications": "Global coffee trade worth $460B annually faces restructuring...",
      "charts": [
        {
          "chart_type": "bar",
          "title": "Projected Coffee Price Impact by Category",
          "labels": ["Green Beans", "Roasted Retail", "Café Beverages"],
          "datasets": [
            {
              "label": "Price Increase (%)",
              "values": [25, 22, 18]
            }
          ]
        }
      ],
      "impacts_summary": [
        {
          "title": "Coffee bean import costs surge",
          "description": "Direct 25% cost increase on all imported green coffee beans.",
          "severity": 9
        }
      ]
    }
  ],
  "hidden_factors_summary": [
    {
      "factor": "Carbon emissions from rerouted coffee logistics",
      "category": "Environmental Debt",
      "explanation": "Rerouting coffee supply chains adds 15-20% more shipping miles, increasing carbon emissions."
    }
  ],
  "narrative_summary": "The US imposition of a 25% tariff on imported coffee triggers a far-reaching cascade..."
}
```

**Field Details:**

| Field | Type | Description |
|---|---|---|
| `sectors` | array | One entry per sector, matching the sectors from Cascade Data |
| `sectors[].name` | string | Must match the sector name from Cascade Data |
| `sectors[].icon` | string | Must match the sector icon from Cascade Data |
| `sectors[].summary_blurb` | string | 1-3 sentence overview of how this sector is impacted. Displayed at the top of each sector section. |
| `sectors[].worldwide_implications` | string | Description of global/worldwide impact for this sector |
| `sectors[].charts` | array | One or more charts appropriate for this sector. Use whatever chart types best represent the data. |
| `charts[].chart_type` | string | One of: `"bar"`, `"pie"`, `"donut"`, `"line"`, `"area"` |
| `charts[].title` | string | Chart title |
| `charts[].labels` | string[] | X-axis labels or pie segment labels |
| `charts[].datasets` | array | One or more data series |
| `datasets[].label` | string | Series name (shown in legend) |
| `datasets[].values` | number[] | Numeric values, same length as `labels` |
| `sectors[].impacts_summary` | array | Top impacts for this sector with title, description, severity |
| `hidden_factors_summary` | array | Aggregated list of ALL hidden factors across all sectors |
| `hidden_factors_summary[].factor` | string | Name of the hidden factor |
| `hidden_factors_summary[].category` | string | One of: `"Environmental Debt"`, `"Social Capital"`, `"Supply Chain Ripple"`, `"Regulatory Risk"`, `"Labor Market Shift"` |
| `hidden_factors_summary[].explanation` | string | 2-3 sentence explanation of the causal reasoning |
| `narrative_summary` | string | Multi-paragraph plain-text summary of the entire analysis. Can use `\n` for paragraph breaks. |

**Key Behaviors:**
- Each sector should have at least 1 chart, but can have multiple
- Chart types should vary based on what makes sense for the data (don't force bar charts everywhere)
- `datasets[].values` array MUST be the same length as `labels` array
- The `narrative_summary` should tie together the key findings across all sectors in plain language
- Hidden factors summary should aggregate ALL hidden factors from the Cascade Data

---

## Error Handling

All endpoints should return standard HTTP error codes:

| Status | When |
|---|---|
| 200 | Success |
| 400 | Invalid request (event too short/long, no sources provided) |
| 404 | No sources found (alternatively, return 200 with `no_sources_found: true`) |
| 500 | Internal server error (LLM failure, API timeout, etc.) |

Error response body:
```json
{
  "error": "string describing what went wrong"
}
```

The frontend displays the error message and provides a retry button, so make error messages user-friendly.

---

## Implementation Notes for Backend Team

1. **LLM Integration**: Use an LLM (Claude, GPT, etc.) to analyze the news event, extract facts, determine consistency, generate cascading impacts, and produce summary text/chart data. The LLM should be prompted to think about indirect and hidden economic effects.

2. **News Source Search**: You'll need a way to search/fetch articles from the selected sources. Options:
   - News API (newsapi.org)
   - Web scraping
   - Pre-cached article database
   - Or simply pass the source names to the LLM and let it use its training data (fastest for hackathon)

3. **Sequential Responses**: The frontend calls the three endpoints sequentially (consistency → cascade → summary). Each can take a few seconds. The frontend shows loading spinners between steps.

4. **CORS**: Enable CORS for the frontend origin (likely `http://localhost:5173` during dev).

5. **Hidden Factor Categories**: The five valid categories are:
   - Environmental Debt
   - Social Capital
   - Supply Chain Ripple
   - Regulatory Risk
   - Labor Market Shift

6. **Sector Selection**: Don't use a fixed list of sectors. Dynamically determine which sectors are relevant based on the event. Include both obvious and non-obvious sectors.

7. **Recursive Impacts**: The `children` field in impacts is critical — this is how the frontend renders the cascading tree. Make sure to generate meaningful causal chains at depth 2-4.

8. **Chart Data Quality**: The `values` array in chart datasets MUST have the same length as the `labels` array. Use realistic numbers, not random values.

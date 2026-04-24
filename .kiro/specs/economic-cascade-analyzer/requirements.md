# Requirements Document

## Introduction

The Economic Cascade Analyzer is a tool that accepts a natural language description of a news event and produces an interactive visual graph showing the direct, indirect, and second-order economic effects of that event. The system ingests multiple news articles, uses an LLM to extract structured causal chains, triangulates claims across sources, scores confidence based on source agreement, and renders the result as an interactive force graph or collapsible tree.

The three major components are:

- **Ingestion Layer**: fetches and embeds articles from news APIs, stores them in a vector store
- **Analysis Layer**: prompts an LLM to produce a structured JSON cascade document
- **Visualization Layer**: renders the JSON cascade document as an interactive graph

The JSON cascade document is the contract between all three components and its schema is defined in Requirement 6.

---

## Glossary

- **Cascade_Document**: The structured JSON object produced by the Analysis Layer and consumed by the Visualization Layer. Its schema is defined in Requirement 6.
- **Claim**: A single asserted causal relationship between two economic effects (e.g., "oil supply disruption → fuel price increase").
- **Confidence_Score**: A numeric value in the range [0.0, 1.0] representing the degree of source agreement for a given Claim or node.
- **Direct_Effect**: An economic consequence that follows immediately and causally from the triggering news event.
- **Indirect_Effect**: An economic consequence that follows from a Direct_Effect rather than from the triggering event itself.
- **Second_Order_Effect**: An economic consequence that follows from an Indirect_Effect.
- **Ingestion_Layer**: The system component responsible for accepting user queries, fetching articles, chunking, embedding, and storing them in the Vector_Store.
- **Analysis_Layer**: The system component responsible for prompting the LLM and producing the Cascade_Document.
- **Visualization_Layer**: The system component responsible for rendering the Cascade_Document as an interactive graph.
- **Vector_Store**: An in-memory or ChromaDB-backed store that holds embedded article chunks and supports semantic similarity search.
- **Source**: A news article retrieved from NewsAPI or GDELT that is used to support or contradict a Claim.
- **Source_Agreement**: The state where two or more Sources independently support the same Claim.
- **Source_Conflict**: The state where two or more Sources make contradictory assertions about the same Claim.
- **LLM**: The large language model used by the Analysis Layer to extract causal chains from article chunks.
- **Node**: A single effect (Direct, Indirect, or Second_Order) represented as a vertex in the rendered graph.
- **Edge**: A directed causal link between two Nodes in the rendered graph.

---

## Requirements

### Requirement 1: Natural Language Event Input

**User Story:** As an analyst, I want to describe a news event in plain language, so that I can trigger a cascade analysis without needing to write structured queries.

#### Acceptance Criteria

1. THE Ingestion_Layer SHALL accept a free-text string of at least 10 characters and at most 1000 characters as the triggering event description.
2. WHEN the user submits an event description shorter than 10 characters, THE Ingestion_Layer SHALL return a validation error message that states the minimum length requirement.
3. WHEN the user submits an event description longer than 1000 characters, THE Ingestion_Layer SHALL return a validation error message that states the maximum length requirement.
4. THE Ingestion_Layer SHALL treat the event description as the primary search query for article retrieval.

---

### Requirement 2: Article Ingestion and Embedding

**User Story:** As an analyst, I want the system to automatically pull relevant news articles, so that the analysis is grounded in real reporting rather than LLM hallucination.

#### Acceptance Criteria

1. WHEN an event description is submitted, THE Ingestion_Layer SHALL query at least one of NewsAPI or GDELT and retrieve a minimum of 5 and a maximum of 20 articles per query.
2. WHEN fewer than 5 articles are returned by the news source, THE Ingestion_Layer SHALL surface a warning to the user indicating low source coverage before proceeding.
3. THE Ingestion_Layer SHALL chunk each retrieved article into segments of at most 512 tokens.
4. THE Ingestion_Layer SHALL embed each chunk using a text embedding model and store the resulting vectors in the Vector_Store.
5. WHEN an article retrieval request to NewsAPI or GDELT fails, THE Ingestion_Layer SHALL log the error and attempt retrieval from the remaining configured source before returning an error to the user.
6. THE Vector_Store SHALL support semantic similarity search so that the Analysis_Layer can retrieve the top-K most relevant chunks for a given Claim.

---

### Requirement 3: Structured Causal Chain Extraction

**User Story:** As an analyst, I want the system to identify direct, indirect, and second-order economic effects, so that I can understand the full downstream impact of an event.

#### Acceptance Criteria

1. WHEN article chunks are available in the Vector_Store, THE Analysis_Layer SHALL prompt the LLM with a structured prompt that instructs it to identify Direct_Effects, Indirect_Effects, and Second_Order_Effects.
2. THE Analysis_Layer SHALL produce a Cascade_Document that conforms to the schema defined in Requirement 6.
3. THE Analysis_Layer SHALL identify at least one Direct_Effect for any submitted event description that has retrievable articles.
4. WHEN the LLM returns a response that does not conform to the Cascade_Document schema, THE Analysis_Layer SHALL retry the LLM call up to 2 additional times before returning a structured error.
5. THE Analysis_Layer SHALL associate each Claim in the Cascade_Document with the identifiers of the Source chunks that support it.

---

### Requirement 4: Multi-Source Claim Triangulation

**User Story:** As an analyst, I want to know which claims are supported by multiple sources and which are contested, so that I can assess the reliability of each effect in the cascade.

#### Acceptance Criteria

1. THE Analysis_Layer SHALL compare Claims across all retrieved Sources and record Source_Agreement when two or more Sources independently assert the same causal relationship.
2. THE Analysis_Layer SHALL record Source_Conflict when two or more Sources make contradictory assertions about the same causal relationship.
3. THE Cascade_Document SHALL include, for each Claim, a list of supporting Source identifiers and a list of conflicting Source identifiers.
4. WHEN a Claim is supported by only one Source, THE Analysis_Layer SHALL mark that Claim with a `single_source` flag in the Cascade_Document.

---

### Requirement 5: Confidence Scoring

**User Story:** As an analyst, I want each node in the cascade to display a confidence level, so that I can quickly distinguish well-supported effects from speculative ones.

#### Acceptance Criteria

1. THE Analysis_Layer SHALL compute a Confidence_Score for each Node using the formula: `supporting_sources / (supporting_sources + conflicting_sources)`, where both counts are taken from the Cascade_Document.
2. WHEN a Node has zero supporting and zero conflicting Sources, THE Analysis_Layer SHALL assign it a Confidence_Score of 0.0.
3. THE Cascade_Document SHALL include the Confidence_Score for every Node.
4. THE Visualization_Layer SHALL color-code each Node according to its Confidence_Score using a continuous scale from red (0.0) to green (1.0).
5. WHEN a Node carries the `single_source` flag, THE Visualization_Layer SHALL render a visual indicator (such as a dashed border) on that Node in addition to its color-coded confidence.

---

### Requirement 6: Cascade Document JSON Schema (Component Contract)

**User Story:** As a developer, I want a locked JSON schema that all three components agree on, so that the Ingestion Layer, Analysis Layer, and Visualization Layer can be developed and tested independently.

#### Acceptance Criteria

1. THE Analysis_Layer SHALL produce a Cascade_Document that is a valid JSON object conforming to the following schema:

```json
{
  "event": "string",
  "retrieved_at": "ISO 8601 datetime string",
  "sources": [
    {
      "id": "string (unique identifier)",
      "url": "string",
      "title": "string",
      "published_at": "ISO 8601 datetime string"
    }
  ],
  "nodes": [
    {
      "id": "string (unique identifier)",
      "label": "string (human-readable effect description)",
      "type": "direct | indirect | second_order",
      "confidence_score": "number [0.0, 1.0]",
      "single_source": "boolean",
      "supporting_source_ids": ["string"],
      "conflicting_source_ids": ["string"]
    }
  ],
  "edges": [
    {
      "from_node_id": "string",
      "to_node_id": "string",
      "label": "string (optional causal description)"
    }
  ]
}
```

2. THE Analysis_Layer SHALL ensure that every `from_node_id` and `to_node_id` in the `edges` array references an `id` that exists in the `nodes` array.
3. THE Analysis_Layer SHALL ensure that every `id` in the `supporting_source_ids` and `conflicting_source_ids` arrays references an `id` that exists in the `sources` array.
4. THE Visualization_Layer SHALL accept any Cascade_Document that is valid against this schema and render it without requiring knowledge of how it was produced.
5. FOR ALL valid Cascade_Documents, serializing the document to JSON and deserializing it SHALL produce an equivalent Cascade_Document (round-trip property).

---

### Requirement 7: Interactive Graph Visualization

**User Story:** As an analyst, I want to explore the cascade as an interactive graph, so that I can drill into specific effects and understand the causal chain at my own pace.

#### Acceptance Criteria

1. WHEN a Cascade_Document is available, THE Visualization_Layer SHALL render all Nodes and Edges as an interactive graph using D3.js.
2. THE Visualization_Layer SHALL support both a force-directed layout and a collapsible tree layout, selectable by the user.
3. WHEN the user clicks a Node, THE Visualization_Layer SHALL display a detail panel showing the Node's label, type, Confidence_Score, and the titles and URLs of its supporting and conflicting Sources.
4. THE Visualization_Layer SHALL allow the user to drag Nodes to reposition them without triggering a re-analysis.
5. WHEN the Cascade_Document contains more than 50 Nodes, THE Visualization_Layer SHALL render the graph with Direct_Effect Nodes expanded and Indirect_Effect and Second_Order_Effect Nodes collapsed by default.
6. THE Visualization_Layer SHALL render the graph within 2 seconds of receiving a valid Cascade_Document of up to 50 Nodes on a modern browser.

---

### Requirement 8: End-to-End Analysis Pipeline

**User Story:** As an analyst, I want to type an event and see the full cascade graph rendered automatically, so that I can get insights without manually coordinating the three components.

#### Acceptance Criteria

1. WHEN the user submits an event description, THE System SHALL orchestrate the Ingestion_Layer, Analysis_Layer, and Visualization_Layer in sequence and render the final graph without requiring manual intervention between steps.
2. THE System SHALL display a progress indicator to the user during each pipeline stage (ingestion, analysis, rendering).
3. WHEN any pipeline stage fails, THE System SHALL display a descriptive error message identifying which stage failed and provide the user with an option to retry.
4. THE System SHALL complete the full pipeline from event submission to graph render within 60 seconds for a query that retrieves 10 articles on a standard internet connection.

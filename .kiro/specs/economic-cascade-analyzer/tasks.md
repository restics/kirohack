# Implementation Plan: Economic Cascade Analyzer

## Overview

Implementation follows a five-stage demoable-first build order. Each stage produces something runnable before the next stage begins. The `CascadeDocument` TypeScript schema is locked in at Stage 1 and never changes. All property-based tests use fast-check v3.x.

---

## Tasks

- [x] 1. Stage 1 — Lock the schema and render the static demo
  - [x] 1.1 Define all shared TypeScript interfaces and the Cascade_Document schema
    - Create `src/shared/types.ts` with `CascadeDocument`, `CascadeNode`, `CascadeEdge`, `Source`, `IngestionRequest`, `IngestionResult`, `AnalysisRequest`, `AnalysisResult`, `VectorStore`, `EmbeddedChunk`, `ChunkResult`, `ChunkMetadata`
    - This file is the single source of truth for all three layers; no other file may redefine these types
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.2 Create the hardcoded Strait of Hormuz `CascadeDocument` fixture
    - Create `src/shared/fixtures/hormuz.ts` exporting a `HORMUZ_CASCADE: CascadeDocument` constant
    - Include 3 mock sources, 8 nodes (2 direct, 3 indirect, 3 second_order), 7 edges, confidence scores spanning 0.33–1.0
    - _Requirements: 6.1, 4.3 (data section)_

  - [x] 1.3 Write property test — JSON round-trip preserves the Cascade_Document (Property 13)
    - File: `tests/unit/shared/cascade_document_roundtrip.test.ts`
    - Use fast-check to generate arbitrary `CascadeDocument`-shaped objects and assert `JSON.parse(JSON.stringify(doc))` is deeply equal to the original
    - **Property 13: JSON round-trip preserves the Cascade_Document**
    - **Validates: Requirements 6.5**

  - [x] 1.4 Implement the React + D3.js Visualization Layer — force-directed layout
    - Create `src/frontend/components/CascadeGraph.tsx` accepting `VisualizationProps`
    - Render nodes and edges using D3 force simulation; color nodes with `d3.interpolateRdYlGn` mapped to `confidence_score`
    - Render dashed border on nodes where `single_source === true`
    - _Requirements: 7.1, 5.4, 5.5_

  - [x] 1.5 Implement the collapsible tree layout
    - Add tree layout mode to `CascadeGraph.tsx` using D3 hierarchy
    - Wire the layout toggle so the user can switch between `'force'` and `'tree'`
    - _Requirements: 7.2_

  - [x] 1.6 Implement the node detail panel
    - Create `src/frontend/components/NodeDetailPanel.tsx`
    - On node click, display label, type, confidence score (numeric + color swatch), supporting source titles/URLs, conflicting source titles/URLs, and `single_source` warning badge
    - _Requirements: 7.3, 5.5_

  - [x] 1.7 Implement auto-collapse for large documents (> 50 nodes)
    - In `CascadeGraph.tsx`, detect `nodes.length > 50` on mount and set initial collapsed state for all `indirect` and `second_order` nodes
    - _Requirements: 7.5_

  - [x] 1.8 Write property test — Visualization renders all nodes and edges (Property 14)
    - File: `tests/unit/visualization/render_completeness.test.ts`
    - Use fast-check to generate valid `CascadeDocument` objects; assert rendered DOM contains exactly `nodes.length` node elements and `edges.length` edge elements without throwing
    - **Property 14: Visualization renders all nodes and edges from any valid document**
    - **Validates: Requirements 6.4, 7.1**

  - [x] 1.9 Write property test — Node detail panel shows correct data (Property 15)
    - File: `tests/unit/visualization/detail_panel.test.ts`
    - Use fast-check to generate a valid `CascadeDocument` and a random node index; simulate click and assert panel displays correct label, type, confidence_score, and source titles/URLs
    - **Property 15: Node detail panel shows correct data for any clicked node**
    - **Validates: Requirements 7.3**

  - [x] 1.10 Write property test — Auto-collapse for large documents (Property 16)
    - File: `tests/unit/visualization/auto_collapse.test.ts`
    - Generate `CascadeDocument` objects with > 50 nodes; assert initial render has all `direct` nodes expanded and all `indirect`/`second_order` nodes collapsed
    - **Property 16: Auto-collapse for large documents**
    - **Validates: Requirements 7.5**

  - [x] 1.11 Write property test — Color mapping is monotone (Property 12)
    - File: `tests/unit/visualization/color_mapping.test.ts`
    - Use fast-check to generate pairs `x < y` in [0.0, 1.0]; assert `greenChannel(color(y)) >= greenChannel(color(x))`
    - **Property 12: Color mapping is monotone on the confidence scale**
    - **Validates: Requirements 5.4**

  - [x] 1.12 Wire the static demo into the frontend app shell
    - Create `src/frontend/App.tsx` that imports `HORMUZ_CASCADE` and renders `<CascadeGraph cascade_document={HORMUZ_CASCADE} layout="force" />`
    - The app must be runnable with `npm run dev` and show the Hormuz graph without any backend
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Stage 1 checkpoint — Static demo is demoable
  - Ensure all Stage 1 tests pass, ask the user if questions arise before proceeding to Stage 2.

- [ ] 3. Stage 2 — Single-article LLM pipeline
  - [x] 3.1 Implement the LLM adapter interface and OpenAI adapter
    - Create `src/backend/llm/LLMAdapter.ts` with interface `{ complete(prompt: string): Promise<string> }`
    - Create `src/backend/llm/OpenAIAdapter.ts` implementing the interface using the OpenAI chat completions API with JSON mode enabled
    - _Requirements: 3.1, 3.4_

  - [x] 3.2 Implement the Anthropic adapter
    - Create `src/backend/llm/AnthropicAdapter.ts` implementing `LLMAdapter` using the Anthropic Messages API
    - _Requirements: 3.1_

  - [x] 3.3 Implement the Analysis Layer — prompt construction and LLM call
    - Create `src/backend/analysis/AnalysisLayer.ts`
    - Build the structured prompt from `AnalysisRequest` (event description + article chunks)
    - Call the LLM adapter and parse the response as JSON
    - _Requirements: 3.1, 3.2_

  - [x] 3.4 Implement schema validation and retry logic
    - Validate the parsed JSON against the `CascadeDocument` schema (use `zod` or equivalent)
    - On validation failure, retry the LLM call up to 2 additional times (3 total attempts)
    - On all 3 failures, return a structured `AnalysisError` with the last raw LLM response
    - _Requirements: 3.4_

  - [ ] 3.5 Implement confidence scoring and `single_source` flag computation
    - After receiving the LLM response, compute `confidence_score = supporting / (supporting + conflicting)` for each node; assign `0.0` when both counts are zero
    - Set `single_source = true` iff `supporting_source_ids.length === 1 && conflicting_source_ids.length === 0`
    - _Requirements: 5.1, 5.2, 4.4_

  - [ ] 3.6 Write property test — Cascade_Document schema conformance (Property 5)
    - File: `tests/unit/analysis/schema_validation.test.ts`
    - Use fast-check to generate arbitrary objects; assert that only objects matching the full schema pass validation, and that the Analysis Layer never returns a document that fails validation
    - **Property 5: Cascade_Document schema conformance**
    - **Validates: Requirements 3.2, 5.3, 6.1**

  - [ ] 3.7 Write property test — Referential integrity of edges and source references (Property 7)
    - File: `tests/unit/analysis/referential_integrity.test.ts`
    - Use fast-check to generate valid `CascadeDocument` objects; assert every `from_node_id`/`to_node_id` exists in `nodes[*].id` and every source reference exists in `sources[*].id`
    - **Property 7: Referential integrity of edges and source references**
    - **Validates: Requirements 3.5, 6.2, 6.3**

  - [ ] 3.8 Write property test — Confidence score formula correctness (Property 11)
    - File: `tests/unit/analysis/confidence_score.test.ts`
    - Use fast-check to generate non-negative integer pairs `(s, c)`; assert `computeConfidence(s, c) === (s + c > 0 ? s / (s + c) : 0.0)`
    - **Property 11: Confidence score formula correctness**
    - **Validates: Requirements 5.1, 5.2**

  - [ ] 3.9 Write property test — Single-source flag invariant (Property 10)
    - File: `tests/unit/analysis/confidence_score.test.ts` (same file as 3.8)
    - Use fast-check to generate nodes with varying source ID arrays; assert `single_source` is `true` iff `supporting.length === 1 && conflicting.length === 0`
    - **Property 10: Single-source flag invariant**
    - **Validates: Requirements 4.4**

  - [ ] 3.10 Write unit test — LLM retry logic makes exactly 3 attempts on repeated schema failures
    - File: `tests/unit/analysis/schema_validation.test.ts`
    - Mock the LLM adapter to always return invalid JSON; assert the adapter is called exactly 3 times and an `AnalysisError` is returned
    - _Requirements: 3.4_

- [ ] 4. Stage 2 checkpoint — Single-article LLM pipeline works
  - Ensure all Stage 2 tests pass, ask the user if questions arise before proceeding to Stage 3.

- [ ] 5. Stage 3 — Multi-source ingestion and claim triangulation
  - [ ] 5.1 Implement input validation in the Ingestion Layer
    - Create `src/backend/ingestion/IngestionLayer.ts`
    - Validate `event_description` length: reject with `ValidationError` if < 10 or > 1000 characters, including the specific limit in the error message
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 5.2 Write property test — Input validation accepts valid lengths and rejects invalid lengths (Property 1)
    - File: `tests/unit/ingestion/validate_input.test.ts`
    - Use fast-check to generate strings of arbitrary length; assert acceptance iff length ∈ [10, 1000] and rejection with correct error message otherwise
    - **Property 1: Input validation accepts valid lengths and rejects invalid lengths**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ] 5.3 Implement NewsAPI article retrieval
    - Add `fetchFromNewsAPI(query: string, max: number): Promise<Source[]>` to the Ingestion Layer
    - Retrieve 5–20 articles; surface a warning in `IngestionResult.warnings` when fewer than 5 are returned
    - _Requirements: 2.1, 2.2_

  - [ ] 5.4 Implement GDELT fallback
    - Add `fetchFromGDELT(query: string, max: number): Promise<Source[]>`
    - On NewsAPI failure, log the error and attempt GDELT; if both fail, return `IngestionError`
    - _Requirements: 2.5_

  - [ ] 5.5 Implement article chunker
    - Create `src/backend/ingestion/chunker.ts`
    - Split article text on sentence boundaries targeting 400 tokens per chunk with 50-token overlap; hard cap at 512 tokens
    - Attach metadata `{ source_id, chunk_index, token_count }` to each chunk
    - _Requirements: 2.3_

  - [ ] 5.6 Write property test — All chunks are within the token limit (Property 3)
    - File: `tests/unit/ingestion/chunker.test.ts`
    - Use fast-check to generate arbitrary article strings; assert every chunk produced has `token_count <= 512`
    - **Property 3: All chunks are within the token limit**
    - **Validates: Requirements 2.3**

  - [ ] 5.7 Implement `InMemoryVectorStore`
    - Create `src/backend/vectorstore/InMemoryVectorStore.ts` implementing the `VectorStore` interface
    - `upsert`: store chunks in a flat array
    - `search`: compute cosine similarity between query vector and all stored vectors; return top-K results in descending order
    - _Requirements: 2.4, 2.6_

  - [ ] 5.8 Write property test — Vector store top-K search returns the closest chunks (Property 4)
    - File: `tests/unit/analysis/referential_integrity.test.ts` (or a dedicated `vector_store.test.ts`)
    - Use fast-check to generate a set of random vectors and a query vector; assert the top-K results are the K vectors with highest cosine similarity in descending order
    - **Property 4: Vector store top-K search returns the closest chunks**
    - **Validates: Requirements 2.6**

  - [ ] 5.9 Implement `ChromaDBVectorStore`
    - Create `src/backend/vectorstore/ChromaDBVectorStore.ts` implementing the `VectorStore` interface using the ChromaDB HTTP client
    - _Requirements: 2.4, 2.6_

  - [ ] 5.10 Implement embedding and chunk storage in the Ingestion Layer
    - Add embedding step using `text-embedding-3-small` (OpenAI) with `all-MiniLM-L6-v2` as local fallback
    - Call `vectorStore.upsert()` with the embedded chunks
    - Return `chunk_ids` and `sources` in `IngestionResult`
    - _Requirements: 2.4_

  - [ ] 5.11 Implement claim triangulation in the Analysis Layer
    - After collecting nodes from the LLM, compare node labels using cosine similarity (threshold ≥ 0.85)
    - Merge `supporting_source_ids` for nodes that match; populate `conflicting_source_ids` for nodes that contradict (negation keywords + low similarity)
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 5.12 Write property test — Source agreement produces multiple supporting IDs (Property 8)
    - File: `tests/unit/analysis/triangulation.test.ts`
    - Use fast-check to generate scenarios where ≥ 2 sources assert the same claim; assert `supporting_source_ids.length >= 2` and both source arrays are present on every node
    - **Property 8: Source agreement produces multiple supporting IDs; every node has source arrays**
    - **Validates: Requirements 4.1, 4.3**

  - [ ] 5.13 Write property test — Source conflict populates conflicting source IDs (Property 9)
    - File: `tests/unit/analysis/triangulation.test.ts`
    - Use fast-check to generate scenarios where ≥ 2 sources contradict the same claim; assert `conflicting_source_ids.length >= 1`
    - **Property 9: Source conflict populates conflicting source IDs**
    - **Validates: Requirements 4.2**

  - [ ] 5.14 Write property test — Article count is bounded (Property 2)
    - File: `tests/unit/ingestion/validate_input.test.ts`
    - Use fast-check to generate valid event descriptions; mock the news API to return varying article counts; assert returned source count ≤ 20 and that a warning is present when count < 5
    - **Property 2: Article count is bounded**
    - **Validates: Requirements 2.1, 2.2**

- [ ] 6. Stage 3 checkpoint — Multi-source ingestion and triangulation work
  - Ensure all Stage 3 tests pass, ask the user if questions arise before proceeding to Stage 4.

- [ ] 7. Stage 4 — Confidence scoring wired end-to-end
  - [ ] 7.1 Wire confidence scoring into the full Analysis Layer output
    - Ensure `computeConfidence` and `setSingleSourceFlag` are called on every node after triangulation, not just in isolation
    - Verify the final `CascadeDocument` has `confidence_score` and `single_source` populated on every node before it leaves the Analysis Layer
    - _Requirements: 5.1, 5.2, 5.3, 4.4_

  - [ ] 7.2 Write unit test — `single_source` visual indicator is present on flagged nodes
    - File: `tests/unit/visualization/detail_panel.test.ts`
    - Render a `CascadeDocument` containing at least one `single_source: true` node; assert the dashed-border indicator is present in the DOM for that node
    - _Requirements: 5.5_

- [ ] 8. Stage 4 checkpoint — Confidence scoring is correct end-to-end
  - Ensure all Stage 4 tests pass, ask the user if questions arise before proceeding to Stage 5.

- [ ] 9. Stage 5 — Live end-to-end pipeline
  - [ ] 9.1 Implement the backend orchestrator with SSE streaming
    - Create `src/backend/api/routes/analyze.ts` (or equivalent FastAPI route)
    - Accept `POST /api/analyze` with `{ event_description: string }`
    - Orchestrate Ingestion Layer → Analysis Layer in sequence
    - Stream SSE events: `ingestion_started`, `ingestion_complete`, `analysis_started`, `analysis_complete`, `render_ready` (with `cascade_document`), and `error` (with `failed_stage` and `message`)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 9.2 Implement the `GET /api/health` endpoint
    - Return `{ status: "ok" }`
    - _Requirements: 8.1 (infrastructure)_

  - [ ] 9.3 Implement pipeline error handling and timeout
    - On any stage failure, emit `{ stage: "error", failed_stage, message }` SSE event
    - Cancel in-flight LLM requests and clean up vector store session on client disconnect
    - Emit timeout error with partial results if pipeline exceeds 60 seconds
    - _Requirements: 8.3, 8.4_

  - [ ] 9.4 Implement the frontend SSE client and progress indicator
    - Create `src/frontend/hooks/useAnalysis.ts` that opens an `EventSource` to `POST /api/analyze`
    - Display a progress indicator for each pipeline stage (`ingestion_started`, `analysis_started`, etc.)
    - On `render_ready`, pass the `cascade_document` to `<CascadeGraph />`
    - On `error`, display a descriptive error message identifying the failed stage with a retry option
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 9.5 Replace the static Hormuz fixture with the live pipeline in `App.tsx`
    - Remove the hardcoded `HORMUZ_CASCADE` import
    - Add an event description text input (10–1000 chars) and a submit button
    - Wire the input to `useAnalysis` and render the returned `CascadeDocument`
    - _Requirements: 1.1, 1.4, 8.1_

  - [ ] 9.6 Write unit test — SSE events are emitted for each pipeline stage
    - File: `tests/unit/` (orchestrator or pipeline test)
    - Mock Ingestion and Analysis layers; assert all five stage events are emitted in order for a successful run
    - _Requirements: 8.2_

  - [ ] 9.7 Write unit test — Error message identifies the failed stage
    - Mock the Analysis Layer to throw; assert the SSE `error` event contains the correct `failed_stage` value
    - _Requirements: 8.3_

  - [ ] 9.8 Write unit test — Drag interaction does not trigger re-analysis
    - Simulate a node drag event in `CascadeGraph`; assert no new `POST /api/analyze` request is made
    - _Requirements: 7.4_

  - [ ] 9.9 Write unit test — Both layout modes render without error
    - Render `CascadeGraph` with `layout="force"` and then `layout="tree"`; assert no errors are thrown and the graph is present in the DOM for both
    - _Requirements: 7.2_

  - [ ] 9.10 Write unit test — Fallback from NewsAPI to GDELT on failure
    - Mock NewsAPI to fail; assert GDELT is called and the pipeline proceeds
    - _Requirements: 2.5_

  - [ ] 9.11 Write integration test — Full pipeline with mocked external services
    - File: `tests/integration/pipeline.test.ts`
    - Mock NewsAPI/GDELT, LLM adapter, and embedding model; run the full pipeline from event submission to `render_ready` SSE event; assert a valid `CascadeDocument` is produced and the graph renders
    - _Requirements: 8.1_

  - [ ] 9.12 Write integration test — Vector store upsert + search round-trip
    - File: `tests/integration/vector_store.test.ts`
    - Upsert a set of chunks into `ChromaDBVectorStore`; run a similarity search; assert results are ordered by cosine similarity
    - _Requirements: 2.4, 2.6_

  - [ ] 9.13 Write smoke test — 50-node document renders in < 2 seconds
    - File: `tests/smoke/render_performance.test.ts`
    - Generate a 50-node `CascadeDocument`; measure render time; assert < 2000 ms
    - _Requirements: 7.6_

  - [ ] 9.14 Write smoke test — Full pipeline with mocked services completes in < 60 seconds
    - File: `tests/smoke/pipeline_sla.test.ts`
    - Run the full pipeline with mocked external services; assert total wall-clock time < 60 seconds
    - _Requirements: 8.4_

- [ ] 10. Final checkpoint — Full end-to-end pipeline is live
  - Ensure all tests pass (including integration and smoke tests), ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The `CascadeDocument` schema in `src/shared/types.ts` (Task 1.1) is the immutable contract — never change it without updating all three layers simultaneously
- Each stage produces a demoable artifact: Stage 1 = static graph, Stage 2 = LLM JSON, Stage 3 = real articles, Stage 4 = confidence colors, Stage 5 = live input
- Property tests use fast-check v3.x with a minimum of 100 iterations per property
- `InMemoryVectorStore` is used for Stages 1–2; swap to `ChromaDBVectorStore` at Stage 3+
- LLM keys must never be sent to the frontend; all LLM calls go through the backend orchestrator

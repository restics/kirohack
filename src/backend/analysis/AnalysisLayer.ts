/**
 * src/backend/analysis/AnalysisLayer.ts
 *
 * Analysis Layer — retrieves relevant chunks from the Vector Store, constructs
 * a structured prompt, calls the LLM adapter, parses the JSON response, and
 * validates it against the CascadeDocument Zod schema.
 *
 * Retry logic (task 3.4): on JSON parse failure or schema validation failure,
 * the LLM call is retried up to 2 additional times (3 total attempts).  If all
 * 3 attempts fail, an AnalysisError is thrown with the last raw LLM response.
 *
 * Requirements: 3.1, 3.2, 3.4
 */

import type { LLMAdapter } from '../llm/LLMAdapter.js';
import type {
  AnalysisRequest,
  AnalysisResult,
  VectorStore,
} from '../../shared/types.js';
import { CascadeDocumentSchema, AnalysisError } from './schema.js';
import { applyConfidenceScoring } from './confidence.js';

/** JSON schema description embedded in the system prompt so the LLM knows the expected shape. */
const CASCADE_DOCUMENT_SCHEMA = `{
  "event": "string — plain-language description of the triggering event",
  "retrieved_at": "string — ISO 8601 datetime when the document was produced",
  "sources": [
    {
      "id": "string — unique identifier, e.g. \\"src_001\\"",
      "url": "string",
      "title": "string",
      "published_at": "string — ISO 8601 datetime"
    }
  ],
  "nodes": [
    {
      "id": "string — unique identifier, e.g. \\"node_001\\"",
      "label": "string — human-readable effect description",
      "type": "\\"direct\\" | \\"indirect\\" | \\"second_order\\"",
      "confidence_score": "number in [0.0, 1.0]",
      "single_source": "boolean — true iff supported by exactly one source with no conflicts",
      "supporting_source_ids": ["string — source id"],
      "conflicting_source_ids": ["string — source id"]
    }
  ],
  "edges": [
    {
      "from_node_id": "string — must reference a node id",
      "to_node_id": "string — must reference a node id",
      "label": "string (optional) — causal description"
    }
  ]
}`;

/**
 * Builds the full prompt string from the event description and retrieved chunks.
 *
 * The prompt follows the structure defined in the design document (section 3.3):
 *   System: role + schema instruction
 *   User:   event description + article excerpts + task instruction
 */
function buildPrompt(
  eventDescription: string,
  chunks: Array<{ text: string; sourceId: string }>,
): string {
  const systemSection = [
    'System: You are an economic analyst. Given the following news article excerpts about an event,',
    'identify the direct, indirect, and second-order economic effects as a causal chain.',
    `Return ONLY a valid JSON object matching this schema: ${CASCADE_DOCUMENT_SCHEMA}`,
  ].join('\n');

  const excerpts = chunks
    .map((c) => `${c.text} (source_id: ${c.sourceId})`)
    .join('\n');

  const userSection = [
    `User: Event: ${eventDescription}`,
    '',
    'Article excerpts:',
    excerpts,
    '',
    'Identify all causal economic effects. For each effect, cite the source IDs that support it.',
  ].join('\n');

  return `${systemSection}\n\n${userSection}`;
}

/**
 * The Analysis Layer orchestrates chunk retrieval, prompt construction, LLM
 * invocation, and JSON parsing to produce an `AnalysisResult`.
 */
export class AnalysisLayer {
  private readonly llmAdapter: LLMAdapter;
  private readonly vectorStore: VectorStore;

  /**
   * @param llmAdapter  - LLM provider adapter (OpenAI, Anthropic, …)
   * @param vectorStore - Vector store holding embedded article chunks
   */
  constructor(llmAdapter: LLMAdapter, vectorStore: VectorStore) {
    this.llmAdapter = llmAdapter;
    this.vectorStore = vectorStore;
  }

  /**
   * Run the analysis pipeline for the given request.
   *
   * 1. Retrieve the top-10 most relevant chunks from the Vector Store.
   * 2. Build a structured prompt.
   * 3. Call the LLM adapter (up to 3 total attempts).
   * 4. Parse the response as JSON.
   * 5. Validate the parsed JSON against the CascadeDocument Zod schema.
   * 6. If both succeed, return the result.
   * 7. If either fails, store the error and retry.
   * 8. After 3 failures, throw an AnalysisError with the last raw response.
   *
   * @throws {AnalysisError} if all 3 LLM attempts fail JSON parsing or schema validation.
   * @throws {Error}         if the LLM adapter call itself fails (network error, etc.).
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    // Step 1 — retrieve the top-10 most relevant chunks for the event description
    const chunkResults = await this.vectorStore.search(
      request.event_description,
      10,
    );

    // Map chunk results to the shape expected by buildPrompt
    const chunks = chunkResults.map((cr) => ({
      text: cr.text,
      sourceId: cr.metadata.source_id,
    }));

    // Step 2 — construct the structured prompt
    const prompt = buildPrompt(request.event_description, chunks);

    // Steps 3–7 — call LLM, parse JSON, validate schema; retry up to 3 times total
    const MAX_ATTEMPTS = 3;
    let lastRawResponse = '';
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // Step 3 — call the LLM adapter
      const rawResponse = await this.llmAdapter.complete(prompt);
      lastRawResponse = rawResponse;

      try {
        // Step 4 — parse the JSON response
        const parsed: unknown = JSON.parse(rawResponse);

        // Step 5 — validate against the CascadeDocument Zod schema
        const result = CascadeDocumentSchema.safeParse(parsed);

        if (result.success) {
          // Step 6 — both succeeded; apply confidence scoring and return
          const scoredNodes = applyConfidenceScoring(result.data.nodes);
          return {
            cascade_document: {
              ...result.data,
              nodes: scoredNodes,
            },
          };
        }

        // Schema validation failed — store the error and retry
        lastError = result.error;
      } catch (parseError) {
        // JSON.parse threw a SyntaxError — store the error and retry
        lastError = parseError;
      }
    }

    // Step 8 — all 3 attempts failed; throw AnalysisError with the last raw response
    const errorMessage =
      lastError instanceof Error
        ? `LLM response failed schema validation after ${MAX_ATTEMPTS} attempts: ${lastError.message}`
        : `LLM response failed schema validation after ${MAX_ATTEMPTS} attempts`;

    throw new AnalysisError(errorMessage, lastRawResponse, MAX_ATTEMPTS);
  }
}

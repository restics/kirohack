/**
 * src/shared/types.ts
 *
 * Single source of truth for all TypeScript interfaces used across the
 * Ingestion Layer, Analysis Layer, and Visualization Layer.
 *
 * ⚠️  DO NOT redefine any of these types in other files.
 *     Import from this module instead.
 *
 * Requirements: 6.1, 6.2, 6.3
 */

// ---------------------------------------------------------------------------
// Cascade Document — the locked contract between all three layers
// ---------------------------------------------------------------------------

/**
 * A news article or other external source used to support or contradict a
 * causal claim in the cascade.
 */
export interface Source {
  /** Unique identifier, e.g. "src_001" */
  id: string;
  url: string;
  title: string;
  /** ISO 8601 datetime string */
  published_at: string;
}

/**
 * A single economic effect (Direct, Indirect, or Second_Order) represented
 * as a vertex in the rendered graph.
 */
export interface CascadeNode {
  /** Unique identifier, e.g. "node_001" */
  id: string;
  /** Human-readable effect description */
  label: string;
  type: 'direct' | 'indirect' | 'second_order';
  /** Confidence score in the range [0.0, 1.0] */
  confidence_score: number;
  /**
   * True iff this node is supported by exactly one source and has no
   * conflicting sources.
   */
  single_source: boolean;
  /** IDs of sources that support this causal claim */
  supporting_source_ids: string[];
  /** IDs of sources that contradict this causal claim */
  conflicting_source_ids: string[];
}

/**
 * A directed causal link between two CascadeNodes.
 */
export interface CascadeEdge {
  /** Must reference an id that exists in nodes */
  from_node_id: string;
  /** Must reference an id that exists in nodes */
  to_node_id: string;
  /** Optional human-readable causal description */
  label?: string;
}

/**
 * The top-level document produced by the Analysis Layer and consumed by the
 * Visualization Layer.  This is the immutable contract between all three
 * pipeline layers.
 *
 * Referential integrity rules (Requirements 6.2, 6.3):
 *   1. Every from_node_id / to_node_id in edges MUST exist in nodes[*].id
 *   2. Every id in supporting_source_ids / conflicting_source_ids MUST exist
 *      in sources[*].id
 *   3. confidence_score MUST be in [0.0, 1.0]
 *   4. type MUST be one of 'direct' | 'indirect' | 'second_order'
 */
export interface CascadeDocument {
  /** Plain-language description of the triggering event */
  event: string;
  /** ISO 8601 datetime string indicating when the document was produced */
  retrieved_at: string;
  sources: Source[];
  nodes: CascadeNode[];
  edges: CascadeEdge[];
}

// ---------------------------------------------------------------------------
// Ingestion Layer interfaces
// ---------------------------------------------------------------------------

/**
 * Input to the Ingestion Layer.
 */
export interface IngestionRequest {
  /** Free-text event description; must be 10–1000 characters */
  event_description: string;
  /** Maximum number of articles to retrieve; default 10, max 20 */
  max_articles?: number;
}

/**
 * Output from the Ingestion Layer.
 */
export interface IngestionResult {
  /** Metadata for all retrieved articles */
  sources: Source[];
  /** IDs of the vector chunks stored in the Vector Store */
  chunk_ids: string[];
  /** Non-fatal warnings, e.g. "only 3 articles found" */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Analysis Layer interfaces
// ---------------------------------------------------------------------------

/**
 * Input to the Analysis Layer.
 */
export interface AnalysisRequest {
  event_description: string;
  sources: Source[];
  chunk_ids: string[];
}

/**
 * Output from the Analysis Layer.
 */
export interface AnalysisResult {
  cascade_document: CascadeDocument;
}

// ---------------------------------------------------------------------------
// Vector Store interfaces
// ---------------------------------------------------------------------------

/**
 * Metadata attached to every stored chunk.
 */
export interface ChunkMetadata {
  source_id: string;
  chunk_index: number;
  token_count: number;
}

/**
 * A text chunk that has been embedded and is ready to be stored.
 */
export interface EmbeddedChunk {
  /** Unique chunk identifier */
  id: string;
  /** Embedding vector produced by the embedding model */
  vector: number[];
  /** Raw text of the chunk */
  text: string;
  metadata: ChunkMetadata;
}

/**
 * A single result returned by a Vector Store similarity search.
 */
export interface ChunkResult {
  id: string;
  text: string;
  /** Cosine similarity score in [0.0, 1.0] */
  score: number;
  metadata: ChunkMetadata;
}

/**
 * Abstraction over the underlying vector store implementation.
 * Implementations: InMemoryVectorStore (Stages 1–2), ChromaDBVectorStore (Stage 3+).
 */
export interface VectorStore {
  /** Store or update a batch of embedded chunks. */
  upsert(chunks: EmbeddedChunk[]): Promise<void>;
  /**
   * Return the top-K chunks most similar to the given query string,
   * in descending order of cosine similarity.
   */
  search(query: string, k: number): Promise<ChunkResult[]>;
  /** Remove all stored chunks (used between pipeline sessions). */
  clear(): Promise<void>;
}

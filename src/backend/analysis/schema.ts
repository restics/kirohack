/**
 * src/backend/analysis/schema.ts
 *
 * Zod schema for CascadeDocument validation and the AnalysisError class.
 *
 * Requirements: 3.4
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas mirroring the CascadeDocument TypeScript interfaces
// ---------------------------------------------------------------------------

export const SourceSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  published_at: z.string(),
});

export const CascadeNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['direct', 'indirect', 'second_order']),
  confidence_score: z.number().min(0).max(1),
  single_source: z.boolean(),
  supporting_source_ids: z.array(z.string()),
  conflicting_source_ids: z.array(z.string()),
});

export const CascadeEdgeSchema = z.object({
  from_node_id: z.string(),
  to_node_id: z.string(),
  label: z.string().optional(),
});

export const CascadeDocumentSchema = z.object({
  event: z.string(),
  retrieved_at: z.string(),
  sources: z.array(SourceSchema),
  nodes: z.array(CascadeNodeSchema),
  edges: z.array(CascadeEdgeSchema),
});

// ---------------------------------------------------------------------------
// AnalysisError — returned when all retry attempts are exhausted
// ---------------------------------------------------------------------------

/**
 * Thrown by the Analysis Layer when the LLM response fails schema validation
 * on all 3 attempts.
 *
 * `lastRawResponse` contains the raw LLM output from the final attempt so
 * callers can inspect or log it for debugging.
 */
export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly lastRawResponse: string,
    public readonly attempts: number,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

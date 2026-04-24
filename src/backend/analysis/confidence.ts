/**
 * src/backend/analysis/confidence.ts
 *
 * Confidence scoring and single_source flag computation for CascadeNodes.
 *
 * Requirements: 5.1, 5.2, 4.4
 */

import type { CascadeNode } from '../../shared/types.js';

/**
 * Compute the confidence score for a node given its supporting and conflicting
 * source counts.
 *
 * Formula: supporting / (supporting + conflicting)
 * Returns 0.0 when both counts are zero.
 *
 * @param supporting - Number of supporting sources (non-negative integer)
 * @param conflicting - Number of conflicting sources (non-negative integer)
 * @returns Confidence score in [0.0, 1.0]
 */
export function computeConfidence(
  supporting: number,
  conflicting: number,
): number {
  const total = supporting + conflicting;
  if (total === 0) {
    return 0.0;
  }
  return supporting / total;
}

/**
 * Determine whether a node should be flagged as single_source.
 *
 * A node is single_source iff it has exactly one supporting source and zero
 * conflicting sources.
 *
 * @param node - The CascadeNode to evaluate
 * @returns true iff supporting_source_ids.length === 1 && conflicting_source_ids.length === 0
 */
export function setSingleSourceFlag(node: CascadeNode): boolean {
  return (
    node.supporting_source_ids.length === 1 &&
    node.conflicting_source_ids.length === 0
  );
}

/**
 * Apply confidence scoring and single_source flag computation to an array of
 * CascadeNodes.
 *
 * This function is pure and immutable — it returns a new array of nodes with
 * updated `confidence_score` and `single_source` values without mutating the
 * originals.
 *
 * @param nodes - Array of CascadeNodes to process
 * @returns New array of CascadeNodes with confidence_score and single_source set
 */
export function applyConfidenceScoring(nodes: CascadeNode[]): CascadeNode[] {
  return nodes.map((node) => ({
    ...node,
    confidence_score: computeConfidence(
      node.supporting_source_ids.length,
      node.conflicting_source_ids.length,
    ),
    single_source: setSingleSourceFlag(node),
  }));
}

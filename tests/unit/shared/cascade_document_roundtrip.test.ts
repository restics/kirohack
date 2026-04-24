// Feature: economic-cascade-analyzer, Property 13: JSON round-trip preserves the Cascade_Document

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { CascadeDocument, CascadeNode, CascadeEdge, Source } from '@shared/types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generate a valid Source object. */
const sourceArb = fc.record<Source>({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  url: fc.string({ minLength: 1, maxLength: 100 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  published_at: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Generate a valid CascadeNode given a list of source IDs so that
 * supporting_source_ids and conflicting_source_ids only reference real sources.
 */
const cascadeNodeArb = (sourceIds: string[]): fc.Arbitrary<CascadeNode> => {
  const sourceIdArb =
    sourceIds.length > 0
      ? fc.constantFrom(...sourceIds)
      : fc.constant('__no_source__');

  return fc.record<CascadeNode>({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    label: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom('direct', 'indirect', 'second_order') as fc.Arbitrary<
      'direct' | 'indirect' | 'second_order'
    >,
    confidence_score: fc.float({ min: 0, max: 1, noNaN: true }),
    single_source: fc.boolean(),
    supporting_source_ids: fc.array(sourceIdArb, { maxLength: sourceIds.length }),
    conflicting_source_ids: fc.array(sourceIdArb, { maxLength: sourceIds.length }),
  });
};

/**
 * Generate a valid CascadeEdge given a list of node IDs so that
 * from_node_id and to_node_id only reference real nodes.
 */
const cascadeEdgeArb = (nodeIds: string[]): fc.Arbitrary<CascadeEdge> => {
  const nodeIdArb =
    nodeIds.length > 0
      ? fc.constantFrom(...nodeIds)
      : fc.constant('__no_node__');

  return fc.record<CascadeEdge>({
    from_node_id: nodeIdArb,
    to_node_id: nodeIdArb,
    label: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: undefined }),
  });
};

/**
 * Generate an arbitrary CascadeDocument with referential integrity:
 * - edge node IDs reference nodes that exist
 * - source IDs in nodes reference sources that exist
 */
const cascadeDocumentArb: fc.Arbitrary<CascadeDocument> = fc
  .array(sourceArb, { minLength: 0, maxLength: 5 })
  .chain((sources) => {
    const sourceIds = sources.map((s) => s.id);

    return fc.array(cascadeNodeArb(sourceIds), { minLength: 0, maxLength: 8 }).chain(
      (nodes) => {
        const nodeIds = nodes.map((n) => n.id);

        return fc.array(cascadeEdgeArb(nodeIds), { minLength: 0, maxLength: 10 }).chain(
          (edges) =>
            fc.record<CascadeDocument>({
              event: fc.string({ minLength: 1, maxLength: 200 }),
              retrieved_at: fc.string({ minLength: 1, maxLength: 30 }),
              sources: fc.constant(sources),
              nodes: fc.constant(nodes),
              edges: fc.constant(edges),
            }),
        );
      },
    );
  });

// ---------------------------------------------------------------------------
// Property 13: JSON round-trip preserves the Cascade_Document
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------

describe('Property 13: JSON round-trip preserves the Cascade_Document', () => {
  it('serializing and deserializing a CascadeDocument produces a deeply equal document', () => {
    fc.assert(
      fc.property(cascadeDocumentArb, (doc: CascadeDocument) => {
        const serialized = JSON.stringify(doc);
        const deserialized = JSON.parse(serialized) as CascadeDocument;

        // Deep equality — every field must be identical
        expect(deserialized).toEqual(doc);

        // Structural counts must be preserved
        expect(deserialized.sources.length).toBe(doc.sources.length);
        expect(deserialized.nodes.length).toBe(doc.nodes.length);
        expect(deserialized.edges.length).toBe(doc.edges.length);

        // Top-level string fields must be preserved
        expect(deserialized.event).toBe(doc.event);
        expect(deserialized.retrieved_at).toBe(doc.retrieved_at);
      }),
      { numRuns: 100 },
    );
  });
});

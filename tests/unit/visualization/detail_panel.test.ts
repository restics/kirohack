// Feature: economic-cascade-analyzer, Property 15: Node detail panel shows correct data for any clicked node

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createElement, act } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import type { CascadeDocument, CascadeNode, CascadeEdge, Source } from '@shared/types';
import { NodeDetailPanel } from '@frontend/components/NodeDetailPanel';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generate a valid Source with a unique-enough ID.
 * We use a counter-based prefix combined with fast-check strings to keep IDs
 * distinct within a single document.
 */
const sourceArb = (idPrefix: string): fc.Arbitrary<Source> =>
  fc.record<Source>({
    id: fc.constant(idPrefix),
    url: fc.webUrl(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    published_at: fc.string({ minLength: 1, maxLength: 30 }),
  });

/**
 * Generate an array of Sources with guaranteed-unique IDs.
 * We generate between 1 and 5 sources.
 */
const sourcesArb: fc.Arbitrary<Source[]> = fc
  .integer({ min: 1, max: 5 })
  .chain((count) => {
    const arbs = Array.from({ length: count }, (_, i) =>
      sourceArb(`src_${String(i).padStart(3, '0')}`),
    );
    return fc.tuple(...(arbs as [fc.Arbitrary<Source>, ...fc.Arbitrary<Source>[]]));
  })
  .map((tuple) => tuple as Source[]);

/**
 * Generate a valid CascadeNode where supporting_source_ids and
 * conflicting_source_ids reference actual source IDs from the provided list.
 */
const cascadeNodeArb = (sourceIds: string[]): fc.Arbitrary<CascadeNode> => {
  const sourceIdArb =
    sourceIds.length > 0
      ? fc.constantFrom(...sourceIds)
      : fc.constant('__no_source__');

  return fc
    .record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      label: fc.string({ minLength: 1, maxLength: 100 }),
      type: fc.constantFrom('direct', 'indirect', 'second_order') as fc.Arbitrary<
        'direct' | 'indirect' | 'second_order'
      >,
      confidence_score: fc.float({ min: 0, max: 1, noNaN: true }),
      supporting_source_ids: fc.array(sourceIdArb, { minLength: 0, maxLength: sourceIds.length }),
      conflicting_source_ids: fc.array(sourceIdArb, { minLength: 0, maxLength: sourceIds.length }),
    })
    .map((node) => {
      // Derive single_source from the source arrays (Property 10 invariant)
      const single_source =
        node.supporting_source_ids.length === 1 &&
        node.conflicting_source_ids.length === 0;
      return { ...node, single_source };
    });
};

/**
 * Generate a valid CascadeEdge given a list of node IDs.
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
 * Generate a valid CascadeDocument with at least 1 node.
 * Sources have unique IDs; node source references are valid.
 */
const cascadeDocumentArb: fc.Arbitrary<CascadeDocument> = sourcesArb.chain((sources) => {
  const sourceIds = sources.map((s) => s.id);

  return fc
    .array(cascadeNodeArb(sourceIds), { minLength: 1, maxLength: 10 })
    .chain((nodes) => {
      const nodeIds = nodes.map((n) => n.id);

      return fc
        .array(cascadeEdgeArb(nodeIds), { minLength: 0, maxLength: 5 })
        .chain((edges) =>
          fc.record<CascadeDocument>({
            event: fc.string({ minLength: 1, maxLength: 200 }),
            retrieved_at: fc.string({ minLength: 1, maxLength: 30 }),
            sources: fc.constant(sources),
            nodes: fc.constant(nodes),
            edges: fc.constant(edges),
          }),
        );
    });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable label for a node type (mirrors NodeDetailPanel's typeLabel). */
function typeLabel(type: CascadeNode['type']): string {
  switch (type) {
    case 'direct':
      return 'Direct';
    case 'indirect':
      return 'Indirect';
    case 'second_order':
      return 'Second Order';
    default:
      return type;
  }
}

// ---------------------------------------------------------------------------
// Property 15: Node detail panel shows correct data for any clicked node
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------

describe('Property 15: Node detail panel shows correct data for any clicked node', () => {
  it('displays correct label, type, confidence_score, sources, and single_source badge for any node', async () => {
    await fc.assert(
      fc.asyncProperty(
        cascadeDocumentArb,
        // Pick a random node index within the document
        cascadeDocumentArb.chain((doc) =>
          fc.integer({ min: 0, max: doc.nodes.length - 1 }).map((idx) => ({ doc, idx })),
        ),
        async (_ignored, { doc, idx }) => {
          const selectedNode = doc.nodes[idx];
          const sourceById = new Map(doc.sources.map((s) => [s.id, s]));

          let container: HTMLElement | undefined;

          await act(async () => {
            const result = render(
              createElement(NodeDetailPanel, {
                node: selectedNode,
                sources: doc.sources,
                onClose: () => {},
              }),
            );
            container = result.container;
          });

          expect(container).toBeDefined();

          // Panel must be present
          const panel = container!.querySelector('[data-testid="node-detail-panel"]');
          expect(panel).not.toBeNull();

          // 1. Label
          const labelEl = container!.querySelector('[data-testid="panel-label"]');
          expect(labelEl).not.toBeNull();
          expect(labelEl!.textContent).toBe(selectedNode.label);

          // 2. Type (human-readable)
          const typeEl = container!.querySelector('[data-testid="panel-type"]');
          expect(typeEl).not.toBeNull();
          expect(typeEl!.textContent).toBe(typeLabel(selectedNode.type));

          // 3. Confidence score (toFixed(2))
          const confidenceEl = container!.querySelector('[data-testid="panel-confidence"]');
          expect(confidenceEl).not.toBeNull();
          expect(confidenceEl!.textContent).toBe(selectedNode.confidence_score.toFixed(2));

          // 4. Color swatch must be present
          const swatchEl = container!.querySelector('[data-testid="panel-color-swatch"]');
          expect(swatchEl).not.toBeNull();

          // 5. Single-source badge: present iff single_source === true
          const badgeEl = container!.querySelector('[data-testid="panel-single-source-badge"]');
          if (selectedNode.single_source) {
            expect(badgeEl).not.toBeNull();
          } else {
            expect(badgeEl).toBeNull();
          }

          // 6. Supporting sources
          const supportingIds = selectedNode.supporting_source_ids;
          const supportingSources = supportingIds
            .map((id) => sourceById.get(id))
            .filter((s): s is Source => s !== undefined);

          if (supportingSources.length > 0) {
            const listEl = container!.querySelector('[data-testid="panel-supporting-sources"]');
            expect(listEl).not.toBeNull();

            for (const source of supportingSources) {
              const linkEl = container!.querySelector(`[data-testid="source-link-${source.id}"]`);
              expect(linkEl).not.toBeNull();
              expect(linkEl!.textContent).toBe(source.title);
              // Use getAttribute to get the raw href value before browser normalization
              expect(linkEl!.getAttribute('href')).toBe(source.url);
            }
          }

          // 7. Conflicting sources
          const conflictingIds = selectedNode.conflicting_source_ids;
          const conflictingSources = conflictingIds
            .map((id) => sourceById.get(id))
            .filter((s): s is Source => s !== undefined);

          if (conflictingSources.length > 0) {
            const listEl = container!.querySelector('[data-testid="panel-conflicting-sources"]');
            expect(listEl).not.toBeNull();

            for (const source of conflictingSources) {
              const linkEl = container!.querySelector(`[data-testid="source-link-${source.id}"]`);
              expect(linkEl).not.toBeNull();
              expect(linkEl!.textContent).toBe(source.title);
              // Use getAttribute to get the raw href value before browser normalization
              expect(linkEl!.getAttribute('href')).toBe(source.url);
            }
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

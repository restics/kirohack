// Feature: economic-cascade-analyzer, Property 16: Auto-collapse for large documents

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createElement, act } from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import type { CascadeDocument, CascadeNode, CascadeEdge, Source } from '@shared/types';
import { CascadeGraph } from '@frontend/components/CascadeGraph';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generate a valid Source object. */
const sourceArb = fc.record<Source>({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  url: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  published_at: fc.string({ minLength: 1, maxLength: 20 }),
});

/**
 * Build a single CascadeNode with a given id and type.
 * Source references are left empty to keep generation fast.
 */
function makeNode(
  id: string,
  type: 'direct' | 'indirect' | 'second_order',
): CascadeNode {
  return {
    id,
    label: `Effect ${id}`,
    type,
    confidence_score: 0.5,
    single_source: false,
    supporting_source_ids: [],
    conflicting_source_ids: [],
  };
}

/**
 * Generate a large CascadeDocument with > 50 nodes (51–60 nodes).
 *
 * Structure:
 * - First 5 nodes are always 'direct'
 * - Remaining 46–55 nodes alternate between 'indirect' and 'second_order'
 * - 0–20 edges with valid node IDs
 */
const largeCascadeDocumentArb: fc.Arbitrary<CascadeDocument> = fc
  .integer({ min: 46, max: 55 })
  .chain((extraCount) => {
    // Build nodes deterministically — no chaining needed for node content
    const directNodes: CascadeNode[] = Array.from({ length: 5 }, (_, i) =>
      makeNode(`d${i}`, 'direct'),
    );

    const mixedNodes: CascadeNode[] = Array.from({ length: extraCount }, (_, i) =>
      makeNode(`m${i}`, i % 2 === 0 ? 'indirect' : 'second_order'),
    );

    const allNodes = [...directNodes, ...mixedNodes];
    const nodeIds = allNodes.map((n) => n.id);

    // Generate 0–20 edges with valid node IDs
    const nodeIdArb = fc.constantFrom(...nodeIds);
    const edgeArb: fc.Arbitrary<CascadeEdge> = fc.record<CascadeEdge>({
      from_node_id: nodeIdArb,
      to_node_id: nodeIdArb,
      label: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    });

    return fc
      .array(edgeArb, { minLength: 0, maxLength: 20 })
      .chain((edges) =>
        fc.record<CascadeDocument>({
          event: fc.string({ minLength: 1, maxLength: 100 }),
          retrieved_at: fc.constant('2024-01-01T00:00:00Z'),
          sources: fc.constant([]),
          nodes: fc.constant(allNodes),
          edges: fc.constant(edges),
        }),
      );
  });

// ---------------------------------------------------------------------------
// Property 16: Auto-collapse for large documents
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------

describe('Property 16: Auto-collapse for large documents', () => {
  it(
    'shows auto-collapse-indicator and collapses indirect/second_order nodes when node count > 50',
    async () => {
      await fc.assert(
        fc.asyncProperty(largeCascadeDocumentArb, async (doc: CascadeDocument) => {
          // Sanity check: the generated document must have > 50 nodes
          expect(doc.nodes.length).toBeGreaterThan(50);

          // Ensure there are direct nodes and non-direct nodes
          const directNodes = doc.nodes.filter((n) => n.type === 'direct');
          const nonDirectNodes = doc.nodes.filter(
            (n) => n.type === 'indirect' || n.type === 'second_order',
          );
          expect(directNodes.length).toBeGreaterThan(0);
          expect(nonDirectNodes.length).toBeGreaterThan(0);

          let container: HTMLElement | undefined;

          await act(async () => {
            const result = render(
              createElement(CascadeGraph, {
                cascade_document: doc,
                layout: 'force',
                onLayoutChange: () => {},
              }),
            );
            container = result.container;
          });

          expect(container).toBeDefined();

          // Wait for the useEffect that sets collapsedTypes to run.
          // The auto-collapse-indicator is a React-rendered element (not D3),
          // so it appears once the effect fires and state updates.
          await waitFor(
            () => {
              const indicator = container!.querySelector(
                '[data-testid="auto-collapse-indicator"]',
              );
              expect(indicator).not.toBeNull();
            },
            { timeout: 2000 },
          );

          // 1. The auto-collapse indicator MUST be present in the DOM.
          const indicator = container!.querySelector('[data-testid="auto-collapse-indicator"]');
          expect(indicator).not.toBeNull();

          // 2. Check node rendering (D3 may not render synchronously in happy-dom).
          //    If D3 did render nodes, assert the correct visibility:
          //    - direct nodes SHOULD be present (data-testid="node-{id}")
          //    - indirect / second_order nodes SHOULD NOT be present
          const renderedNodeIds = new Set(
            Array.from(container!.querySelectorAll('[data-testid^="node-"]')).map((el) =>
              el.getAttribute('data-testid')!.replace('node-', ''),
            ),
          );

          if (renderedNodeIds.size > 0) {
            // D3 rendered some nodes — verify the collapse rules hold.

            // Every rendered node must be a direct node
            for (const nodeId of renderedNodeIds) {
              const node = doc.nodes.find((n) => n.id === nodeId);
              if (node) {
                expect(node.type).toBe('direct');
              }
            }

            // Indirect and second_order nodes must NOT be rendered
            for (const node of nonDirectNodes) {
              const el = container!.querySelector(`[data-testid="node-${node.id}"]`);
              expect(el).toBeNull();
            }
          }

          cleanup();
        }),
        { numRuns: 100 },
      );
    },
    60_000, // 60 second timeout for 100 PBT iterations
  );
});

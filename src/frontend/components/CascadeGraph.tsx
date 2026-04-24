/**
 * src/frontend/components/CascadeGraph.tsx
 *
 * React + D3.js Visualization Layer — force-directed and collapsible tree layouts.
 *
 * Renders a CascadeDocument as an interactive SVG graph:
 *   - Nodes are circles colored by confidence_score via d3.interpolateRdYlGn
 *   - Nodes with single_source === true have a dashed stroke border
 *   - Edges are directed lines (force) or curved paths (tree)
 *   - Nodes are draggable in force layout (repositioning only, no re-analysis)
 *   - Clicking a node calls the optional onNodeClick callback
 *   - Tree layout supports collapsible nodes (click to toggle children)
 *   - Layout toggle button switches between 'force' and 'tree'
 *
 * Requirements: 7.1, 7.2, 5.4, 5.5
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { CascadeDocument, CascadeNode, CascadeEdge } from '@shared/types';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface VisualizationProps {
  cascade_document: CascadeDocument;
  layout: 'force' | 'tree';
  onLayoutChange: (layout: 'force' | 'tree') => void;
  /** Optional callback fired when the user clicks a node */
  onNodeClick?: (node: CascadeNode) => void;
}

// ---------------------------------------------------------------------------
// Internal D3 simulation node/link types (force layout)
// ---------------------------------------------------------------------------

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  data: CascadeNode;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  data: CascadeEdge;
}

// ---------------------------------------------------------------------------
// Internal tree node type (tree layout)
// ---------------------------------------------------------------------------

interface TreeNodeData {
  id: string;
  data: CascadeNode;
  children?: TreeNodeData[];
  _children?: TreeNodeData[]; // collapsed children
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_RADIUS = 18;
const WIDTH = 900;
const HEIGHT = 600;

/** Map a confidence_score in [0, 1] to a fill color on the RdYlGn scale. */
function confidenceColor(score: number): string {
  return d3.interpolateRdYlGn(score);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CascadeGraph({
  cascade_document,
  layout,
  onLayoutChange,
  onNodeClick,
}: VisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // ---------------------------------------------------------------------------
  // Auto-collapse state (Requirement 7.5)
  // ---------------------------------------------------------------------------

  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // When the document changes, auto-collapse indirect/second_order nodes if
  // the document has more than 50 nodes.
  useEffect(() => {
    if (cascade_document.nodes.length > 50) {
      setCollapsedTypes(new Set(['indirect', 'second_order']));
    } else {
      setCollapsedTypes(new Set());
    }
  }, [cascade_document]);

  // Stable ref for the click callback so the D3 handler doesn't go stale
  const onNodeClickRef = useRef(onNodeClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  // ---------------------------------------------------------------------------
  // Force layout
  // ---------------------------------------------------------------------------

  const renderForce = useCallback(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const { nodes, edges } = cascade_document;

    // Filter nodes and edges based on collapsedTypes (Requirement 7.5)
    const visibleNodes = collapsedTypes.size > 0
      ? nodes.filter((n) => !collapsedTypes.has(n.type))
      : nodes;
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.from_node_id) && visibleNodeIds.has(e.to_node_id),
    );

    // Build simulation data
    const simNodes: SimNode[] = visibleNodes.map((n) => ({ id: n.id, data: n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = visibleEdges
      .filter((e) => nodeById.has(e.from_node_id) && nodeById.has(e.to_node_id))
      .map((e) => ({
        source: nodeById.get(e.from_node_id)!,
        target: nodeById.get(e.to_node_id)!,
        data: e,
      }));

    // Arrowhead marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', NODE_RADIUS + 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    const g = svg.append('g');

    // Zoom + pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Edge lines
    const linkSel = g
      .append('g')
      .attr('class', 'edges')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks)
      .join('line')
      .attr('data-testid', (d) => `edge-${d.data.from_node_id}-${d.data.to_node_id}`)
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', 'url(#arrowhead)');

    // Node groups
    const nodeSel = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.data.label} — confidence ${d.data.confidence_score.toFixed(2)}`)
      .attr('tabindex', '0')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        onNodeClickRef.current?.(d.data);
      })
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onNodeClickRef.current?.(d.data);
        }
      });

    // Circle fill
    nodeSel
      .append('circle')
      .attr('data-testid', (d) => `node-${d.id}`)
      .attr('r', NODE_RADIUS)
      .attr('fill', (d) => confidenceColor(d.data.confidence_score))
      .attr('stroke', (d) => (d.data.single_source ? '#333' : '#555'))
      .attr('stroke-width', (d) => (d.data.single_source ? 2.5 : 1.5))
      .attr('stroke-dasharray', (d) => (d.data.single_source ? '4 3' : 'none'));

    // Node label (truncated)
    nodeSel
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_RADIUS + 12)
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .attr('pointer-events', 'none')
      .text((d) => {
        const words = d.data.label.split(' ');
        return words.slice(0, 4).join(' ') + (words.length > 4 ? '…' : '');
      });

    // Drag behavior — reposition only, no re-analysis
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(drag);

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(120),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-300))
      .force('center', d3.forceCenter<SimNode>(WIDTH / 2, HEIGHT / 2))
      .force('collide', d3.forceCollide<SimNode>(NODE_RADIUS + 8))
      .on('tick', () => {
        linkSel
          .attr('x1', (d) => (d.source as SimNode).x ?? 0)
          .attr('y1', (d) => (d.source as SimNode).y ?? 0)
          .attr('x2', (d) => (d.target as SimNode).x ?? 0)
          .attr('y2', (d) => (d.target as SimNode).y ?? 0);

        nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    // Cleanup: stop simulation when component unmounts or re-renders
    return () => {
      simulation.stop();
    };
  }, [cascade_document, collapsedTypes]);

  // ---------------------------------------------------------------------------
  // Tree layout
  // ---------------------------------------------------------------------------

  const renderTree = useCallback(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const { nodes, edges } = cascade_document;

    // Build adjacency map: parent → children
    const childrenMap = new Map<string, string[]>();
    const parentSet = new Set<string>(); // nodes that are targets (have a parent)
    for (const edge of edges) {
      if (!childrenMap.has(edge.from_node_id)) {
        childrenMap.set(edge.from_node_id, []);
      }
      childrenMap.get(edge.from_node_id)!.push(edge.to_node_id);
      parentSet.add(edge.to_node_id);
    }

    // Find root: prefer first 'direct' node with no incoming edges,
    // fall back to first 'direct' node, then first node overall.
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const rootNode =
      nodes.find((n) => n.type === 'direct' && !parentSet.has(n.id)) ??
      nodes.find((n) => n.type === 'direct') ??
      nodes[0];

    if (!rootNode) return undefined;

    // Build tree data structure (avoid infinite loops from cycles via visited set)
    function buildTreeNode(nodeId: string, visited: Set<string>): TreeNodeData {
      const cascadeNode = nodeById.get(nodeId)!;
      const treeNode: TreeNodeData = { id: nodeId, data: cascadeNode };
      const childIds = childrenMap.get(nodeId) ?? [];
      const childNodes: TreeNodeData[] = [];
      for (const childId of childIds) {
        if (!visited.has(childId) && nodeById.has(childId)) {
          const childVisited = new Set(visited);
          childVisited.add(childId);
          childNodes.push(buildTreeNode(childId, childVisited));
        }
      }
      if (childNodes.length > 0) {
        // If this node's type is in collapsedTypes, start it collapsed (_children)
        if (collapsedTypes.has(cascadeNode.type)) {
          treeNode._children = childNodes;
        } else {
          treeNode.children = childNodes;
        }
      }
      return treeNode;
    }

    const rootData = buildTreeNode(rootNode.id, new Set([rootNode.id]));

    // D3 hierarchy
    const root = d3.hierarchy<TreeNodeData>(rootData, (d) => d.children);

    // Tree layout — horizontal (left-to-right)
    const treeLayout = d3
      .tree<TreeNodeData>()
      .size([HEIGHT - 80, WIDTH - 200]);

    treeLayout(root);

    const g = svg.append('g').attr('transform', 'translate(80, 40)');

    // Zoom + pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Helper: re-render after collapse/expand
    function update(source: d3.HierarchyPointNode<TreeNodeData>) {
      // Recompute layout
      treeLayout(root);

      const nodes = root.descendants();
      const links = root.links();

      // --- Edges (curved paths) ---
      const linkSel = g
        .selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNodeData>>('path.tree-edge')
        .data(links, (d) => `${d.source.data.id}-${d.target.data.id}`);

      const linkEnter = linkSel
        .enter()
        .append('path')
        .attr('class', 'tree-edge')
        .attr('data-testid', (d) => `edge-${d.source.data.id}-${d.target.data.id}`)
        .attr('fill', 'none')
        .attr('stroke', '#999')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.7)
        .attr('d', () => {
          const o = { x: source.x ?? 0, y: source.y ?? 0 };
          return d3
            .linkHorizontal<{ x: number; y: number }, { x: number; y: number }>()
            .x((p) => p.y)
            .y((p) => p.x)({ source: o, target: o });
        });

      linkSel
        .merge(linkEnter)
        .transition()
        .duration(300)
        .attr('d', (d) =>
          d3
            .linkHorizontal<{ x: number; y: number }, { x: number; y: number }>()
            .x((p) => p.y)
            .y((p) => p.x)({
            source: { x: d.source.x ?? 0, y: d.source.y ?? 0 },
            target: { x: d.target.x ?? 0, y: d.target.y ?? 0 },
          }),
        );

      linkSel
        .exit()
        .transition()
        .duration(300)
        .attr('d', () => {
          const o = { x: source.x ?? 0, y: source.y ?? 0 };
          return d3
            .linkHorizontal<{ x: number; y: number }, { x: number; y: number }>()
            .x((p) => p.y)
            .y((p) => p.x)({ source: o, target: o });
        })
        .remove();

      // --- Nodes ---
      const nodeSel = g
        .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNodeData>>('g.tree-node')
        .data(nodes, (d) => d.data.id);

      const nodeEnter = nodeSel
        .enter()
        .append('g')
        .attr('class', 'tree-node')
        .attr('role', 'button')
        .attr('aria-label', (d) =>
          `${d.data.data.label} — confidence ${d.data.data.confidence_score.toFixed(2)}`,
        )
        .attr('tabindex', '0')
        .style('cursor', 'pointer')
        .attr('transform', () => `translate(${source.y ?? 0},${source.x ?? 0})`)
        .on('click', (_event, d) => {
          // Toggle children
          if (d.data.children) {
            d.data._children = d.data.children;
            d.data.children = undefined;
          } else if (d.data._children) {
            d.data.children = d.data._children;
            d.data._children = undefined;
          }
          // Rebuild hierarchy from updated data
          const newRoot = d3.hierarchy<TreeNodeData>(rootData, (nd) => nd.children);
          Object.assign(root, newRoot);
          // Also fire the external click handler
          onNodeClickRef.current?.(d.data.data);
          update(d);
        })
        .on('keydown', (event: KeyboardEvent, d) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onNodeClickRef.current?.(d.data.data);
          }
        });

      nodeEnter
        .append('circle')
        .attr('data-testid', (d) => `node-${d.data.id}`)
        .attr('r', NODE_RADIUS)
        .attr('fill', (d) => confidenceColor(d.data.data.confidence_score))
        .attr('stroke', (d) => (d.data.data.single_source ? '#333' : '#555'))
        .attr('stroke-width', (d) => (d.data.data.single_source ? 2.5 : 1.5))
        .attr('stroke-dasharray', (d) => (d.data.data.single_source ? '4 3' : 'none'));

      // Collapse indicator (+ / -)
      nodeEnter
        .append('text')
        .attr('class', 'collapse-indicator')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#fff')
        .attr('pointer-events', 'none');

      nodeEnter
        .append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'start')
        .attr('dx', NODE_RADIUS + 6)
        .attr('dy', '0.35em')
        .attr('font-size', '10px')
        .attr('fill', '#333')
        .attr('pointer-events', 'none');

      const nodeUpdate = nodeSel.merge(nodeEnter);

      nodeUpdate
        .transition()
        .duration(300)
        .attr('transform', (d) => `translate(${d.y ?? 0},${d.x ?? 0})`);

      nodeUpdate
        .select<SVGCircleElement>('circle')
        .attr('fill', (d) => confidenceColor(d.data.data.confidence_score))
        .attr('stroke', (d) => (d.data.data.single_source ? '#333' : '#555'))
        .attr('stroke-width', (d) => (d.data.data.single_source ? 2.5 : 1.5))
        .attr('stroke-dasharray', (d) => (d.data.data.single_source ? '4 3' : 'none'));

      nodeUpdate.select<SVGTextElement>('text.collapse-indicator').text((d) => {
        if (d.data._children) return '+';
        if (d.data.children && d.data.children.length > 0) return '−';
        return '';
      });

      nodeUpdate.select<SVGTextElement>('text.node-label').text((d) => {
        const words = d.data.data.label.split(' ');
        return words.slice(0, 4).join(' ') + (words.length > 4 ? '…' : '');
      });

      nodeSel
        .exit()
        .transition()
        .duration(300)
        .attr('transform', () => `translate(${source.y ?? 0},${source.x ?? 0})`)
        .remove();
    }

    // Initial render
    update(root as unknown as d3.HierarchyPointNode<TreeNodeData>);

    return undefined;
  }, [cascade_document, collapsedTypes]);

  // ---------------------------------------------------------------------------
  // Effect: switch between layouts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!svgRef.current) return;

    if (layout === 'force') {
      const cleanup = renderForce();
      return cleanup;
    } else {
      renderTree();
      return undefined;
    }
  }, [cascade_document, layout, renderForce, renderTree]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Layout toggle button — rendered outside the SVG */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {collapsedTypes.size > 0 && (
          <div
            data-testid="auto-collapse-indicator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              background: '#fff8e1',
              border: '1px solid #ffe082',
              borderRadius: 4,
              fontSize: '12px',
              color: '#795548',
            }}
          >
            <span>Large document: indirect &amp; second-order nodes collapsed</span>
            <button
              onClick={() => setCollapsedTypes(new Set())}
              style={{
                padding: '2px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: 4,
                border: '1px solid #ffe082',
                background: '#fff',
              }}
            >
              Expand all
            </button>
          </div>
        )}
        <button
          onClick={() => onLayoutChange(layout === 'force' ? 'tree' : 'force')}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            borderRadius: 4,
            border: '1px solid #ccc',
            background: '#fff',
          }}
        >
          {layout === 'force' ? 'Switch to Tree' : 'Switch to Force'}
        </button>
      </div>
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={`Economic cascade graph for: ${cascade_document.event}`}
        style={{ border: '1px solid #e0e0e0', borderRadius: 4, background: '#fafafa' }}
      />
    </div>
  );
}

export default CascadeGraph;

/**
 * src/frontend/components/NodeDetailPanel.tsx
 *
 * Detail panel displayed when the user clicks a node in the cascade graph.
 * Shows the node's label, type, confidence score (numeric + color swatch),
 * single_source warning badge, and lists of supporting / conflicting sources
 * as clickable links.
 *
 * Requirements: 7.3, 5.5
 */

import * as d3 from 'd3';
import type { CascadeNode, Source } from '@shared/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NodeDetailPanelProps {
  /** The node to display, or null to hide the panel. */
  node: CascadeNode | null;
  /** Full list of sources from the CascadeDocument. */
  sources: Source[];
  /** Called when the user closes the panel. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a confidence_score in [0, 1] to a hex color on the RdYlGn scale. */
function confidenceColor(score: number): string {
  return d3.interpolateRdYlGn(score);
}

/** Human-readable label for a node type. */
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

/** Background color for the type badge. */
function typeBadgeColor(type: CascadeNode['type']): string {
  switch (type) {
    case 'direct':
      return '#2563eb'; // blue
    case 'indirect':
      return '#7c3aed'; // purple
    case 'second_order':
      return '#0891b2'; // cyan
    default:
      return '#6b7280';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NodeDetailPanel({ node, sources, onClose }: NodeDetailPanelProps) {
  // When no node is selected, render nothing.
  if (node === null) {
    return null;
  }

  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const supportingSources = node.supporting_source_ids
    .map((id) => sourceById.get(id))
    .filter((s): s is Source => s !== undefined);

  const conflictingSources = node.conflicting_source_ids
    .map((id) => sourceById.get(id))
    .filter((s): s is Source => s !== undefined);

  const color = confidenceColor(node.confidence_score);

  return (
    <aside
      data-testid="node-detail-panel"
      role="dialog"
      aria-label={`Details for node: ${node.label}`}
      aria-modal="false"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 340,
        height: '100vh',
        background: '#ffffff',
        borderLeft: '1px solid #e0e0e0',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.10)',
        overflowY: 'auto',
        padding: '24px 20px',
        boxSizing: 'border-box',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header row: label + close button                                    */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <h2
          data-testid="panel-label"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.4,
            color: '#111827',
            flex: 1,
          }}
        >
          {node.label}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            color: '#6b7280',
            padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Type badge                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <span
          data-testid="panel-type"
          style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            color: '#ffffff',
            background: typeBadgeColor(node.type),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {typeLabel(node.type)}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Single-source warning badge                                          */}
      {/* ------------------------------------------------------------------ */}
      {node.single_source && (
        <div
          data-testid="panel-single-source-badge"
          role="alert"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ⚠ Single Source
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Confidence score: numeric value + color swatch                       */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
          Confidence:
        </span>
        <span
          data-testid="panel-confidence"
          style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}
        >
          {node.confidence_score.toFixed(2)}
        </span>
        <span
          data-testid="panel-color-swatch"
          aria-label={`Confidence color: ${color}`}
          style={{
            display: 'inline-block',
            width: 18,
            height: 18,
            borderRadius: 3,
            background: color,
            border: '1px solid rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Supporting sources                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Supporting Sources
        </h3>
        {supportingSources.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>None</p>
        ) : (
          <ul
            data-testid="panel-supporting-sources"
            style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}
          >
            {supportingSources.map((source) => (
              <li key={source.id} style={{ marginBottom: 4 }}>
                <a
                  data-testid={`source-link-${source.id}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#2563eb', textDecoration: 'underline' }}
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Conflicting sources                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Conflicting Sources
        </h3>
        {conflictingSources.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>None</p>
        ) : (
          <ul
            data-testid="panel-conflicting-sources"
            style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}
          >
            {conflictingSources.map((source) => (
              <li key={source.id} style={{ marginBottom: 4 }}>
                <a
                  data-testid={`source-link-${source.id}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#dc2626', textDecoration: 'underline' }}
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

export default NodeDetailPanel;

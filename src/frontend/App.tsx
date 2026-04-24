/**
 * src/frontend/App.tsx
 *
 * Frontend app shell for the Economic Cascade Analyzer — Stage 1 static demo.
 *
 * Renders the hardcoded Strait of Hormuz CascadeDocument using the
 * CascadeGraph and NodeDetailPanel components. No backend required.
 *
 * Requirements: 7.1, 7.2, 7.3
 */

import { useState } from 'react';
import { HORMUZ_CASCADE } from '@shared/fixtures/hormuz';
import { CascadeGraph, NodeDetailPanel } from './components';
import type { CascadeNode } from '@shared/types';

export function App() {
  const [layout, setLayout] = useState<'force' | 'tree'>('force');
  const [selectedNode, setSelectedNode] = useState<CascadeNode | null>(null);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#111827',
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header
        style={{
          background: '#1e293b',
          color: '#f8fafc',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>📊</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Economic Cascade Analyzer
        </h1>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Event description banner                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            flexShrink: 0,
          }}
        >
          Event
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: '#0f172a',
          }}
        >
          {HORMUZ_CASCADE.event}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main
        style={{
          padding: '24px',
          // Leave room for the fixed detail panel when a node is selected
          marginRight: selectedNode ? 340 : 0,
          transition: 'margin-right 0.2s ease',
        }}
      >
        <CascadeGraph
          cascade_document={HORMUZ_CASCADE}
          layout={layout}
          onLayoutChange={setLayout}
          onNodeClick={setSelectedNode}
        />
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Node detail panel (fixed, right side)                               */}
      {/* ------------------------------------------------------------------ */}
      <NodeDetailPanel
        node={selectedNode}
        sources={HORMUZ_CASCADE.sources}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}

export default App;

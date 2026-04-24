/**
 * src/shared/fixtures/hormuz.ts
 *
 * Hardcoded Strait of Hormuz CascadeDocument fixture for Stage 1 static demo.
 *
 * Contains:
 *   - 3 mock sources
 *   - 8 nodes: 2 direct, 3 indirect, 3 second_order
 *   - 7 edges forming a causal tree
 *   - Confidence scores spanning 0.33–1.0 to exercise the full color scale
 *   - Mix of single_source nodes, multi-source nodes, and nodes with conflicts
 *
 * Requirements: 6.1, 4.3 (data section)
 */

import type { CascadeDocument } from '../types';

export const HORMUZ_CASCADE: CascadeDocument = {
  event: 'Iran closes the Strait of Hormuz',
  retrieved_at: '2024-01-15T08:00:00.000Z',

  // -------------------------------------------------------------------------
  // 3 mock sources
  // -------------------------------------------------------------------------
  sources: [
    {
      id: 'src_001',
      url: 'https://www.reuters.com/world/middle-east/iran-hormuz-closure-2024-01-15',
      title: 'Iran announces closure of Strait of Hormuz to international shipping',
      published_at: '2024-01-15T06:30:00.000Z',
    },
    {
      id: 'src_002',
      url: 'https://www.bloomberg.com/news/articles/2024-01-15/hormuz-oil-markets-impact',
      title: 'Oil markets brace for supply shock as Hormuz shipping halted',
      published_at: '2024-01-15T07:15:00.000Z',
    },
    {
      id: 'src_003',
      url: 'https://www.ft.com/content/hormuz-global-supply-chain-2024',
      title: 'Global supply chains face disruption as Hormuz closure ripples through economy',
      published_at: '2024-01-15T07:45:00.000Z',
    },
  ],

  // -------------------------------------------------------------------------
  // 8 nodes: 2 direct, 3 indirect, 3 second_order
  // -------------------------------------------------------------------------
  nodes: [
    // --- Direct effects (2) ------------------------------------------------

    {
      id: 'node_001',
      label: 'Oil supply disruption — ~20% of global oil transit blocked',
      type: 'direct',
      // All 3 sources agree → confidence = 3/(3+0) = 1.0
      confidence_score: 1.0,
      single_source: false,
      supporting_source_ids: ['src_001', 'src_002', 'src_003'],
      conflicting_source_ids: [],
    },
    {
      id: 'node_002',
      label: 'Shipping route closure — tankers rerouted around Cape of Good Hope',
      type: 'direct',
      // 2 sources support, 1 conflicts (disputes severity of rerouting) → 2/(2+1) ≈ 0.67
      confidence_score: 0.67,
      single_source: false,
      supporting_source_ids: ['src_001', 'src_002'],
      conflicting_source_ids: ['src_003'],
    },

    // --- Indirect effects (3) ----------------------------------------------

    {
      id: 'node_003',
      label: 'Global fuel price surge — Brent crude rises sharply on supply fears',
      type: 'indirect',
      // 2 sources agree → confidence = 2/(2+0) = 1.0
      confidence_score: 1.0,
      single_source: false,
      supporting_source_ids: ['src_002', 'src_003'],
      conflicting_source_ids: [],
    },
    {
      id: 'node_004',
      label: 'Shipping insurance cost spike — war-risk premiums surge for Gulf routes',
      type: 'indirect',
      // Only 1 source mentions this, no conflicts → single_source = true; confidence = 1/(1+0) = 1.0
      confidence_score: 1.0,
      single_source: true,
      supporting_source_ids: ['src_002'],
      conflicting_source_ids: [],
    },
    {
      id: 'node_005',
      label: 'Supply chain delays — longer Cape route adds 10–14 days to delivery times',
      type: 'indirect',
      // 2 sources support, 1 conflicts (disputes timeline estimate) → 2/(2+1) ≈ 0.67
      confidence_score: 0.67,
      single_source: false,
      supporting_source_ids: ['src_001', 'src_003'],
      conflicting_source_ids: ['src_002'],
    },

    // --- Second-order effects (3) ------------------------------------------

    {
      id: 'node_006',
      label: 'Airline operating cost increases — jet fuel prices rise with crude',
      type: 'second_order',
      // Only 1 source mentions this, no conflicts → single_source = true; confidence = 1/(1+0) = 1.0
      confidence_score: 1.0,
      single_source: true,
      supporting_source_ids: ['src_003'],
      conflicting_source_ids: [],
    },
    {
      id: 'node_007',
      label: 'Manufacturing slowdown — energy-intensive industries cut output',
      type: 'second_order',
      // 1 source supports, 2 conflict (dispute magnitude) → 1/(1+2) ≈ 0.33
      confidence_score: 0.33,
      single_source: false,
      supporting_source_ids: ['src_001'],
      conflicting_source_ids: ['src_002', 'src_003'],
    },
    {
      id: 'node_008',
      label: 'Consumer price inflation — higher transport and energy costs passed to consumers',
      type: 'second_order',
      // 2 sources support, 1 conflicts → 2/(2+1) ≈ 0.67
      confidence_score: 0.67,
      single_source: false,
      supporting_source_ids: ['src_002', 'src_003'],
      conflicting_source_ids: ['src_001'],
    },
  ],

  // -------------------------------------------------------------------------
  // 7 edges forming a causal tree
  //
  // Tree structure:
  //   node_001 (oil supply disruption)
  //     └─► node_003 (fuel price surge)
  //           └─► node_006 (airline cost increases)
  //           └─► node_007 (manufacturing slowdown)
  //   node_002 (shipping route closure)
  //     └─► node_004 (insurance cost spike)
  //     └─► node_005 (supply chain delays)
  //           └─► node_008 (consumer price inflation)
  // -------------------------------------------------------------------------
  edges: [
    {
      from_node_id: 'node_001',
      to_node_id: 'node_003',
      label: 'reduced supply drives up crude prices',
    },
    {
      from_node_id: 'node_002',
      to_node_id: 'node_004',
      label: 'Gulf route risk raises war-risk insurance premiums',
    },
    {
      from_node_id: 'node_002',
      to_node_id: 'node_005',
      label: 'rerouting via Cape of Good Hope extends transit time',
    },
    {
      from_node_id: 'node_003',
      to_node_id: 'node_006',
      label: 'higher crude prices feed through to jet fuel costs',
    },
    {
      from_node_id: 'node_003',
      to_node_id: 'node_007',
      label: 'elevated energy costs reduce industrial output margins',
    },
    {
      from_node_id: 'node_005',
      to_node_id: 'node_008',
      label: 'longer delivery times and higher freight costs raise retail prices',
    },
    {
      from_node_id: 'node_004',
      to_node_id: 'node_008',
      label: 'insurance surcharges passed through supply chain to consumers',
    },
  ],
};

/**
 * Programmatic validation and cleanup of LLM responses.
 * Catches bad data before it reaches the frontend.
 */

// ─── CONSISTENCY VALIDATION ───

export function validateConsistency(data) {
  if (!data || typeof data !== 'object') {
    return { unknown_percentage: 100, no_sources_found: true, facts: [] };
  }

  data.unknown_percentage = clamp(data.unknown_percentage ?? 0, 0, 100);
  data.no_sources_found = Boolean(data.no_sources_found);
  data.facts = Array.isArray(data.facts) ? data.facts : [];

  data.facts = data.facts
    .filter(f => f && typeof f.statement === 'string' && f.statement.length > 0)
    .map((f, i) => ({
      id: f.id || `fact-${i + 1}`,
      statement: String(f.statement),
      status: ['consistent', 'inconsistent', 'unverified'].includes(f.status) ? f.status : 'unverified',
      agreement_percentage: clamp(Math.round(f.agreement_percentage ?? 0), 0, 100),
      supporting_sources: ensureStringArray(f.supporting_sources),
      contradicting_sources: ensureStringArray(f.contradicting_sources),
    }));

  return data;
}

// ─── CASCADE VALIDATION ───

export function validateCascade(data) {
  if (!data || typeof data !== 'object') {
    return { sectors: [] };
  }

  data.sectors = Array.isArray(data.sectors) ? data.sectors : [];

  data.sectors = data.sectors
    .filter(s => s && typeof s.name === 'string')
    .map(s => ({
      name: String(s.name),
      icon: String(s.icon || '📊'),
      impacts: validateImpacts(s.impacts),
    }));

  return data;
}

function validateImpacts(impacts) {
  if (!Array.isArray(impacts)) return [];

  return impacts
    .filter(imp => imp && typeof imp.title === 'string')
    .map((imp, i) => ({
      id: imp.id || `impact-${i}-${Date.now()}`,
      title: String(imp.title),
      description: String(imp.description || ''),
      type: imp.type === 'direct' ? 'direct' : 'indirect',
      is_hidden_factor: Boolean(imp.is_hidden_factor),
      hidden_factor_category: imp.is_hidden_factor ? (imp.hidden_factor_category || null) : null,
      confidence: clamp(Number(imp.confidence) || 0.5, 0, 1),
      severity: clamp(Math.round(Number(imp.severity) || 5), 1, 10),
      causal_chain: ensureStringArray(imp.causal_chain),
      originating_facts: ensureStringArray(imp.originating_facts),
      children: validateImpacts(imp.children),
    }));
}

// ─── SUMMARY VALIDATION ───

export function validateSummary(data) {
  if (!data || typeof data !== 'object') {
    return { sectors: [], hidden_factors_summary: [], narrative_summary: '' };
  }

  data.sectors = Array.isArray(data.sectors) ? data.sectors : [];
  data.hidden_factors_summary = Array.isArray(data.hidden_factors_summary) ? data.hidden_factors_summary : [];
  data.narrative_summary = String(data.narrative_summary || '');

  data.sectors = data.sectors
    .filter(s => s && typeof s.name === 'string')
    .map(s => ({
      name: String(s.name),
      icon: String(s.icon || '📊'),
      summary_blurb: String(s.summary_blurb || ''),
      worldwide_implications: String(s.worldwide_implications || ''),
      charts: validateCharts(s.charts),
      impacts_summary: validateImpactsSummary(s.impacts_summary),
    }));

  data.hidden_factors_summary = data.hidden_factors_summary
    .filter(f => f && typeof f.factor === 'string')
    .map(f => ({
      factor: String(f.factor),
      category: String(f.category || 'Supply Chain Ripple'),
      explanation: String(f.explanation || ''),
    }));

  return data;
}

function validateCharts(charts) {
  if (!Array.isArray(charts)) return [];

  return charts
    .filter(c => c && typeof c.title === 'string')
    .map(c => {
      const labels = ensureStringArray(c.labels);
      const datasets = Array.isArray(c.datasets) ? c.datasets : [];

      // Validate each dataset
      const validDatasets = datasets
        .filter(ds => ds && typeof ds.label === 'string' && Array.isArray(ds.values))
        .map(ds => {
          let values = ds.values.map(v => Number(v) || 0);

          // Fix length mismatch — truncate or pad
          if (values.length > labels.length) {
            values = values.slice(0, labels.length);
          }
          while (values.length < labels.length) {
            values.push(0);
          }

          return { label: String(ds.label), values };
        });

      // Drop charts with no valid data
      if (labels.length === 0 || validDatasets.length === 0) return null;

      // Drop charts where all values are identical (meaningless)
      const allSame = validDatasets.every(ds => ds.values.every(v => v === ds.values[0]));
      if (allSame && labels.length > 1) return null;

      const chartType = ['bar', 'pie', 'donut', 'line', 'area'].includes(c.chart_type)
        ? c.chart_type
        : 'bar';

      // Validate pie/donut: values should be positive
      if (chartType === 'pie' || chartType === 'donut') {
        const hasNegative = validDatasets.some(ds => ds.values.some(v => v < 0));
        if (hasNegative) return null; // Can't have negative pie slices
      }

      return {
        chart_type: chartType,
        title: String(c.title),
        labels,
        datasets: validDatasets,
      };
    })
    .filter(Boolean); // Remove nulls
}

function validateImpactsSummary(impacts) {
  if (!Array.isArray(impacts)) return [];

  return impacts
    .filter(imp => imp && typeof imp.title === 'string')
    .map(imp => ({
      title: String(imp.title),
      description: String(imp.description || ''),
      severity: clamp(Math.round(Number(imp.severity) || 5), 1, 10),
    }));
}

// ─── HELPERS ───

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Number(val) || min));
}

function ensureStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(x => x != null).map(x => String(x));
}

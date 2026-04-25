/**
 * Deterministic chart generation engine.
 * Takes structured numeric data extracted from articles and builds valid charts.
 * No LLM involved — pure logic.
 */

/**
 * Given an array of extracted data points from the LLM, build valid charts.
 * Each data point: { sector, metric, unit, values: [{ label, value }] }
 */
export function buildChartsFromData(dataPoints) {
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) return {};

  const chartsBySector = {};

  for (const dp of dataPoints) {
    if (!dp || !dp.sector || !dp.metric || !Array.isArray(dp.values)) continue;
    if (dp.values.length === 0) continue;

    // All values must have the same unit — this is enforced by structure
    const unit = dp.unit || '';
    const labels = dp.values.map(v => String(v.label));
    const values = dp.values.map(v => Number(v.value) || 0);

    // Skip if all values are the same (meaningless chart)
    if (values.every(v => v === values[0]) && values.length > 1) continue;

    // Skip if fewer than 2 data points
    if (labels.length < 2) continue;

    // Determine chart type based on data characteristics
    const chartType = pickChartType(dp, labels, values);

    // Validate pie/donut: no negatives, values should represent parts of a whole
    if ((chartType === 'pie' || chartType === 'donut') && values.some(v => v < 0)) continue;

    const title = unit ? `${dp.metric} (${unit})` : dp.metric;

    const chart = {
      chart_type: chartType,
      title,
      labels,
      datasets: [{ label: dp.dataset_label || dp.metric, values }],
    };

    if (!chartsBySector[dp.sector]) chartsBySector[dp.sector] = [];
    // Max 2 charts per sector
    if (chartsBySector[dp.sector].length < 2) {
      chartsBySector[dp.sector].push(chart);
    }
  }

  return chartsBySector;
}

function pickChartType(dp, labels, values) {
  // If explicitly specified and valid, use it
  if (['bar', 'line', 'pie', 'donut', 'area'].includes(dp.chart_type)) {
    return dp.chart_type;
  }

  // Heuristics:
  // - If labels look like time periods → line
  const timePatterns = /^(Q[1-4]|20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Week|Month|Year|Day)/i;
  const isTimeSeries = labels.every(l => timePatterns.test(l));
  if (isTimeSeries) return 'line';

  // - If unit is % and values roughly sum to ~100 → pie
  const sum = values.reduce((a, b) => a + b, 0);
  if (dp.unit === '%' && sum >= 80 && sum <= 120 && values.every(v => v >= 0)) {
    return 'donut';
  }

  // - Default: bar for comparisons
  return 'bar';
}

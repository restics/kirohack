/**
 * src/backend/analysis/index.ts
 *
 * Public API for the Analysis Layer module.
 * Re-exports the AnalysisLayer class, CascadeDocumentSchema, AnalysisError,
 * and confidence scoring utilities.
 */

export { AnalysisLayer } from './AnalysisLayer.js';
export { CascadeDocumentSchema, AnalysisError } from './schema.js';
export {
  computeConfidence,
  setSingleSourceFlag,
  applyConfidenceScoring,
} from './confidence.js';

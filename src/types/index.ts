// === Source with Consistency Score ===

export interface SourceWithScore {
  name: string;
  consistencyScore: number; // [0, 100] - percentage of facts this source agrees on
  factCount: number; // number of facts this source contributes to
}

// === Consistency Report ===

export interface FactItem {
  id: string;
  statement: string;
  status: "consistent" | "inconsistent" | "unverified";
  agreement_percentage: number; // [0, 100]
  supporting_sources: string[];
  contradicting_sources: string[];
}

export interface ConsistencyReport {
  unknown_percentage: number; // [0, 100]
  no_sources_found: boolean;
  facts: FactItem[];
  sourceScores?: SourceWithScore[]; // optional: computed consistency scores per source
}

// === Cascade Data ===

export interface Impact {
  id: string;
  title: string;
  description: string;
  type: "direct" | "indirect";
  is_hidden_factor: boolean;
  hidden_factor_category: string | null;
  confidence: number; // [0.0, 1.0]
  severity: number; // [1, 10]
  causal_chain: string[];
  originating_facts: string[];
  children: Impact[]; // recursive
}

export interface Sector {
  name: string;
  icon: string;
  impacts: Impact[];
}

export interface CascadeData {
  sectors: Sector[];
}

// === Summary Data ===

export interface ChartDataset {
  label: string;
  values: number[];
}

export interface ChartData {
  chart_type: "bar" | "pie" | "donut" | "line" | "area" | string;
  title: string;
  labels: string[];
  datasets: ChartDataset[];
}

export interface ImpactSummary {
  title: string;
  description: string;
  severity: number; // [1, 10]
}

export interface SummarySector {
  name: string;
  icon: string;
  summary_blurb: string;
  worldwide_implications: string;
  charts: ChartData[];
  impacts_summary: ImpactSummary[];
}

export interface HiddenFactorSummary {
  factor: string;
  category: string;
  explanation: string;
}

export interface SourceArticle {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
}

export interface SummaryData {
  sectors: SummarySector[];
  hidden_factors_summary: HiddenFactorSummary[];
  narrative_summary: string;
  sources_used?: SourceArticle[];
}

// === Wizard State ===

export type WizardStep = -1 | 0 | 1 | 2 | 3;

export type StepStatus = "idle" | "loading" | "complete" | "error";

export interface WizardState {
  currentStep: WizardStep;
  stepStatuses: [StepStatus, StepStatus, StepStatus, StepStatus];
  newsEvent: string;
  selectedSources: string[];
  selectedFactIds: string[];
  consistencyReport: ConsistencyReport | null;
  cascadeData: CascadeData | null;
  summaryData: SummaryData | null;
  error: string | null;
}

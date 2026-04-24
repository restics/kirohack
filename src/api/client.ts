import type { ConsistencyReport, CascadeData, SummaryData } from "../types/index";
import { mockConsistencyReport, mockCascadeData, mockSummaryData } from "./mockData";

export interface ApiClient {
  analyzeEvent(
    event: string,
    sources: string[]
  ): Promise<{
    consistencyReport: ConsistencyReport;
    cascadeData: CascadeData;
    summaryData: SummaryData;
  }>;
  fetchConsistency(event: string, sources: string[]): Promise<ConsistencyReport>;
  fetchCascade(event: string, sources: string[]): Promise<CascadeData>;
  fetchSummary(event: string, sources: string[]): Promise<SummaryData>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockApiClient implements ApiClient {
  async fetchConsistency(_event: string, _sources: string[]): Promise<ConsistencyReport> {
    await delay(1500);
    return structuredClone(mockConsistencyReport);
  }

  async fetchCascade(_event: string, _sources: string[]): Promise<CascadeData> {
    await delay(2000);
    return structuredClone(mockCascadeData);
  }

  async fetchSummary(_event: string, _sources: string[]): Promise<SummaryData> {
    await delay(2500);
    return structuredClone(mockSummaryData);
  }

  async analyzeEvent(
    event: string,
    sources: string[]
  ): Promise<{
    consistencyReport: ConsistencyReport;
    cascadeData: CascadeData;
    summaryData: SummaryData;
  }> {
    const consistencyReport = await this.fetchConsistency(event, sources);
    const cascadeData = await this.fetchCascade(event, sources);
    const summaryData = await this.fetchSummary(event, sources);
    return { consistencyReport, cascadeData, summaryData };
  }
}

export function createMockApiClient(): ApiClient {
  return new MockApiClient();
}

import type { ConsistencyReport, CascadeData, SummaryData } from "../types/index";

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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Request to ${path} failed with status ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // ignore parse error, use default message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

class RealApiClient implements ApiClient {
  async fetchConsistency(event: string, sources: string[]): Promise<ConsistencyReport> {
    return postJson<ConsistencyReport>("/api/consistency", { event, sources });
  }

  async fetchCascade(event: string, sources: string[]): Promise<CascadeData> {
    return postJson<CascadeData>("/api/cascade", { event, sources });
  }

  async fetchSummary(event: string, sources: string[]): Promise<SummaryData> {
    return postJson<SummaryData>("/api/summary", { event, sources });
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

export function createApiClient(): ApiClient {
  return new RealApiClient();
}

// Keep the old name as an alias so existing imports don't break
export const createMockApiClient = createApiClient;

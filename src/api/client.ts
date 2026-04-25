import type { ConsistencyReport, CascadeData, SummaryData } from "../types/index";

export interface ApiClient {
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
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // use default message
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
}

export function createApiClient(): ApiClient {
  return new RealApiClient();
}

// Backward-compatible alias
export const createMockApiClient = createApiClient;

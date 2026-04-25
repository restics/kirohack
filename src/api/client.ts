import type { ConsistencyReport, CascadeData, SummaryData } from "../types/index";

let _userApiKey: string | null = null;
let _newsApiKey: string | null = null;

export function setApiKey(key: string | null) {
  _userApiKey = key && key.trim() ? key.trim() : null;
}
export function getApiKey(): string | null {
  return _userApiKey;
}

export function setNewsApiKey(key: string | null) {
  _newsApiKey = key && key.trim() ? key.trim() : null;
}
export function getNewsApiKey(): string | null {
  return _newsApiKey;
}

export interface ApiClient {
  fetchConsistency(event: string, sources: string[]): Promise<ConsistencyReport>;
  fetchCascade(event: string, sources: string[]): Promise<CascadeData>;
  fetchSummary(event: string, sources: string[], cascadeData?: CascadeData): Promise<SummaryData>;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const payload: Record<string, unknown> = { ...body };
  if (_userApiKey) payload.apiKey = _userApiKey;
  if (_newsApiKey) payload.newsApiKey = _newsApiKey;

  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch { /* use default */ }
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
  async fetchSummary(event: string, sources: string[], cascadeData?: CascadeData): Promise<SummaryData> {
    return postJson<SummaryData>("/api/summary", { event, sources, cascadeData });
  }
}

export function createApiClient(): ApiClient {
  return new RealApiClient();
}
export const createMockApiClient = createApiClient;

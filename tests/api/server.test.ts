/**
 * tests/api/server.test.ts
 *
 * Integration tests for the Express backend API.
 * Starts the real server, sends fixed event descriptions, and validates
 * that each endpoint returns a correctly-shaped JSON response.
 *
 * The LLM (OpenRouter) is called for real — OPENROUTER_API_KEY must be set.
 * Tests use a short, well-known event so responses are fast and deterministic.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "child_process";
import { setTimeout as sleep } from "timers/promises";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = 3099; // dedicated test port, won't clash with dev server
const BASE = `http://localhost:${PORT}`;
const TEST_EVENT = "The US Federal Reserve raised interest rates by 0.25%";
const TEST_SOURCES = ["Reuters", "Bloomberg"];
const TIMEOUT_MS = 90_000; // LLM calls can be slow

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

let server: ChildProcess;

beforeAll(async () => {
  server = spawn(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "server/index.ts"],
    {
      env: { ...process.env, PORT: String(PORT) },
      stdio: "pipe",
    }
  );

  // Wait for the server to print "listening"
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server did not start in time")), 15_000);
    server.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("listening")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
    server.on("error", reject);
  });

  // Small buffer to ensure the server is fully ready
  await sleep(500);
}, 20_000);

afterAll(() => {
  server?.kill();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function post(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe("GET /api/health", () => {
  it("returns { status: ok }", async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("Input validation", () => {
  it("rejects event shorter than 10 chars with 400", async () => {
    const { status, body } = await post("/api/consistency", {
      event: "short",
      sources: ["Reuters"],
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/10/);
  });

  it("rejects event longer than 500 chars with 400", async () => {
    const { status, body } = await post("/api/consistency", {
      event: "x".repeat(501),
      sources: ["Reuters"],
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/500/);
  });

  it("rejects empty sources array with 400", async () => {
    const { status, body } = await post("/api/consistency", {
      event: TEST_EVENT,
      sources: [],
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/non-empty/);
  });

  it("rejects missing sources with 400", async () => {
    const { status } = await post("/api/consistency", { event: TEST_EVENT });
    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/consistency — real LLM call
// ---------------------------------------------------------------------------

describe("POST /api/consistency", () => {
  it(
    "returns a valid ConsistencyReport shape",
    async () => {
      const { status, body } = await post("/api/consistency", {
        event: TEST_EVENT,
        sources: TEST_SOURCES,
      });

      expect(status).toBe(200);

      const report = body as Record<string, unknown>;

      // Top-level fields
      expect(typeof report.unknown_percentage).toBe("number");
      expect(report.unknown_percentage).toBeGreaterThanOrEqual(0);
      expect(report.unknown_percentage).toBeLessThanOrEqual(100);
      expect(typeof report.no_sources_found).toBe("boolean");
      expect(Array.isArray(report.facts)).toBe(true);

      if (!report.no_sources_found) {
        expect((report.facts as unknown[]).length).toBeGreaterThan(0);

        // Validate first fact shape
        const fact = (report.facts as Record<string, unknown>[])[0];
        expect(typeof fact.id).toBe("string");
        expect(typeof fact.statement).toBe("string");
        expect(["consistent", "inconsistent", "unverified"]).toContain(fact.status);
        expect(typeof fact.agreement_percentage).toBe("number");
        expect(Array.isArray(fact.supporting_sources)).toBe(true);
        expect(Array.isArray(fact.contradicting_sources)).toBe(true);
      }
    },
    TIMEOUT_MS
  );
});

// ---------------------------------------------------------------------------
// POST /api/cascade — real LLM call
// ---------------------------------------------------------------------------

describe("POST /api/cascade", () => {
  it(
    "returns a valid CascadeData shape",
    async () => {
      const { status, body } = await post("/api/cascade", {
        event: TEST_EVENT,
        sources: TEST_SOURCES,
      });

      expect(status).toBe(200);

      const data = body as Record<string, unknown>;
      expect(Array.isArray(data.sectors)).toBe(true);
      expect((data.sectors as unknown[]).length).toBeGreaterThan(0);

      // Validate first sector
      const sector = (data.sectors as Record<string, unknown>[])[0];
      expect(typeof sector.name).toBe("string");
      expect(typeof sector.icon).toBe("string");
      expect(Array.isArray(sector.impacts)).toBe(true);

      // Validate first impact
      const impact = (sector.impacts as Record<string, unknown>[])[0];
      expect(typeof impact.id).toBe("string");
      expect(typeof impact.title).toBe("string");
      expect(typeof impact.description).toBe("string");
      expect(["direct", "indirect"]).toContain(impact.type);
      expect(typeof impact.is_hidden_factor).toBe("boolean");
      expect(typeof impact.confidence).toBe("number");
      expect(typeof impact.severity).toBe("number");
      expect((impact.severity as number)).toBeGreaterThanOrEqual(1);
      expect((impact.severity as number)).toBeLessThanOrEqual(10);
      expect(Array.isArray(impact.causal_chain)).toBe(true);
      expect(Array.isArray(impact.children)).toBe(true);
    },
    TIMEOUT_MS
  );
});

// ---------------------------------------------------------------------------
// POST /api/summary — real LLM call
// ---------------------------------------------------------------------------

describe("POST /api/summary", () => {
  it(
    "returns a valid SummaryData shape",
    async () => {
      const { status, body } = await post("/api/summary", {
        event: TEST_EVENT,
        sources: TEST_SOURCES,
      });

      expect(status).toBe(200);

      const data = body as Record<string, unknown>;
      expect(Array.isArray(data.sectors)).toBe(true);
      expect((data.sectors as unknown[]).length).toBeGreaterThan(0);
      expect(Array.isArray(data.hidden_factors_summary)).toBe(true);
      expect(typeof data.narrative_summary).toBe("string");
      expect((data.narrative_summary as string).length).toBeGreaterThan(50);

      // Validate first sector
      const sector = (data.sectors as Record<string, unknown>[])[0];
      expect(typeof sector.name).toBe("string");
      expect(typeof sector.summary_blurb).toBe("string");
      expect(typeof sector.worldwide_implications).toBe("string");
      expect(Array.isArray(sector.charts)).toBe(true);
      expect((sector.charts as unknown[]).length).toBeGreaterThan(0);

      // Validate first chart
      const chart = (sector.charts as Record<string, unknown>[])[0];
      expect(typeof chart.chart_type).toBe("string");
      expect(typeof chart.title).toBe("string");
      expect(Array.isArray(chart.labels)).toBe(true);
      expect(Array.isArray(chart.datasets)).toBe(true);

      // datasets[].values must be same length as labels
      const labels = chart.labels as unknown[];
      for (const ds of chart.datasets as Record<string, unknown>[]) {
        expect(Array.isArray(ds.values)).toBe(true);
        expect((ds.values as unknown[]).length).toBe(labels.length);
      }
    },
    TIMEOUT_MS
  );
});

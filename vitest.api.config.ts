import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/api/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 30_000,
    // Run API tests sequentially — they share a single server process
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});

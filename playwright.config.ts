import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke coverage for the flows that actually mutate state, which the
 * unit tests cannot reach: demo login, publishing a listing, messaging a
 * counterparty and moderating a participant.
 *
 * Runs against `next dev` and the seeded database.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});

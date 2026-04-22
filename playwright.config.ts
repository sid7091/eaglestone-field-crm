import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // SQLite can't handle parallel writes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  globalSetup: require.resolve("./tests/global-setup.ts"),
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["auth-setup"],
    },
  ],
  webServer: {
    command: "PORT=3001 npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

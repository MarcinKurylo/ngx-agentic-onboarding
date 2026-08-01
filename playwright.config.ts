import { defineConfig, devices } from '@playwright/test';

const PORT = 4271;
const baseURL = `http://localhost:${PORT}`;
// Bracket access: root tsconfig has noPropertyAccessFromIndexSignature.
const isCI = !!process.env['CI'];

/**
 * E2E config — top of the test pyramid.
 *
 * Uses the locally installed Google Chrome (`channel: 'chrome'`) so no browser
 * download is needed. The web server rebuilds the library (so the demo picks up
 * the latest dist) and serves the demo app.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'line' : 'list',
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx ng build ngx-agentic-onboarding && npx ng serve demo --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

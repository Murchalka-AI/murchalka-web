import { expect, test } from "@playwright/test";

test("activates a signed WASM Mini App, dispatches its action, rolls back, falls back, and reuses offline cache", async ({ page }) => {
  await page.goto("/e2e/fixtures/phase7.html");
  await expect(page.locator("#state")).toHaveText("passed");
  await expect(page.getByText("Sandboxed component proof value: 7")).toBeVisible();
  await expect(page.locator('[data-component="client.diagnostics.proof-card"]')).toBeVisible();
  await expect(page.locator("#action-result")).toHaveText("client.diagnostics.run:accepted");
  await expect(page.locator("#event-result")).toHaveText("client.diagnostics.proof-card");
  await expect(page.locator("#fallback")).toContainText("unavailable on this device");
});

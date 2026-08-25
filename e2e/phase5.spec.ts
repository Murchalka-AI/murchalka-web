import { expect, test } from "@playwright/test";

test("completes an authenticated Phase 5 agent turn", async ({ page }) => {
  const username = process.env.MURCHALKA_E2E_USERNAME ?? "owner";
  const password = process.env.MURCHALKA_E2E_PASSWORD;
  if (password === undefined || password.length === 0) {
    throw new Error("MURCHALKA_E2E_PASSWORD is required.");
  }

  await page.goto("/");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Connect to Murchalka" }).click();
  await expect(page.getByRole("status")).toContainText("Signed in as");

  await page.getByLabel("Message").fill("Reply with one short greeting.");
  await page.getByRole("button", { name: "Send message" }).click();
  const assistant = page.locator('li[data-role="assistant"]').last();
  await expect(assistant).toBeVisible({ timeout: 180_000 });
  await expect(assistant).not.toHaveText("");
  await expect(page.getByRole("status")).toHaveText("Ready");

  await page.getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByRole("status")).toHaveText("Disconnected");
});

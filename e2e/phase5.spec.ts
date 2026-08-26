import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("completes an authenticated Phase 5 agent turn", async ({ page }) => {
  const username = process.env.MURCHALKA_E2E_USERNAME ?? "owner";
  const password = process.env.MURCHALKA_E2E_PASSWORD;
  if (password === undefined || password.length === 0) {
    throw new Error("MURCHALKA_E2E_PASSWORD is required.");
  }

  await page.goto("/");
  const realtimeEndpoint = process.env.MURCHALKA_E2E_REALTIME_ENDPOINT;
  if (realtimeEndpoint !== undefined && realtimeEndpoint.length > 0) {
    await page.getByLabel("Realtime endpoint").fill(realtimeEndpoint);
  }
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Connect to Murchalka" }).click();
  await expect(page.getByRole("status")).toContainText("Signed in as");

  await page.getByRole("textbox", { name: "Message" }).fill("Reply with one short greeting.");
  await page.getByRole("button", { name: "Send message" }).click();
  const assistant = page.locator('li[data-role="assistant"]').last();
  await expect(assistant).toBeVisible({ timeout: 180_000 });
  await expect(assistant).not.toHaveText("");
  await expect(page.getByRole("status")).toHaveText("Ready");

  const conversation = page.locator(".conversation-card");
  const conversationId = await conversation.getAttribute("data-conversation-id");
  const sessionId = await conversation.getAttribute("data-session-id");
  if (conversationId === null || sessionId === null) {
    throw new Error("Browser turn did not expose correlation evidence.");
  }
  const evidencePath = process.env.MURCHALKA_E2E_EVIDENCE;
  if (evidencePath === undefined || evidencePath.length === 0) {
    throw new Error("MURCHALKA_E2E_EVIDENCE is required.");
  }
  await writeFile(evidencePath, JSON.stringify({ conversationId, sessionId }) + "\n", { mode: 0o600 });

  await page.getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByRole("status")).toHaveText("Disconnected");
});

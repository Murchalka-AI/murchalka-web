import { expect, test, type Page } from "@playwright/test";

const runtimeOrigin = process.env.PHASE7_RUNTIME_ORIGIN;
const adminToken = process.env.PHASE7_ADMIN_TOKEN;

test.skip(runtimeOrigin === undefined || adminToken === undefined, "Installed Runtime acceptance requires an active Phase 7 deployment.");

test("an already-built shell activates, invokes, disables, restores, and reuses the signed Mini App", async ({ page }) => {
  await page.exposeFunction("phase7Dispatch", async (request: unknown) => invoke("client.diagnostics.action", {
    payload: capabilityAction(request),
    idempotencyKey: crypto.randomUUID(),
    scope: { personId: "phase7-browser" },
  }));
  await openShell(page, "web");
  await expect(page.locator('[data-component="client.diagnostics.proof-card"]')).toBeVisible();
  await expect(page.getByText("Sandboxed component proof value: 7")).toBeVisible();
  await expect(page.locator("#download-count")).toHaveText("1");

  await page.getByRole("button", { name: "Run server check" }).click();
  await expect(page.locator("#event-result")).toHaveText("client.diagnostics.proof-card");

  const activeRevision = revision(page);
  await control("disable");
  await expect(page.locator("#state")).toHaveText(/^ready:\d+:0:web$/);
  expect(await revision(page)).toBeGreaterThan(await activeRevision);
  await expect(page.locator('[data-component="client.diagnostics.proof-card"]')).toHaveCount(0);

  const disabledRevision = revision(page);
  await control("enable");
  await expect(page.locator("#state")).toHaveText(/^ready:\d+:1:web$/);
  expect(await revision(page)).toBeGreaterThan(await disabledRevision);
  await expect(page.locator('[data-component="client.diagnostics.proof-card"]')).toBeVisible();
  await expect(page.locator("#download-count")).toHaveText("1");
});

test("the same signed extension activates for the desktop target", async ({ page }) => {
  await page.exposeFunction("phase7Dispatch", async () => ({
    type: "diagnostic.completed",
    accepted: true,
    diagnosticValue: 7,
    payloadDigest: "0".repeat(64),
    checkedAt: new Date().toISOString(),
  }));
  await openShell(page, "desktop");
  await expect(page.locator('[data-component="client.diagnostics.proof-card"]')).toBeVisible();
  await expect(page.locator("#state")).toHaveText(/^ready:\d+:1:desktop$/);
});

async function openShell(page: Page, target: "web" | "desktop"): Promise<void> {
  const query = new URLSearchParams({ runtime: runtimeOrigin!, target });
  await page.goto(`/e2e/fixtures/runtime.html?${query}`);
  await expect(page.locator("#state")).toHaveText(new RegExp(`^ready:\\d+:1:${target}$`));
}

async function invoke(capability: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${runtimeOrigin}/v1/capabilities/${capability}/invoke`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Runtime invocation failed with HTTP ${response.status}: ${await response.text()}`);
  return response.json() as Promise<unknown>;
}

function capabilityAction(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Client action request is invalid.");
  const request = value as Record<string, unknown>;
  return { extensionId: request.extensionId, actionId: request.actionId, payload: request.payload };
}

async function control(action: "enable" | "disable"): Promise<void> {
  const response = await fetch(`${runtimeOrigin}/v1/modules/dev.murchalka.client-diagnostics/${action}`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  if (!response.ok) throw new Error(`Runtime module ${action} failed with HTTP ${response.status}: ${await response.text()}`);
}

async function revision(page: Page): Promise<number> {
  return Number((await page.locator("#state").textContent())?.split(":")[1]);
}

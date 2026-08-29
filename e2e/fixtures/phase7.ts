import {
  defaultClientSecurityPolicy,
  DigestVerifier,
  ExtensionRegistry,
  ExtensionSignatureVerifier,
  MemoryVerifiedExtensionCache,
  MurchalkaClientRuntime,
  type ClientExtension,
  type ExtensionCatalogEntry,
  type ExtensionCatalogSnapshot,
  type SignedClientExtension,
} from "@murchalka/client-runtime";

const wasm = "AGFzbQEAAAABCQJgAX8AYAABfwIaAQltdXJjaGFsa2EMY29uc3VtZV9mdWVsAAADAgEBBxQBEGRpYWdub3N0aWNfdmFsdWUAAQoKAQgAQQEQAEEHCw==";
const extension: ClientExtension = {
  apiVersion: "client.murchalka.dev/v1",
  kind: "ClientExtension",
  id: "client.diagnostics",
  version: "0.4.0",
  targets: ["web", "desktop"],
  mode: "wasm",
  componentDefinitions: [{
    id: "client.diagnostics.proof-card",
    version: 1,
    propertiesSchemaVersion: 1,
    eventsSchemaVersion: 1,
    propertiesSchema: { type: "object", additionalProperties: false, required: ["message"], properties: { message: { type: "string", maxLength: 256 } } },
    eventsSchema: { type: "object", additionalProperties: false, required: ["type", "accepted", "diagnosticValue"], properties: { type: { const: "diagnostic.completed" }, accepted: { const: true }, diagnosticValue: { const: 7 } } },
    template: { component: "standard.layout", properties: { direction: "column" }, children: [
      { component: "standard.text", properties: { text: { $bind: "message.title" } } },
      { component: "extension-host", id: "proof", properties: { export: "diagnostic_value", resultLabel: { $bind: "message.result" } } },
      { component: "standard.action", properties: { label: { $bind: "message.run" }, action: "client.diagnostics.run", payload: { message: "Phase 7" } } },
    ] },
  }],
  componentTree: { component: "standard.layout", properties: { direction: "column" }, children: [
    { component: "client.diagnostics.proof-card", id: "proof-card", properties: { message: "Phase 7" } },
  ] },
  actions: [{ id: "client.diagnostics.run", handlerModule: "dev.murchalka.client-diagnostics", payloadSchemaVersion: 1 }],
  accessibility: { label: "Client Runtime diagnostics", description: "Phase 7 acceptance", liveRegion: "polite" },
  localization: { defaultLocale: "en", messages: { en: { title: "Client Runtime diagnostics", result: "Sandboxed component proof value", run: "Run server check" }, ru: { title: "Диагностика Client Runtime", result: "Результат изолированного компонента", run: "Запустить проверку сервера" } } },
  fallbackComponent: "standard.document",
  wasmBase64: wasm,
  propertiesSchemaVersion: 1,
  eventsSchemaVersion: 1,
};

void run().catch(error => {
  document.getElementById("state")!.textContent = error instanceof Error ? `failed: ${error.message}` : "failed";
});

async function run(): Promise<void> {
  const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publisher = { publisher: "dev.murchalka", keyId: "phase7-browser", publicKeyPem: pem(await crypto.subtle.exportKey("spki", keys.publicKey)) };
  const signed = await envelope(extension, keys.privateKey, publisher.keyId);
  const signedBytes = encode(signed);
  const signedDigest = await new DigestVerifier().compute(signedBytes);
  const validEntry = entry(signedDigest, signedBytes.byteLength);
  const artifacts = new Map<string, Uint8Array>([[signedDigest, signedBytes]]);
  let fetches = 0;
  const fetcher = { fetch: async (url: string): Promise<Uint8Array> => {
    fetches += 1;
    const digest = `sha256:${url.split("/").at(-1) ?? ""}`;
    const value = artifacts.get(digest);
    if (value === undefined) throw new Error("artifact unavailable");
    return Uint8Array.from(value);
  } };
  const cache = new MemoryVerifiedExtensionCache(8);
  const runtime = new MurchalkaClientRuntime({
    target: "web",
    artifactFetcher: fetcher,
    artifactCache: cache,
    trustedPublishers: [publisher],
    securityPolicy: defaultClientSecurityPolicy,
    actionTransport: { dispatch: async request => {
      document.getElementById("action-result")!.textContent = `${request.actionId}:accepted`;
      return { type: "diagnostic.completed", accepted: true, diagnosticValue: 7 };
    } },
  });
  await runtime.activateCatalog(snapshot(1, [validEntry]));
  document.getElementById("apps")!.addEventListener("murchalka:component-event", event => {
    const detail = (event as CustomEvent<{ readonly componentId: string }>).detail;
    document.getElementById("event-result")!.textContent = detail.componentId;
  });
  await runtime.render(document.getElementById("apps")!, "en", error => { throw error; });

  const badDocument = { ...signed, signature: { ...signed.signature, value: btoa(String.fromCharCode(...new Uint8Array(64))) } };
  const badBytes = encode(badDocument);
  const badDigest = await new DigestVerifier().compute(badBytes);
  artifacts.set(badDigest, badBytes);
  let rejected = false;
  try { await runtime.activateCatalog(snapshot(2, [entry(badDigest, badBytes.byteLength)])); } catch { rejected = true; }
  if (!rejected || runtime.revision !== 1) throw new Error("unsigned rollback gate failed");

  const corruptWasm = await envelope({ ...extension, wasmBase64: "AA==" }, keys.privateKey, publisher.keyId);
  const corruptWasmBytes = encode(corruptWasm);
  const corruptWasmDigest = await new DigestVerifier().compute(corruptWasmBytes);
  artifacts.set(corruptWasmDigest, corruptWasmBytes);
  rejected = false;
  try { await runtime.activateCatalog(snapshot(3, [entry(corruptWasmDigest, corruptWasmBytes.byteLength)])); } catch { rejected = true; }
  if (!rejected || runtime.revision !== 1) throw new Error("WASM activation rollback gate failed");

  const offline = new ExtensionRegistry("web", { fetch: async () => { throw new Error("network must not be used"); } }, cache, new ExtensionSignatureVerifier([publisher]), defaultClientSecurityPolicy);
  await offline.activate(snapshot(1, [validEntry]));
  const fallback = new ExtensionRegistry("mobile", { fetch: async () => { throw new Error("fallback must not fetch"); } }, new MemoryVerifiedExtensionCache(), new ExtensionSignatureVerifier([publisher]), defaultClientSecurityPolicy);
  const fallbackState = await fallback.activate(snapshot(1, [validEntry]));
  if (!fallbackState.extensions[0]?.isFallback || fetches !== 3) throw new Error("offline or fallback gate failed");

  const button = document.querySelector<HTMLButtonElement>("#apps button");
  if (button === null) throw new Error("custom action was not rendered");
  button.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  document.getElementById("fallback")!.textContent = fallbackState.extensions[0].extension.componentTree.properties?.text as string;
  document.getElementById("state")!.textContent = "passed";
}

function snapshot(revision: number, entries: readonly ExtensionCatalogEntry[]): ExtensionCatalogSnapshot {
  return { schemaVersion: 1, revision, generatedAt: new Date().toISOString(), entries };
}

function entry(digest: string, bytes: number): ExtensionCatalogEntry {
  return { extensionId: extension.id, extensionVersion: extension.version, moduleId: "dev.murchalka.client-diagnostics", moduleVersion: "0.4.0", artifactId: "client-diagnostics", artifactDigest: digest, artifactBytes: bytes, artifactUrl: `/client/v1/artifacts/${digest.slice(7)}`, mode: "wasm", targets: ["web", "desktop"], publisher: "dev.murchalka", keyId: "phase7-browser", fallbackComponent: "standard.document" };
}

async function envelope(value: ClientExtension, key: CryptoKey, keyId: string): Promise<SignedClientExtension> {
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(canonical(value)));
  return { schemaVersion: 1, extension: value, signature: { algorithm: "ecdsa-p256-sha256", keyId, value: btoa(String.fromCharCode(...new Uint8Array(signature))) } };
}

function encode(value: unknown): Uint8Array { return new TextEncoder().encode(JSON.stringify(value)); }
function pem(value: ArrayBuffer): string { const base64 = btoa(String.fromCharCode(...new Uint8Array(value))).match(/.{1,64}/g)?.join("\n") ?? ""; return `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----`; }
function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  throw new Error("unsupported canonical value");
}

import {
  defaultClientSecurityPolicy,
  ExtensionCatalogClient,
  HttpArtifactFetcher,
  IndexedDbVerifiedExtensionCache,
  MurchalkaClientRuntime,
  TrustedPublisherClient,
  type ArtifactFetcher,
  type ClientActionRequest,
  type ClientTarget,
} from "@murchalka/client-runtime";

declare global {
  interface Window {
    phase7Dispatch(request: ClientActionRequest): Promise<unknown>;
  }
}

const state = required("state");
const host = required("apps");
const downloadCount = required("download-count");
const parameters = new URLSearchParams(location.search);
const runtimeOrigin = new URL(parameters.get("runtime") ?? "http://127.0.0.1:15078");
const target = parseTarget(parameters.get("target"));

void start().catch(error => {
  state.textContent = error instanceof Error ? `failed: ${error.message}` : "failed";
});

async function start(): Promise<void> {
  const policy = defaultClientSecurityPolicy;
  const catalog = new ExtensionCatalogClient(runtimeOrigin, policy);
  const publishers = await new TrustedPublisherClient(runtimeOrigin).getPublishers();
  const countingFetcher = new CountingArtifactFetcher(new HttpArtifactFetcher(runtimeOrigin));
  const runtime = new MurchalkaClientRuntime({
    target,
    artifactFetcher: countingFetcher,
    artifactCache: new IndexedDbVerifiedExtensionCache(8, `phase7-${target}`),
    trustedPublishers: publishers,
    securityPolicy: policy,
    actionTransport: { dispatch: request => window.phase7Dispatch(request) },
  });
  let queued = Promise.resolve();
  const refresh = async (): Promise<void> => {
    const snapshot = await catalog.getSnapshot();
    if (snapshot.revision !== runtime.revision) await runtime.activateCatalog(snapshot);
    await runtime.render(host, "en", error => { throw error; });
    downloadCount.textContent = String(countingFetcher.downloads);
    state.textContent = `ready:${snapshot.revision}:${snapshot.entries.length}:${target}`;
  };
  host.addEventListener("murchalka:component-event", event => {
    const detail = (event as CustomEvent<{ readonly componentId: string }>).detail;
    required("event-result").textContent = detail.componentId;
  });
  await refresh();
  catalog.subscribe(revision => {
    if (revision <= runtime.revision) return;
    queued = queued.then(refresh).catch(error => {
      state.textContent = error instanceof Error ? `failed: ${error.message}` : "failed";
    });
  }, error => { state.textContent = `failed: ${error.message}`; });
}

class CountingArtifactFetcher implements ArtifactFetcher {
  public downloads = 0;

  public constructor(private readonly inner: ArtifactFetcher) {}

  public async fetch(url: string, maximumBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
    this.downloads += 1;
    return this.inner.fetch(url, maximumBytes, signal);
  }
}

function parseTarget(value: string | null): ClientTarget {
  if (value === null || value === "web") return "web";
  if (value === "desktop") return "desktop";
  throw new Error("Unsupported acceptance target.");
}

function required(identifier: string): HTMLElement {
  const value = document.getElementById(identifier);
  if (value === null) throw new Error(`Required element '${identifier}' is missing.`);
  return value;
}

export {};

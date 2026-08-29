import { useEffect, useRef, useState } from "react";
import {
  defaultClientSecurityPolicy,
  ExtensionCatalogClient,
  HttpArtifactFetcher,
  IndexedDbVerifiedExtensionCache,
  MurchalkaClientRuntime,
  TrustedPublisherClient,
  type ClientActionTransport,
  type ClientTarget,
} from "@murchalka/client-runtime";

interface MiniAppsProps {
  readonly runtimeEndpoint: string;
  readonly actionTransport: ClientActionTransport;
  readonly target?: ClientTarget;
}

export function MiniApps({ runtimeEndpoint, actionTransport, target = "web" }: MiniAppsProps) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading signed Mini Apps…");

  useEffect(() => {
    const controller = new AbortController();
    let unsubscribe = (): void => undefined;
    let queued = Promise.resolve();
    const start = async (): Promise<void> => {
      const runtimeOrigin = new URL(runtimeEndpoint);
      const policy = defaultClientSecurityPolicy;
      const publishers = await new TrustedPublisherClient(runtimeOrigin).getPublishers(controller.signal);
      const catalog = new ExtensionCatalogClient(runtimeOrigin, policy);
      const runtime = new MurchalkaClientRuntime({
        target,
        actionTransport,
        artifactFetcher: new HttpArtifactFetcher(runtimeOrigin),
        artifactCache: new IndexedDbVerifiedExtensionCache(),
        trustedPublishers: publishers,
        securityPolicy: policy,
      });
      const refresh = async (): Promise<void> => {
        const snapshot = await catalog.getSnapshot(controller.signal);
        await runtime.activateCatalog(snapshot, controller.signal);
        if (host.current !== null) await runtime.render(host.current, navigator.language, error => setStatus(error.message), controller.signal);
        setStatus(snapshot.entries.length === 0 ? "No Mini Apps installed" : `${snapshot.entries.length} Mini App${snapshot.entries.length === 1 ? "" : "s"} · revision ${snapshot.revision}`);
      };
      await refresh();
      unsubscribe = catalog.subscribe(revision => {
        if (revision <= runtime.revision) return;
        queued = queued.then(refresh).catch(error => setStatus(error instanceof Error ? error.message : "Mini App refresh failed."));
      }, error => setStatus(error.message));
    };
    void start().catch(error => setStatus(error instanceof Error ? error.message : "Mini Apps are unavailable."));
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [actionTransport, runtimeEndpoint, target]);

  return (
    <section className="mini-apps" aria-labelledby="mini-apps-title">
      <div className="mini-apps-heading">
        <h3 id="mini-apps-title">Mini Apps</h3>
        <small role="status">{status}</small>
      </div>
      <div ref={host} className="mini-apps-host" />
    </section>
  );
}

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
import { summarizeMiniAppEvent } from "./mini-apps/summarizeMiniAppEvent";

interface MiniAppsProps {
  readonly runtimeEndpoint: string;
  readonly actionTransport: ClientActionTransport;
  readonly target?: ClientTarget;
}

export function MiniApps({ runtimeEndpoint, actionTransport, target = "web" }: MiniAppsProps) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading signed Mini Apps…");
  const [extensionCount, setExtensionCount] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [actionStatus, setActionStatus] = useState<{ readonly kind: "pending" | "success" | "error"; readonly text: string }>();

  useEffect(() => {
    const controller = new AbortController();
    let unsubscribe = (): void => undefined;
    let queued = Promise.resolve();
    const currentHost = host.current;
    const actionStarted = (event: Event): void => {
      if (event.target instanceof Element && event.target.closest("button") !== null) {
        setActionStatus({ kind: "pending", text: "Running Mini App action…" });
      }
    };
    const actionCompleted = (event: Event): void => {
      if (event instanceof CustomEvent) setActionStatus({ kind: "success", text: summarizeMiniAppEvent(event.detail?.value) });
    };
    currentHost?.addEventListener("click", actionStarted);
    currentHost?.addEventListener("murchalka:component-event", actionCompleted);
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
        if (host.current !== null) await runtime.render(host.current, navigator.language, error => {
          setActionStatus({ kind: "error", text: error.message });
        }, controller.signal);
        setExtensionCount(snapshot.entries.length);
        if (snapshot.entries.length === 0) setActionStatus(undefined);
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
      currentHost?.removeEventListener("click", actionStarted);
      currentHost?.removeEventListener("murchalka:component-event", actionCompleted);
    };
  }, [actionTransport, runtimeEndpoint, target]);

  return (
    <section className="mini-apps" aria-labelledby="mini-apps-title">
      <div className="mini-apps-heading">
        <h3 id="mini-apps-title">Mini Apps</h3>
        <div className="mini-apps-controls">
          <small role="status">{status}</small>
          {extensionCount > 0 && (
            <button type="button" className="mini-apps-toggle" aria-expanded={expanded} aria-controls="mini-apps-content" onClick={() => setExpanded(value => !value)}>
              {expanded ? "Hide" : "Show"}
            </button>
          )}
        </div>
      </div>
      <div id="mini-apps-content" ref={host} className="mini-apps-host" hidden={extensionCount === 0 || !expanded} />
      {extensionCount > 0 && expanded && actionStatus !== undefined && (
        <output className={`mini-app-action-status ${actionStatus.kind}`} aria-live="polite">{actionStatus.text}</output>
      )}
    </section>
  );
}

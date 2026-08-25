import { type FormEvent, useEffect, useRef, useState } from "react";
import type { AgentMessage } from "./models/AgentMessage";
import type { AgentUiDocument } from "./models/AgentUiDocument";
import type { AuthenticatedPrincipal } from "./models/AuthenticatedPrincipal";
import { RealtimeClient } from "./realtime/RealtimeClient";
import { isAllowedRealtimeEndpoint } from "./security/isAllowedRealtimeEndpoint";

const defaultEndpoint = "ws://127.0.0.1:5080/v1/realtime";

export function App() {
  const [endpoint, setEndpoint] = useState(defaultEndpoint);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [busy, setBusy] = useState(false);
  const [principal, setPrincipal] = useState<AuthenticatedPrincipal>();
  const [agentUi, setAgentUi] = useState<AgentUiDocument>();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const client = useRef<RealtimeClient | undefined>(undefined);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const messageList = useRef<HTMLOListElement>(null);

  useEffect(() => () => client.current?.close(), []);
  useEffect(() => {
    if (principal !== undefined) {
      messageInput.current?.focus();
    }
  }, [principal]);
  useEffect(() => {
    messageList.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const disconnect = (): void => {
    client.current?.close();
    client.current = undefined;
    setPrincipal(undefined);
    setAgentUi(undefined);
    setMessages([]);
    setConversationId(crypto.randomUUID());
    setStatus("Disconnected");
    setBusy(false);
  };

  const login = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!isAllowedRealtimeEndpoint(endpoint)) {
      setStatus("Only an explicit loopback realtime endpoint is allowed.");
      return;
    }

    setBusy(true);
    setStatus("Connecting…");
    const nextClient = new RealtimeClient(endpoint);
    client.current?.close();
    client.current = nextClient;
    try {
      await nextClient.connect();
      const nextPrincipal = await nextClient.authenticate(username.trim(), password);
      const nextAgentUi = await nextClient.getAgentUi(conversationId);
      setPrincipal(nextPrincipal);
      setAgentUi(nextAgentUi);
      setStatus(`Signed in as ${nextPrincipal.subject}`);
    } catch (error) {
      nextClient.close();
      if (client.current === nextClient) {
        client.current = undefined;
      }
      setStatus(error instanceof Error ? error.message : "Connection failed.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  };

  const send = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const content = draft.trim();
    const activeClient = client.current;
    if (content.length === 0 || activeClient === undefined) {
      return;
    }

    setDraft("");
    setBusy(true);
    setStatus("Murchalka is thinking…");
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", content }]);
    try {
      const result = await activeClient.sendTurn(conversationId, content, crypto.randomUUID());
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.message.content,
      }]);
      setStatus("Ready");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Agent turn failed.");
    } finally {
      setBusy(false);
    }
  };

  const conversationLabel = agentUi?.componentTree.properties?.label ?? "Conversation";
  const liveRegion = agentUi?.accessibility?.liveRegion === "assertive" ? "assertive" : "polite";
  const statusKind = busy ? "busy" : principal === undefined ? "offline" : "online";

  return (
    <div className="page">
      <div className="glow glow-top" aria-hidden="true" />
      <div className="glow glow-bottom" aria-hidden="true" />
      <main className="app-frame" aria-labelledby="title">
        <section className="brand-panel">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">M</span>
            <span>Murchalka</span>
          </div>
          <div className="brand-copy">
            <p className="eyebrow"><span className="pulse" aria-hidden="true" /> Local-first companion</p>
            <h1 id="title">A conversation that feels <em>alive.</em></h1>
            <p className="brand-description">Private by default. Modular by design. Yours to shape.</p>
          </div>
          <ul className="trust-list" aria-label="Product qualities">
            <li><span aria-hidden="true">⌂</span><strong>Local</strong><small>Runs on your device</small></li>
            <li><span aria-hidden="true">◇</span><strong>Private</strong><small>Your data stays yours</small></li>
            <li><span aria-hidden="true">✦</span><strong>Modular</strong><small>Built to evolve</small></li>
          </ul>
        </section>

        <section className="workspace-panel">
          <div className="workspace-topbar">
            <div className="mobile-brand">
              <span className="brand-mark" aria-hidden="true">M</span>
              <span>Murchalka</span>
            </div>
            <p className={`status-chip ${statusKind}`} role="status">
              <span aria-hidden="true" />{status}
            </p>
          </div>

          {principal === undefined ? (
            <div className="auth-card">
              <div className="section-heading">
                <p className="section-kicker">Welcome back</p>
                <h2 id="login-title">Connect your companion</h2>
                <p>Sign in to your private Murchalka runtime.</p>
              </div>
              <form className="auth-form" onSubmit={event => void login(event)} aria-labelledby="login-title">
                <label className="endpoint-field">
                  <span>Realtime endpoint</span>
                  <input value={endpoint} onChange={event => setEndpoint(event.target.value)} inputMode="url" spellCheck="false" required disabled={busy} />
                  <small><span aria-hidden="true">●</span> Loopback connections only</small>
                </label>
                <div className="credential-grid">
                  <label>
                    <span>Username</span>
                    <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" placeholder="Your username" required disabled={busy} />
                  </label>
                  <label>
                    <span>Password</span>
                    <input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="••••••••••••" required disabled={busy} />
                  </label>
                </div>
                <button className="primary-button" type="submit" disabled={busy}>
                  <span>{busy ? "Connecting…" : "Connect to Murchalka"}</span><span aria-hidden="true">→</span>
                </button>
              </form>
              <p className="privacy-note"><span aria-hidden="true">⌁</span> No cloud account required</p>
            </div>
          ) : (
            <div className="conversation-card" data-view-id={agentUi?.viewId}>
              <div className="conversation-heading">
                <div>
                  <p className="section-kicker">Private session</p>
                  <h2 id="conversation-title">{conversationLabel}</h2>
                </div>
                <button type="button" className="quiet" onClick={disconnect}>Disconnect</button>
              </div>
              <ol ref={messageList} className="messages" aria-live={liveRegion} aria-relevant="additions">
                {messages.length === 0 && (
                  <li className="empty-state">
                    <span aria-hidden="true">✦</span>
                    <strong>Start a conversation</strong>
                    <small>Murchalka is here and ready to listen.</small>
                  </li>
                )}
                {messages.map(message => (
                  <li key={message.id} data-role={message.role}>{message.content}</li>
                ))}
              </ol>
              <form className="composer" onSubmit={event => void send(event)}>
                <label className="sr-only" htmlFor="message">Message</label>
                <textarea
                  ref={messageInput}
                  id="message"
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  placeholder="Write a message…"
                  maxLength={32768}
                  rows={3}
                  required
                  disabled={busy}
                />
                <button className="send-button" type="submit" disabled={busy} aria-label={busy ? "Waiting for response" : "Send message"}>↑</button>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

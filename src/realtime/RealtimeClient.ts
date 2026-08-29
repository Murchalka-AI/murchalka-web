import type { AuthenticatedPrincipal } from "../models/AuthenticatedPrincipal";
import type { TurnResult } from "../models/TurnResult";
import { isAllowedRealtimeEndpoint } from "../security/isAllowedRealtimeEndpoint";
import { AgentUiRuntime, defaultClientSecurityPolicy, type AgentUiDocument, type ClientActionRequest, type ClientActionTransport } from "@murchalka/client-runtime";

export class RealtimeClient implements ClientActionTransport {
  private readonly agentUi = new AgentUiRuntime(defaultClientSecurityPolicy);
  private socket: WebSocket | undefined;
  private readonly pending: Array<{
    readonly resolve: (value: unknown) => void;
    readonly reject: (reason: Error) => void;
  }> = [];

  public constructor(private readonly endpoint: string) {
    if (!isAllowedRealtimeEndpoint(endpoint)) {
      throw new Error("Only an explicit loopback realtime endpoint is allowed.");
    }
  }

  public async connect(signal?: AbortSignal): Promise<void> {
    if (this.socket !== undefined) {
      throw new Error("The realtime client is already connected.");
    }

    const socket = new WebSocket(this.endpoint);
    this.socket = socket;
    socket.addEventListener("message", event => this.handleMessage(event));
    socket.addEventListener("close", () => this.handleClose());

    await new Promise<void>((resolve, reject) => {
      const opened = (): void => {
        cleanup();
        resolve();
      };
      const failed = (): void => {
        cleanup();
        this.close();
        reject(new Error("Realtime connection failed."));
      };
      const aborted = (): void => {
        cleanup();
        this.close();
        reject(new DOMException("Realtime connection was cancelled.", "AbortError"));
      };
      const cleanup = (): void => {
        socket.removeEventListener("open", opened);
        socket.removeEventListener("error", failed);
        signal?.removeEventListener("abort", aborted);
      };

      socket.addEventListener("open", opened, { once: true });
      socket.addEventListener("error", failed, { once: true });
      signal?.addEventListener("abort", aborted, { once: true });
      if (signal?.aborted === true) {
        aborted();
      }
    });
  }

  public async authenticate(username: string, password: string): Promise<AuthenticatedPrincipal> {
    const response = this.asRecord(await this.exchange({ type: "authenticate", username, password }));
    if (response.type !== "authenticated" || typeof response.subject !== "string" ||
        typeof response.personId !== "string" || !this.isStringArray(response.roles)) {
      throw new Error("Authentication returned an invalid principal.");
    }

    return { subject: response.subject, personId: response.personId, roles: response.roles };
  }

  public async getAgentUi(conversationId: string): Promise<AgentUiDocument> {
    const response = this.asRecord(await this.exchange({ type: "ui.get", conversationId }));
    if (response.type !== "ui.document") throw new Error("The server returned an invalid Agent UI response.");
    const snapshot = this.agentUi.activate(response.document);
    if (!snapshot.document.actions.some(action => action.id === "agent.turn")) throw new Error("The Agent UI document does not declare the required turn action.");
    return snapshot.document;
  }

  public async sendTurn(conversationId: string, text: string, idempotencyKey: string): Promise<TurnResult> {
    const response = this.asRecord(await this.exchange({ type: "turn", conversationId, text, idempotencyKey }));
    const result = this.asRecord(response.result);
    const message = this.asRecord(result.message);
    if (response.type !== "turn.completed" || typeof response.sessionId !== "string" ||
        message.role !== "assistant" || typeof message.content !== "string") {
      throw new Error("Agent turn returned an invalid response.");
    }

    return { ...result, sessionId: response.sessionId } as unknown as TurnResult;
  }

  public async dispatch(request: ClientActionRequest, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted === true) throw new DOMException("Client action was cancelled.", "AbortError");
    const response = this.asRecord(await this.exchange({ type: "action.dispatch", ...request }));
    if (response.type !== "action.completed" || !("result" in response)) throw new Error("Client action returned an invalid response.");
    return response.result;
  }

  public close(): void {
    const socket = this.socket;
    this.socket = undefined;
    if (socket !== undefined && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, "client-disposed");
    }

    this.rejectPending(new Error("Realtime connection closed."));
  }

  private exchange(request: Readonly<Record<string, unknown>>): Promise<unknown> {
    const socket = this.socket;
    if (socket?.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Realtime connection is closed."));
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      try {
        socket.send(JSON.stringify(request));
      } catch (error) {
        this.pending.pop();
        reject(error instanceof Error ? error : new Error("Realtime request failed."));
      }
    });
  }

  private handleMessage(event: MessageEvent<unknown>): void {
    const pending = this.pending.shift();
    if (pending === undefined) {
      return;
    }

    try {
      if (typeof event.data !== "string") {
        throw new Error("Realtime response must be UTF-8 JSON text.");
      }

      const response = this.asRecord(JSON.parse(event.data) as unknown);
      if (response.type === "error") {
        const code = typeof response.code === "string" ? response.code : "realtime-failed";
        const message = typeof response.message === "string" ? response.message : "Realtime request failed.";
        throw new Error(`${code}: ${message}`);
      }

      pending.resolve(response);
    } catch (error) {
      pending.reject(error instanceof Error ? error : new Error("Realtime response is invalid."));
    }
  }

  private handleClose(): void {
    this.socket = undefined;
    this.rejectPending(new Error("Realtime connection closed."));
  }

  private rejectPending(error: Error): void {
    this.pending.splice(0).forEach(request => request.reject(error));
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("Realtime response is invalid.");
    }

    return value as Record<string, unknown>;
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === "string");
  }
}

export interface AgentMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
}

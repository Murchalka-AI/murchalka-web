export interface TurnResult {
  readonly sessionId: string;
  readonly message: {
    readonly role: "assistant";
    readonly content: string;
  };
}

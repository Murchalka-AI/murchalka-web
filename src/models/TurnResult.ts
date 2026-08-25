export interface TurnResult {
  readonly message: {
    readonly role: "assistant";
    readonly content: string;
  };
}

export interface AgentUiDocument {
  readonly viewId: string;
  readonly componentTree: {
    readonly component: string;
    readonly properties?: {
      readonly label?: string;
    };
  };
  readonly actions: ReadonlyArray<{
    readonly id: string;
  }>;
  readonly accessibility?: {
    readonly liveRegion?: string;
  };
}

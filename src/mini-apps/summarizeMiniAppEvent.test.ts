import { describe, expect, it } from "vitest";
import { summarizeMiniAppEvent } from "./summarizeMiniAppEvent";

describe("summarizeMiniAppEvent", () => {
  it("shows an event name and bounded result value", () => {
    expect(summarizeMiniAppEvent({ type: "diagnostic.completed", accepted: true, diagnosticValue: 7 }))
      .toBe("✓ Diagnostic completed · value 7");
  });

  it("falls back for non-object event values", () => {
    expect(summarizeMiniAppEvent(undefined)).toBe("✓ Mini App action completed");
  });
});

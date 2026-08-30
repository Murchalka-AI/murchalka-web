import { describe, expect, it } from "vitest";
import { isSendShortcut } from "./isSendShortcut";

describe("isSendShortcut", () => {
  it("sends on Enter", () => expect(isSendShortcut("Enter", false, false)).toBe(true));
  it("keeps a newline on Shift+Enter", () => expect(isSendShortcut("Enter", true, false)).toBe(false));
  it("does not submit during input method composition", () => expect(isSendShortcut("Enter", false, true)).toBe(false));
  it("ignores other keys", () => expect(isSendShortcut("Space", false, false)).toBe(false));
});

/** Returns whether a composer key press should submit the current message. */
export function isSendShortcut(key: string, shiftKey: boolean, isComposing: boolean): boolean {
  return key === "Enter" && !shiftKey && !isComposing;
}

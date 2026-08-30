/** Builds a concise, feature-neutral status from a schema-validated Mini App event. */
export function summarizeMiniAppEvent(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return "✓ Mini App action completed";
  const record = value as Readonly<Record<string, unknown>>;
  const eventName = typeof record.type === "string" ? humanize(record.type) : "Mini App action completed";
  const result = Object.entries(record).find(([key, item]) => key.toLowerCase().endsWith("value") && isDisplayValue(item));
  const suffix = result === undefined ? "" : ` · value ${String(result[1])}`;
  return `${record.accepted === false ? "Action rejected" : `✓ ${eventName}`}${suffix}`;
}

function humanize(value: string): string {
  const text = value.replace(/[._-]+/g, " ").trim();
  return text.length === 0 ? "Mini App action completed" : text[0]!.toUpperCase() + text.slice(1);
}

function isDisplayValue(value: unknown): value is string | number | boolean {
  return typeof value === "number" || typeof value === "boolean" || (typeof value === "string" && value.length <= 128);
}

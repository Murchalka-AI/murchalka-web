/** Accepts only an explicit, uncredentialed HTTP loopback Runtime origin. */
export function isAllowedRuntimeEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && url.username === "" && url.password === "" &&
      ["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

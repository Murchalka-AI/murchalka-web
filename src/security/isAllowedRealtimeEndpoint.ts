const allowedHosts = new Set(["127.0.0.1"]);

export function isAllowedRealtimeEndpoint(value: string): boolean {
  try {
    const endpoint = new URL(value);
    return endpoint.protocol === "ws:" &&
      allowedHosts.has(endpoint.hostname) &&
      endpoint.port.length > 0 &&
      endpoint.pathname === "/v1/realtime" &&
      endpoint.username.length === 0 &&
      endpoint.password.length === 0 &&
      endpoint.search.length === 0 &&
      endpoint.hash.length === 0;
  } catch {
    return false;
  }
}

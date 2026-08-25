import { describe, expect, it } from "vitest";
import { isAllowedRealtimeEndpoint } from "./isAllowedRealtimeEndpoint";

describe("isAllowedRealtimeEndpoint", () => {
  it.each([
    "ws://127.0.0.1:5080/v1/realtime",
    "ws://[::1]:5080/v1/realtime",
  ])("accepts the explicit loopback realtime endpoint %s", endpoint => {
    expect(isAllowedRealtimeEndpoint(endpoint)).toBe(true);
  });

  it.each([
    "wss://127.0.0.1:5080/v1/realtime",
    "ws://localhost:5080/v1/realtime",
    "ws://127.0.0.1/v1/realtime",
    "ws://127.0.0.1:5080/other",
    "ws://user:password@127.0.0.1:5080/v1/realtime",
    "ws://127.0.0.1:5080/v1/realtime?token=value",
  ])("rejects the non-canonical endpoint %s", endpoint => {
    expect(isAllowedRealtimeEndpoint(endpoint)).toBe(false);
  });
});

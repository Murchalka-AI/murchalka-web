import { describe, expect, it } from "vitest";
import { isAllowedRuntimeEndpoint } from "./isAllowedRuntimeEndpoint";

describe("isAllowedRuntimeEndpoint", () => {
  it.each([
    "http://127.0.0.1:5078/",
    "http://localhost:5078/",
  ])("accepts the explicit loopback Runtime origin %s", endpoint => {
    expect(isAllowedRuntimeEndpoint(endpoint)).toBe(true);
  });

  it.each([
    "https://127.0.0.1:5078/",
    "http://192.168.1.10:5078/",
    "http://[::1]:5078/",
    "http://user:password@127.0.0.1:5078/",
    "http://127.0.0.1:5078/client/v1/",
    "http://127.0.0.1:5078/?token=value",
    "not-a-url",
  ])("rejects the non-canonical endpoint %s", endpoint => {
    expect(isAllowedRuntimeEndpoint(endpoint)).toBe(false);
  });
});

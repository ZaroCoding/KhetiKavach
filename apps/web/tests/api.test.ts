import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ApiError, apiBaseUrl, fetchHealth } from "@/lib/api";

describe("api client", () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test/";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = original;
  });

  it("strips the trailing slash from the base url", () => {
    expect(apiBaseUrl()).toBe("http://api.test");
  });

  it("throws when the base url is not configured", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(() => apiBaseUrl()).toThrow(ApiError);
  });

  it("throws on a non-OK response", async () => {
    const failing = (async () => new Response(null, { status: 503 })) as typeof fetch;
    await expect(fetchHealth(failing)).rejects.toThrow("HTTP 503");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiBaseUrl, fetchHealth, isApiSlow, request, streamTrace, subscribeApiSlow } from "@/lib/api";
import { noRiskReason } from "@/lib/format";

const noWait = async () => undefined;

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

  it("throws on a non-OK response once the retries run out", async () => {
    const failing = (async () => new Response(null, { status: 503 })) as typeof fetch;
    await expect(fetchHealth(failing, noWait)).rejects.toThrow("HTTP 503");
  });

  it("does not retry a client error", async () => {
    let calls = 0;
    const notFound = (async () => {
      calls++;
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    await expect(fetchHealth(notFound, noWait)).rejects.toThrow("HTTP 404");
    expect(calls).toBe(1);
  });

  it("recovers when the API comes back during the retries", async () => {
    let calls = 0;
    const restarting = (async () => {
      calls++;
      if (calls === 1) throw new TypeError("Failed to fetch");
      if (calls === 2) return new Response(null, { status: 503 });
      return new Response(JSON.stringify({ status: "test-input" }), { status: 200 });
    }) as typeof fetch;
    await expect(fetchHealth(restarting, noWait)).resolves.toEqual({ status: "test-input" });
    expect(calls).toBe(3);
  });

  it("explains a lasting outage in plain words, without blaming CORS", async () => {
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const error = await fetchHealth(down, noWait).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("NETWORK_ERROR");
    expect((error as ApiError).message).toContain("not answering");
    expect((error as ApiError).message).not.toContain("CORS");
  });

  it("does not repeat a write that the server answered", async () => {
    let calls = 0;
    const refused = (async () => {
      calls++;
      return new Response(null, { status: 503 });
    }) as typeof fetch;
    await expect(request("/api/fields", { method: "POST" }, refused, noWait)).rejects.toThrow("HTTP 503");
    expect(calls).toBe(1);
  });

  it("resends a write once after the API answers again", async () => {
    const urls: string[] = [];
    const flaky = (async (url: string) => {
      urls.push(url);
      if (urls.length === 1) throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify({ ok: "test-input" }), { status: 200 });
    }) as unknown as typeof fetch;
    await expect(request("/api/fields", { method: "POST" }, flaky, noWait)).resolves.toEqual({ ok: "test-input" });
    expect(urls).toEqual(["http://api.test/api/fields", "http://api.test/health", "http://api.test/api/fields"]);
  });
});

describe("waiting for a sleeping server", () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = original;
    vi.useRealTimers();
  });

  it("keeps trying for about 90 s before giving up", async () => {
    const waits: number[] = [];
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const record = async (ms: number) => {
      waits.push(ms);
    };
    await expect(fetchHealth(down, record)).rejects.toBeInstanceOf(ApiError);
    expect(waits.reduce((a, b) => a + b, 0)).toBe(90_000);
  });

  it("stops early when every attempt hangs, instead of adding up their timeouts", async () => {
    let calls = 0;
    const hangs = (async () => {
      calls++;
      vi.setSystemTime(Date.now() + 121_000);
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    await expect(fetchHealth(hangs, noWait)).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(2);
  });

  it("shows the notice only while a request is slow, and clears it either way", async () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeApiSlow(() => seen.push(isApiSlow()));
    let answer: (r: Response) => void = () => undefined;
    const slow = (() => new Promise<Response>((resolve) => (answer = resolve))) as typeof fetch;
    const pending = fetchHealth(slow, noWait);

    vi.advanceTimersByTime(5_999);
    expect(isApiSlow()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(isApiSlow()).toBe(true);

    answer(new Response(JSON.stringify({ status: "test-input" }), { status: 200 }));
    await pending;
    expect(isApiSlow()).toBe(false);
    expect(seen).toEqual([true, false]);
    unsubscribe();
  });

  it("never shows the notice for a quick answer", async () => {
    const quick = (async () => new Response(JSON.stringify({}), { status: 200 })) as typeof fetch;
    await fetchHealth(quick, noWait);
    vi.advanceTimersByTime(60_000);
    expect(isApiSlow()).toBe(false);
  });
});

describe("why an assessment has no risks", () => {
  it("names a finished crop instead of blaming the data sources", () => {
    const text = noRiskReason({ crop_status: "past_maturity", days_after_sowing: 123 });
    expect(text).toContain("past maturity (day 123");
    expect(text).not.toContain("unavailable");
  });

  it("names a crop that is not sown yet, counting the days forward", () => {
    const text = noRiskReason({ crop_status: "pre_sowing", days_after_sowing: -30 });
    expect(text).toContain("sowing is 30 days away");
  });

  it("still reports an outage during the season", () => {
    expect(noRiskReason({ crop_status: "in_season", days_after_sowing: 40 })).toContain("sources were unavailable");
  });
});

describe("trace stream", () => {
  class FakeEventSource {
    static readonly CLOSED = 2;
    static instances: FakeEventSource[] = [];
    readyState = 1;
    onerror: (() => void) | null = null;
    listeners = new Map<string, (m: { data: string }) => void>();
    closed = false;
    constructor(public url: string) {
      FakeEventSource.instances.push(this);
    }
    addEventListener(name: string, fn: (m: { data: string }) => void) {
      this.listeners.set(name, fn);
    }
    close() {
      this.closed = true;
    }
    send(name: string, seq: number) {
      this.listeners.get(name)?.({ data: JSON.stringify({ seq, event: name }) });
    }
  }
  const original = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    FakeEventSource.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = original;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens a new stream after an HTTP failure and drops replayed events", () => {
    const seen: number[] = [];
    let done = 0;
    streamTrace("a", (e) => seen.push(e.seq), () => done++);
    const first = FakeEventSource.instances[0];
    first.send("node_started", 1);
    first.readyState = FakeEventSource.CLOSED;
    first.onerror?.();
    vi.advanceTimersByTime(3_000);
    const second = FakeEventSource.instances[1];
    second.send("node_started", 1); // replayed from the start
    second.send("done", 2);
    expect(seen).toEqual([1, 2]);
    expect(done).toBe(1);
    expect(second.closed).toBe(true);
  });

  it("leaves a browser-managed reconnect alone", () => {
    streamTrace("a", () => undefined, () => undefined);
    FakeEventSource.instances[0].onerror?.(); // readyState still open: the browser is reconnecting
    vi.advanceTimersByTime(10_000);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("hands over to the caller when the stream goes silent, and only once", () => {
    let done = 0;
    streamTrace("a", () => undefined, () => done++);
    vi.advanceTimersByTime(200_000);
    expect(done).toBe(1);
    expect(FakeEventSource.instances[0].closed).toBe(true);
    vi.advanceTimersByTime(200_000);
    expect(done).toBe(1);
  });

  it("does nothing further once the caller has stopped it", () => {
    let done = 0;
    const stop = streamTrace("a", () => undefined, () => done++);
    const first = FakeEventSource.instances[0];
    first.readyState = FakeEventSource.CLOSED;
    first.onerror?.();
    stop();
    vi.advanceTimersByTime(300_000);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(done).toBe(0);
  });
});

describe("trace parsing", () => {
  it("parses a contract SSE envelope", async () => {
    const { parseTraceEvent } = await import("@/lib/api");
    const raw = JSON.stringify({
      seq: 3,
      ts: "2026-11-01T00:00:00Z",
      event: "fallback_used",
      assessment_id: "a",
      node: "fallback",
      data: { tool: "gefs_ensemble", status: "retried", latency_ms: null, detail: { from_source: "x", to_source: "y" } },
    });
    expect(parseTraceEvent(raw).event).toBe("fallback_used");
  });

  it("rejects a malformed payload", async () => {
    const { parseTraceEvent } = await import("@/lib/api");
    expect(() => parseTraceEvent(JSON.stringify({ hello: "world" }))).toThrow(ApiError);
  });
});

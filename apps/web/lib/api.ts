import type {
  AdminSource,
  ApiErrorBody,
  Assessment,
  AssessmentStatus,
  District,
  EventName,
  Field,
  GeoJSONPolygon,
  Health,
  Language,
  Place,
  TraceEvent,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "ERROR",
  ) {
    super(message);
  }
}

export function apiBaseUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const override = localStorage.getItem("KHETKAVACH_API_URL");
      if (override) return override.replace(/\/$/, "");
    } catch {
      // ignore storage access errors
    }
  }
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? "https://khetkavach-api-x90n.onrender.com" : "");
  if (!url) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not set");
  }
  return url.replace(/\/$/, "");
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null && "error" in body;
}

const ATTEMPT_TIMEOUT_MS = 20_000;
/** Waits between attempts, about 30 s in all: long enough for the API to restart after a redeploy. */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];
const RETRYABLE_STATUS = new Set([502, 503, 504]);

type Sleep = (ms: number) => Promise<void>;
const sleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The browser reports a refused connection, a timeout and a response without CORS headers alike. */
function unreachable(): ApiError {
  return new ApiError(
    "The KhetKavach API is not answering right now. It may be restarting, so please try again in a minute.",
    0,
    "NETWORK_ERROR",
  );
}

function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError"));
}

/** GET with retries: safe to repeat, and it hides a restart of the API from the reader. */
async function getWithRetry(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  wait: Sleep,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let failure: unknown;
    try {
      const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= RETRY_DELAYS_MS.length) return response;
    } catch (err) {
      if (!isNetworkFailure(err)) throw err;
      failure = err;
    }
    if (attempt >= RETRY_DELAYS_MS.length) throw failure instanceof Error ? unreachable() : failure;
    await wait(RETRY_DELAYS_MS[attempt]);
  }
}

async function send(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  wait: Sleep,
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (method === "GET") return getWithRetry(url, init, fetchImpl, wait);
  try {
    return await fetchImpl(url, init);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
  }
  // The write probably never arrived. Wait until the API answers, then send it once more.
  await fetchHealth(fetchImpl, wait);
  try {
    return await fetchImpl(url, init);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    throw unreachable();
  }
}

export async function request<T>(
  path: string,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
  wait: Sleep = sleep,
): Promise<T> {
  const response = await send(
    `${apiBaseUrl()}${path}`,
    {
      cache: "no-store",
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    },
    fetchImpl,
    wait,
  );
  if (!response.ok) {
    let message = `API ${path} returned HTTP ${response.status}`;
    let code = "ERROR";
    try {
      const body: unknown = await response.json();
      if (isErrorBody(body)) {
        message = body.error.message;
        code = body.error.code;
      }
    } catch {
      // keep the HTTP status message
    }
    throw new ApiError(message, response.status, code);
  }
  return (await response.json()) as T;
}

export async function fetchHealth(fetchImpl: typeof fetch = fetch, wait: Sleep = sleep): Promise<Health> {
  const response = await getWithRetry(`${apiBaseUrl()}/health`, { cache: "no-store" }, fetchImpl, wait);
  if (!response.ok) {
    throw new ApiError(`API /health returned HTTP ${response.status}`, response.status);
  }
  return (await response.json()) as Health;
}

export const api = {
  districts: () => request<District[]>("/api/districts"),
  geocode: (q: string) => request<Place[]>(`/api/geocode?q=${encodeURIComponent(q)}`),
  listFields: () => request<Field[]>("/api/fields"),
  createField: (body: {
    name: string | null;
    geometry: GeoJSONPolygon;
    crop: string;
    sowing_date: string;
    district_code: string;
  }) => request<Field>("/api/fields", { method: "POST", body: JSON.stringify(body) }),
  startAssessment: (field_id: string, language: Language, as_of?: string) =>
    request<{ assessment_id: string; status: AssessmentStatus; stream_url: string; result_url: string }>("/api/assessments", {
      method: "POST",
      body: JSON.stringify({ field_id, language, as_of: as_of || null }),
    }),
  getAssessment: (id: string) => request<Assessment>(`/api/assessments/${id}`),
  modelCard: () => request<Record<string, unknown>>("/api/model"),
  adminSources: (key: string) =>
    request<AdminSource[]>("/api/admin/sources", { headers: { "x-admin-key": key } }),
  toggleSource: (key: string, source: string, disable: boolean) =>
    request<AdminSource>(`/api/admin/sources/${source}/${disable ? "disable" : "enable"}`, {
      method: "POST",
      headers: { "x-admin-key": key },
    }),
};

const EVENTS: EventName[] = [
  "node_started",
  "tool_result",
  "gate_failed",
  "fallback_used",
  "verifier_rejected",
  "done",
  "error",
];

/** Parse one SSE data payload into the contract envelope. Exported for tests. */
export function parseTraceEvent(data: string): TraceEvent {
  const parsed: unknown = JSON.parse(data);
  if (typeof parsed !== "object" || parsed === null || !("event" in parsed) || !("seq" in parsed)) {
    throw new ApiError("malformed trace event");
  }
  return parsed as TraceEvent;
}

const STREAM_RECONNECT_MS = 3_000;
/** Longer than any silence in a healthy run. Past this, onDone lets the caller read the real status. */
const STREAM_STALL_MS = 200_000;

/**
 * Subscribe to the agent trace; onDone runs exactly once. EventSource reconnects by itself after a
 * dropped connection but gives up for good on an HTTP error, as during an API restart, so that case
 * opens a new stream. A new stream replays from the start, and events already seen are dropped.
 */
export function streamTrace(
  assessmentId: string,
  onEvent: (e: TraceEvent) => void,
  onDone: () => void,
): () => void {
  const url = `${apiBaseUrl()}/api/assessments/${assessmentId}/stream`;
  let source: EventSource | null = null;
  let lastSeq = 0;
  let stopped = false;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let stall: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    stopped = true;
    clearTimeout(reconnect);
    clearTimeout(stall);
    source?.close();
  };
  const finish = () => {
    stop();
    onDone();
  };
  const watchForStall = () => {
    clearTimeout(stall);
    stall = setTimeout(finish, STREAM_STALL_MS);
  };
  const handler = (message: MessageEvent<string>) => {
    const event = parseTraceEvent(message.data);
    if (event.seq <= lastSeq) return;
    lastSeq = event.seq;
    onEvent(event);
    watchForStall();
    if (event.event === "done") finish();
  };
  const open = () => {
    if (stopped) return;
    const current = new EventSource(url);
    source = current;
    EVENTS.forEach((name) => current.addEventListener(name, handler as EventListener));
    current.onerror = () => {
      if (current.readyState === EventSource.CLOSED) {
        clearTimeout(reconnect);
        reconnect = setTimeout(open, STREAM_RECONNECT_MS);
      }
    };
  };

  watchForStall();
  open();
  return stop;
}

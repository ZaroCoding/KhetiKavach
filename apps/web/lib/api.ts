import type {
  AdminSource,
  ApiErrorBody,
  Assessment,
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
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not set");
  }
  return url.replace(/\/$/, "");
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null && "error" in body;
}

async function request<T>(path: string, init?: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await fetchImpl(`${apiBaseUrl()}${path}`, {
    cache: "no-store",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
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

export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<Health> {
  const response = await fetchImpl(`${apiBaseUrl()}/health`, { cache: "no-store" });
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
    request<{ assessment_id: string; stream_url: string; result_url: string }>("/api/assessments", {
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

/** Subscribe to the agent trace. EventSource reconnects with Last-Event-ID, so nothing is lost. */
export function streamTrace(
  assessmentId: string,
  onEvent: (e: TraceEvent) => void,
  onDone: () => void,
): () => void {
  const source = new EventSource(`${apiBaseUrl()}/api/assessments/${assessmentId}/stream`);
  const handler = (message: MessageEvent<string>) => {
    const event = parseTraceEvent(message.data);
    onEvent(event);
    if (event.event === "done") {
      source.close();
      onDone();
    }
  };
  EVENTS.forEach((name) => source.addEventListener(name, handler as EventListener));
  return () => source.close();
}

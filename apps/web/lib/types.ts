// Mirrors docs/CONTRACTS.md and apps/api/app/schemas.py. Change all three together.

type SourceName =
  | "planetary_computer_s2"
  | "planetary_computer_s1"
  | "sentinel_hub"
  | "open_meteo_ensemble"
  | "open_meteo_forecast"
  | "open_meteo_archive"
  | "open_meteo_single_runs"
  | "imd_gridded"
  | "imd_api"
  | "nasa_power"
  | "bhuvan"
  | "gemini"
  | "groq"
  | "crida_plans"
  | "esp32_sensor"
  | "nominatim";

type Status = "live" | "cached" | "archived" | "unavailable";
export type Crop = "wheat" | "rice" | "cotton" | "soybean";
export type Language = "en" | "hi" | "pa";
type Hazard = "dry_spell" | "heavy_rain" | "harvest_rain";
export type Severity = "low" | "moderate" | "high" | "severe" | "unknown";
type Method = "ensemble" | "multi_model" | "deterministic_replay" | "model" | "climatology";
export type AssessmentStatus = "queued" | "running" | "completed" | "completed_degraded" | "failed";

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

interface SeriesPoint {
  ts: string;
  value: number;
}

export interface Evidence {
  id: string;
  variable: string;
  value: number | null;
  series: SeriesPoint[] | null;
  unit: string | null;
  source: SourceName;
  source_url: string | null;
  fetched_at: string;
  status: Status;
}

interface MemberCount {
  total: number;
  exceeding: number;
}

export interface Risk {
  hazard: Hazard;
  probability: number | null;
  probability_ci90: [number, number] | null;
  climatology_probability: number | null;
  severity: Severity;
  threshold: { description: string; value: number; unit: string };
  horizon_days: number;
  crop_stage: string;
  stage_weight: number;
  method: Method;
  members: { ecmwf: MemberCount | null; gfs: MemberCount | null } | null;
  driver_ids: string[];
  explanation: string[];
  window: { start: string; end: string } | null;
  uncertainty_note: string | null;
}

interface PlanAction {
  id: string;
  when: string;
  text: string;
  language: Language;
  citation: { chunk_id: string; doc_title: string; page: number; plan_year: number };
  numbers_used: number[];
}

interface Source {
  name: SourceName;
  url: string | null;
  status: Status;
  fetched_at: string;
  attribution: string;
}

interface DataFreshness {
  oldest_fetched_at: string | null;
  newest_fetched_at: string | null;
  per_source: Partial<Record<SourceName, { fetched_at: string; status: Status }>>;
}

export interface District {
  code: string;
  name: string;
  state: string;
  bbox: [number, number, number, number] | null;
  bbox_source: SourceName;
  plan_title: string;
  plan_year: number;
  plan_chunks: number;
}

export interface Field {
  id: string;
  short_code: string;
  name: string | null;
  geometry: GeoJSONPolygon;
  crop: Crop;
  sowing_date: string;
  district_code: string;
  created_at: string;
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
  district: string | null;
}

export interface Assessment {
  id: string;
  field_id: string;
  status: AssessmentStatus;
  mode: "live" | "replay";
  as_of: string | null;
  language: Language;
  model_version: string | null;
  created_at: string;
  completed_at: string | null;
  risks: Risk[];
  evidence: Evidence[];
  plan: PlanAction[];
  plan_summary: string | null;
  plan_generator: "llm" | "rule_based" | "none" | null;
  replay_basis: "archived_forecast" | "observed_rain_model" | null;
  sources: Source[];
  data_freshness: DataFreshness;
}

export type EventName =
  | "node_started"
  | "tool_result"
  | "gate_failed"
  | "fallback_used"
  | "verifier_rejected"
  | "done"
  | "error";

export interface StepData {
  tool: string | null;
  status: "started" | "succeeded" | "failed" | "retried" | "skipped";
  latency_ms: number | null;
  detail: Record<string, unknown>;
}

export interface TraceEvent {
  seq: number;
  ts: string;
  event: EventName;
  assessment_id: string;
  node: string | null;
  data: StepData | Record<string, unknown>;
}

export interface AdminSource {
  source: SourceName;
  disabled: boolean;
  updated_at: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details: unknown };
}

export interface SourceHealth {
  status: "ok" | "degraded" | "down" | "unknown";
  last_latency_ms: number | null;
  last_ok_at: string | null;
  disabled: boolean;
}

/** GET /health (no /api prefix). */
export interface Health {
  status: "ok" | "degraded";
  version: string;
  model_version: string | null;
  db: { status: "ok" | "down"; latency_ms: number | null };
  sources: Partial<Record<SourceName, SourceHealth>>;
  latency: { p50_ms: number | null; p95_ms: number | null };
}

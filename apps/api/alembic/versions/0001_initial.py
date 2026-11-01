"""Initial schema: every table in docs/CONTRACTS.md, including the build-ruling additions.

Revision ID: 0001
Revises:
"""

from alembic import op
from app.rag.scenarios import SCENARIOS
from app.schemas import SOURCE_NAMES

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

SOURCE_CHECK = "source IN (" + ", ".join(f"'{s}'" for s in SOURCE_NAMES) + ")"
SCENARIO_CHECK = "scenario IN (" + ", ".join(f"'{s}'" for s in SCENARIOS) + ")"
EVENTS = (
    "node_started",
    "tool_result",
    "gate_failed",
    "fallback_used",
    "verifier_rejected",
    "done",
    "error",
)
EVENT_CHECK = "event IN (" + ", ".join(f"'{e}'" for e in EVENTS) + ")"

STATEMENTS = [
    "CREATE EXTENSION IF NOT EXISTS postgis",
    "CREATE EXTENSION IF NOT EXISTS vector",
    """CREATE TABLE fields (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        short_code text NOT NULL UNIQUE CHECK (short_code ~ '^[A-Z0-9]{6}$'),
        name text NULL,
        geom geometry(Polygon, 4326) NOT NULL,
        crop text NOT NULL CHECK (crop IN ('wheat', 'rice', 'cotton', 'soybean')),
        sowing_date date NOT NULL,
        district_code text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now())""",
    "CREATE INDEX fields_geom_gix ON fields USING gist (geom)",
    "CREATE INDEX fields_created ON fields (created_at DESC)",
    f"""CREATE TABLE observations (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
        source text NOT NULL CHECK ({SOURCE_CHECK}),
        variable text NOT NULL,
        ts timestamptz NOT NULL,
        value double precision NOT NULL,
        unit text NULL,
        fetched_at timestamptz NOT NULL)""",
    "CREATE INDEX observations_lookup ON observations (field_id, variable, ts)",
    f"""CREATE TABLE api_cache (
        key text PRIMARY KEY,
        source text NOT NULL CHECK ({SOURCE_CHECK} OR source = 'telegram'),
        response jsonb NOT NULL,
        fetched_at timestamptz NOT NULL,
        expires_at timestamptz NOT NULL)""",
    """CREATE TABLE imd_rain_daily (
        lat real NOT NULL, lon real NOT NULL, date date NOT NULL, mm real NOT NULL,
        PRIMARY KEY (lat, lon, date))""",
    "CREATE TABLE imd_cells (lat real NOT NULL, lon real NOT NULL, PRIMARY KEY (lat, lon))",
    """CREATE TABLE assessments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
        as_of date NULL CHECK (as_of IS NULL OR as_of >= DATE '2021-01-01'),
        language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'pa')),
        status text NOT NULL DEFAULT 'queued' CHECK (status IN
            ('queued', 'running', 'completed', 'completed_degraded', 'failed')),
        model_version text NULL,
        risks jsonb NOT NULL DEFAULT '[]',
        evidence jsonb NOT NULL DEFAULT '[]',
        plan jsonb NOT NULL DEFAULT '[]',
        plan_summary text NULL,
        plan_generator text NULL CHECK (plan_generator IN ('llm', 'rule_based', 'none')),
        replay_basis text NULL CHECK (replay_basis IN ('archived_forecast', 'observed_rain_model')),
        sources jsonb NOT NULL DEFAULT '[]',
        data_freshness jsonb NULL,
        error text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL)""",
    "CREATE INDEX assessments_field ON assessments (field_id, created_at DESC)",
    f"""CREATE TABLE agent_steps (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        seq integer NOT NULL,
        ts timestamptz NOT NULL DEFAULT now(),
        event text NOT NULL CHECK ({EVENT_CHECK}),
        node text NULL,
        tool text NULL,
        status text NOT NULL CHECK (status IN
            ('started', 'succeeded', 'failed', 'retried', 'skipped')),
        latency_ms integer NULL,
        detail jsonb NOT NULL DEFAULT '{{}}',
        UNIQUE (assessment_id, seq))""",
    f"""CREATE TABLE doc_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        district_code text NOT NULL,
        scenario text NOT NULL CHECK ({SCENARIO_CHECK}),
        crop text NULL,
        page integer NOT NULL,
        text text NOT NULL,
        embedding vector(384) NOT NULL,
        doc_title text NOT NULL,
        plan_year integer NOT NULL,
        source_url text NULL,
        chunk_index integer NOT NULL)""",
    "CREATE INDEX doc_chunks_filter ON doc_chunks (district_code, scenario, crop)",
    "CREATE INDEX doc_chunks_hnsw ON doc_chunks USING hnsw (embedding vector_cosine_ops)",
    "CREATE INDEX doc_chunks_fts ON doc_chunks USING gin (to_tsvector('simple', text))",
    """CREATE TABLE sensor_devices (
        device_id text PRIMARY KEY,
        field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
        key_hash text NOT NULL)""",
    """CREATE TABLE sensor_readings (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        device_id text NOT NULL REFERENCES sensor_devices(device_id) ON DELETE CASCADE,
        field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
        ts timestamptz NOT NULL,
        soil_moisture_pct double precision NOT NULL,
        temp_c double precision NOT NULL,
        rh_pct double precision NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now())""",
    "CREATE INDEX sensor_readings_field ON sensor_readings (field_id, ts DESC)",
    """CREATE TABLE alert_subscriptions (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
        telegram_chat_id bigint NOT NULL,
        language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'pa')),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (field_id, telegram_chat_id))""",
    """CREATE TABLE alerts_sent (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        subscription_id bigint NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
        assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        hazard text NOT NULL CHECK (hazard IN ('dry_spell', 'heavy_rain', 'harvest_rain')),
        severity text NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'severe', 'unknown')),
        message_hash text NOT NULL,
        status text NOT NULL CHECK (status IN ('sent', 'failed')),
        sent_at timestamptz NOT NULL DEFAULT now())""",
    "CREATE INDEX alerts_sent_dedupe ON alerts_sent"
    " (subscription_id, hazard, severity, sent_at DESC)",
    f"""CREATE TABLE source_switches (
        source text PRIMARY KEY CHECK ({SOURCE_CHECK}),
        disabled boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now())""",
    f"""CREATE TABLE source_health (
        source text PRIMARY KEY CHECK ({SOURCE_CHECK} OR source = 'telegram'),
        last_ok_at timestamptz NULL,
        last_error_at timestamptz NULL,
        last_error text NULL,
        last_latency_ms integer NULL)""",
]

TABLES = [
    "source_health",
    "source_switches",
    "alerts_sent",
    "alert_subscriptions",
    "sensor_readings",
    "sensor_devices",
    "doc_chunks",
    "agent_steps",
    "assessments",
    "imd_cells",
    "imd_rain_daily",
    "api_cache",
    "observations",
    "fields",
]


def upgrade() -> None:
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")

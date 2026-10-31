"""initial schema: every table in docs/CONTRACTS.md

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-01

Enables the postgis and vector extensions, then creates all 12 tables with their CHECK
constraints, the GiST index on fields.geom and the HNSW index on doc_chunks.embedding.
Enum values are repeated here on purpose: a migration must not change when app code changes.
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SOURCES = (
    "planetary_computer_s2",
    "planetary_computer_s1",
    "sentinel_hub",
    "open_meteo_ensemble",
    "open_meteo_forecast",
    "open_meteo_archive",
    "open_meteo_historical_forecast",
    "imd_gridded",
    "imd_api",
    "nasa_power",
    "bhuvan",
    "gemini",
    "crida_plans",
    "esp32_sensor",
    "nominatim",
)


def _in(column: str, values: Sequence[str]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "fields",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("short_code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("crop", sa.Text(), nullable=False),
        sa.Column("sowing_date", sa.Date(), nullable=False),
        sa.Column("district_code", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("short_code ~ '^[A-Z0-9]{6}$'", name="ck_fields_short_code_format"),
        sa.CheckConstraint(
            _in("crop", ("wheat", "rice", "cotton", "soybean")), name="ck_fields_crop"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_fields"),
        sa.UniqueConstraint("short_code", name="uq_fields_short_code"),
    )
    op.create_index("ix_fields_geom", "fields", ["geom"], unique=False, postgresql_using="gist")
    op.create_index("ix_fields_created_at", "fields", [sa.text("created_at DESC")], unique=False)

    op.create_table(
        "observations",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("variable", sa.Text(), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", postgresql.DOUBLE_PRECISION(), nullable=False),
        sa.Column("unit", sa.Text(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(_in("source", SOURCES), name="ck_observations_source"),
        sa.ForeignKeyConstraint(
            ["field_id"], ["fields.id"], name="fk_observations_field_id_fields", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_observations"),
    )
    op.create_index(
        "ix_observations_field_id_variable_ts", "observations", ["field_id", "variable", "ts"]
    )

    op.create_table(
        "api_cache",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(_in("source", SOURCES), name="ck_api_cache_source"),
        sa.PrimaryKeyConstraint("key", name="pk_api_cache"),
    )

    op.create_table(
        "imd_rain_daily",
        sa.Column("lat", postgresql.REAL(), nullable=False),
        sa.Column("lon", postgresql.REAL(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("mm", postgresql.REAL(), nullable=False),
        sa.PrimaryKeyConstraint("lat", "lon", "date", name="pk_imd_rain_daily"),
    )

    op.create_table(
        "assessments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("as_of", sa.Date(), nullable=True),
        sa.Column("language", sa.Text(), server_default=sa.text("'en'"), nullable=False),
        sa.Column("status", sa.Text(), server_default=sa.text("'queued'"), nullable=False),
        sa.Column("model_version", sa.Text(), nullable=True),
        sa.Column(
            "risks",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "evidence",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "plan",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "sources",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("data_freshness", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "as_of IS NULL OR as_of >= DATE '2021-01-01'", name="ck_assessments_as_of"
        ),
        sa.CheckConstraint(_in("language", ("en", "hi", "pa")), name="ck_assessments_language"),
        sa.CheckConstraint(
            _in(
                "status",
                ("queued", "running", "completed", "completed_degraded", "failed"),
            ),
            name="ck_assessments_status",
        ),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], name="fk_assessments_field_id_fields"),
        sa.PrimaryKeyConstraint("id", name="pk_assessments"),
    )

    op.create_table(
        "agent_steps",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("assessment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("node", sa.Text(), nullable=False),
        sa.Column("tool", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column(
            "detail",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.CheckConstraint(
            _in("status", ("started", "succeeded", "failed", "retried", "skipped")),
            name="ck_agent_steps_status",
        ),
        sa.ForeignKeyConstraint(
            ["assessment_id"],
            ["assessments.id"],
            name="fk_agent_steps_assessment_id_assessments",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_agent_steps"),
        sa.UniqueConstraint("assessment_id", "seq", name="uq_agent_steps_assessment_seq"),
    )

    op.create_table(
        "doc_chunks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("district_code", sa.Text(), nullable=False),
        sa.Column("scenario", sa.Text(), nullable=False),
        sa.Column("crop", sa.Text(), nullable=False),
        sa.Column("page", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column("doc_title", sa.Text(), nullable=False),
        sa.Column("plan_year", sa.Integer(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_doc_chunks"),
    )
    op.create_index(
        "ix_doc_chunks_district_code_scenario_crop",
        "doc_chunks",
        ["district_code", "scenario", "crop"],
    )
    op.create_index(
        "ix_doc_chunks_embedding_hnsw",
        "doc_chunks",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "sensor_devices",
        sa.Column("device_id", sa.Text(), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key_hash", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["field_id"], ["fields.id"], name="fk_sensor_devices_field_id_fields"
        ),
        sa.PrimaryKeyConstraint("device_id", name="pk_sensor_devices"),
    )

    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("device_id", sa.Text(), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("soil_moisture_pct", postgresql.DOUBLE_PRECISION(), nullable=False),
        sa.Column("temp_c", postgresql.DOUBLE_PRECISION(), nullable=False),
        sa.Column("rh_pct", postgresql.DOUBLE_PRECISION(), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["device_id"],
            ["sensor_devices.device_id"],
            name="fk_sensor_readings_device_id_sensor_devices",
        ),
        sa.ForeignKeyConstraint(
            ["field_id"], ["fields.id"], name="fk_sensor_readings_field_id_fields"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sensor_readings"),
    )

    op.create_table(
        "alert_subscriptions",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("telegram_chat_id", sa.BigInteger(), nullable=False),
        sa.Column("language", sa.Text(), server_default=sa.text("'en'"), nullable=False),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            _in("language", ("en", "hi", "pa")), name="ck_alert_subscriptions_language"
        ),
        sa.ForeignKeyConstraint(
            ["field_id"], ["fields.id"], name="fk_alert_subscriptions_field_id_fields"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_alert_subscriptions"),
        sa.UniqueConstraint(
            "field_id", "telegram_chat_id", name="uq_alert_subscriptions_field_chat"
        ),
    )

    op.create_table(
        "alerts_sent",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("subscription_id", sa.BigInteger(), nullable=False),
        sa.Column("assessment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("hazard", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("message_hash", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            _in("hazard", ("dry_spell", "heavy_rain")), name="ck_alerts_sent_hazard"
        ),
        sa.CheckConstraint(
            _in("severity", ("low", "moderate", "high", "severe")),
            name="ck_alerts_sent_severity",
        ),
        sa.CheckConstraint(_in("status", ("sent", "failed")), name="ck_alerts_sent_status"),
        sa.ForeignKeyConstraint(
            ["subscription_id"],
            ["alert_subscriptions.id"],
            name="fk_alerts_sent_subscription_id_alert_subscriptions",
        ),
        sa.ForeignKeyConstraint(
            ["assessment_id"], ["assessments.id"], name="fk_alerts_sent_assessment_id_assessments"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_alerts_sent"),
    )
    op.create_index(
        "ix_alerts_sent_subscription_id_hazard_severity_sent_at",
        "alerts_sent",
        ["subscription_id", "hazard", "severity", sa.text("sent_at DESC")],
    )

    op.create_table(
        "source_switches",
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("disabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(_in("source", SOURCES), name="ck_source_switches_source"),
        sa.PrimaryKeyConstraint("source", name="pk_source_switches"),
    )


def downgrade() -> None:
    op.drop_table("source_switches")
    op.drop_index(
        "ix_alerts_sent_subscription_id_hazard_severity_sent_at", table_name="alerts_sent"
    )
    op.drop_table("alerts_sent")
    op.drop_table("alert_subscriptions")
    op.drop_table("sensor_readings")
    op.drop_table("sensor_devices")
    op.drop_index("ix_doc_chunks_embedding_hnsw", table_name="doc_chunks")
    op.drop_index("ix_doc_chunks_district_code_scenario_crop", table_name="doc_chunks")
    op.drop_table("doc_chunks")
    op.drop_table("agent_steps")
    op.drop_table("assessments")
    op.drop_table("imd_rain_daily")
    op.drop_table("api_cache")
    op.drop_index("ix_observations_field_id_variable_ts", table_name="observations")
    op.drop_table("observations")
    op.drop_index("ix_fields_created_at", table_name="fields")
    op.drop_index("ix_fields_geom", table_name="fields")
    op.drop_table("fields")
    op.execute("DROP EXTENSION IF EXISTS vector")
    op.execute("DROP EXTENSION IF EXISTS postgis")

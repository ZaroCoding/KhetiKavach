"""ORM mappings for every table in docs/CONTRACTS.md (Database tables section).

The Alembic migrations are the source of truth for DDL; these mappings must stay in step with
them (`uv run alembic check` reports drift).
"""

import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    REAL,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Double,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    ALERT_STATUSES,
    ASSESSMENT_STATUSES,
    CROPS,
    HAZARDS,
    LANGUAGES,
    SEVERITIES,
    SOURCE_NAMES,
    STEP_STATUSES,
    Base,
    in_list,
)

SOURCE_CHECK = in_list("source", SOURCE_NAMES)


class Field(Base):
    __tablename__ = "fields"
    __table_args__ = (
        CheckConstraint("short_code ~ '^[A-Z0-9]{6}$'", name="short_code_format"),
        CheckConstraint(in_list("crop", CROPS), name="crop"),
        Index("ix_fields_geom", "geom", postgresql_using="gist"),
        Index("ix_fields_created_at", text("created_at DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    short_code: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str | None] = mapped_column(Text)
    geom: Mapped[object] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False)
    )
    crop: Mapped[str] = mapped_column(Text)
    sowing_date: Mapped[date] = mapped_column(Date)
    district_code: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        CheckConstraint(SOURCE_CHECK, name="source"),
        Index("ix_observations_field_id_variable_ts", "field_id", "variable", "ts"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    field_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"))
    source: Mapped[str] = mapped_column(Text)
    variable: Mapped[str] = mapped_column(Text)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    value: Mapped[float] = mapped_column(Double)
    unit: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ApiCache(Base):
    __tablename__ = "api_cache"
    __table_args__ = (CheckConstraint(SOURCE_CHECK, name="source"),)

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    source: Mapped[str] = mapped_column(Text)
    response: Mapped[dict[str, object]] = mapped_column(JSONB)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ImdRainDaily(Base):
    __tablename__ = "imd_rain_daily"

    lat: Mapped[float] = mapped_column(REAL, primary_key=True)
    lon: Mapped[float] = mapped_column(REAL, primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    mm: Mapped[float] = mapped_column(REAL)


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        CheckConstraint("as_of IS NULL OR as_of >= DATE '2021-01-01'", name="as_of"),
        CheckConstraint(in_list("language", LANGUAGES), name="language"),
        CheckConstraint(in_list("status", ASSESSMENT_STATUSES), name="status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    field_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("fields.id"))
    as_of: Mapped[date | None] = mapped_column(Date)
    language: Mapped[str] = mapped_column(Text, server_default=text("'en'"))
    status: Mapped[str] = mapped_column(Text, server_default=text("'queued'"))
    model_version: Mapped[str | None] = mapped_column(Text)
    risks: Mapped[list[object]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    evidence: Mapped[list[object]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    plan: Mapped[list[object]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    sources: Mapped[list[object]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    data_freshness: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgentStep(Base):
    __tablename__ = "agent_steps"
    __table_args__ = (
        UniqueConstraint("assessment_id", "seq", name="uq_agent_steps_assessment_seq"),
        CheckConstraint(in_list("status", STEP_STATUSES), name="status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE")
    )
    seq: Mapped[int] = mapped_column(Integer)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    node: Mapped[str] = mapped_column(Text)
    tool: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    detail: Mapped[dict[str, object]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))


class DocChunk(Base):
    __tablename__ = "doc_chunks"
    __table_args__ = (
        Index("ix_doc_chunks_district_code_scenario_crop", "district_code", "scenario", "crop"),
        Index(
            "ix_doc_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    district_code: Mapped[str] = mapped_column(Text)
    scenario: Mapped[str] = mapped_column(Text)
    crop: Mapped[str] = mapped_column(Text)
    page: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(384))
    doc_title: Mapped[str] = mapped_column(Text)
    plan_year: Mapped[int] = mapped_column(Integer)
    source_url: Mapped[str] = mapped_column(Text)
    chunk_index: Mapped[int] = mapped_column(Integer)


class SensorDevice(Base):
    __tablename__ = "sensor_devices"

    device_id: Mapped[str] = mapped_column(Text, primary_key=True)
    field_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("fields.id"))
    key_hash: Mapped[str] = mapped_column(Text)


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("sensor_devices.device_id"))
    field_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("fields.id"))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    soil_moisture_pct: Mapped[float] = mapped_column(Double)
    temp_c: Mapped[float] = mapped_column(Double)
    rh_pct: Mapped[float] = mapped_column(Double)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"
    __table_args__ = (
        UniqueConstraint("field_id", "telegram_chat_id", name="uq_alert_subscriptions_field_chat"),
        CheckConstraint(in_list("language", LANGUAGES), name="language"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    field_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("fields.id"))
    telegram_chat_id: Mapped[int] = mapped_column(BigInteger)
    language: Mapped[str] = mapped_column(Text, server_default=text("'en'"))
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AlertSent(Base):
    __tablename__ = "alerts_sent"
    __table_args__ = (
        CheckConstraint(in_list("hazard", HAZARDS), name="hazard"),
        CheckConstraint(in_list("severity", SEVERITIES), name="severity"),
        CheckConstraint(in_list("status", ALERT_STATUSES), name="status"),
        Index(
            "ix_alerts_sent_subscription_id_hazard_severity_sent_at",
            "subscription_id",
            "hazard",
            "severity",
            text("sent_at DESC"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("alert_subscriptions.id"))
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id"))
    hazard: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(Text)
    message_hash: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SourceSwitch(Base):
    __tablename__ = "source_switches"
    __table_args__ = (CheckConstraint(SOURCE_CHECK, name="source"),)

    source: Mapped[str] = mapped_column(Text, primary_key=True)
    disabled: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

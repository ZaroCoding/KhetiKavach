---
trigger: glob
globs: apps/api/**
---
# API rules
- Plain SQL with asyncpg and $1 parameters at runtime; schema changes are new Alembic revisions.
- Tools return ToolOutput(data, fetched); evidence is built with EvidenceBook so provenance flows.
- Timeouts: 8 s weather, 20 s imagery; one retry; named fallback; read-through api_cache.
- Agent nodes emit trace events through Trace.emit with the contract event names.
- mypy strict must stay clean; tests for every connector and agent node, including failure paths.

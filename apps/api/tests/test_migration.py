"""The initial migration must build its SQL without a database and stay in step with the code.

A schema that cannot be created is the kind of break no other test notices, so this one imports the
migration file directly (Alembic would import it the same way).
"""

import importlib.util
from pathlib import Path
from types import ModuleType

from app.rag.scenarios import HEADING_PATTERNS, scenarios_for_risk
from app.schemas import SOURCE_NAMES

MIGRATION = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "0001_initial.py"


def _load() -> ModuleType:
    spec = importlib.util.spec_from_file_location("migration_0001", MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_migration_imports_and_builds_every_table() -> None:
    migration = _load()
    created = {s.split()[2] for s in migration.STATEMENTS if s.startswith("CREATE TABLE")}
    assert set(migration.TABLES) <= created  # everything downgrade() drops, upgrade() creates
    assert {"fields", "assessments", "agent_steps", "doc_chunks", "api_cache"} <= created


def test_migration_scenarios_cover_every_scenario_the_code_can_produce() -> None:
    migration = _load()
    produced = {key for key, _ in HEADING_PATTERNS} | {"general"}
    for hazard in ("dry_spell", "heavy_rain", "harvest_rain", "something_else"):
        for stage in ("establishment", "flowering", "yield_formation", "ripening"):
            for days_after_sowing in (10, 45):
                produced |= set(scenarios_for_risk(hazard, stage, days_after_sowing))
    assert produced <= set(migration.SCENARIOS), produced - set(migration.SCENARIOS)


def test_source_check_lists_every_source_name() -> None:
    migration = _load()
    assert all(f"'{name}'" in migration.SOURCE_CHECK for name in SOURCE_NAMES)

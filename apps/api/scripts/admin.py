"""Admin helpers.

uv run python -m scripts.admin register-sensor --device esp32-01 --field <field uuid>
uv run python -m scripts.admin prewarm --base https://<api-url>
"""

import argparse
import asyncio
import hashlib
import secrets

import asyncpg
import httpx

from app import db


async def register_sensor(args: argparse.Namespace) -> None:
    key = secrets.token_urlsafe(24)
    conn = await asyncpg.connect(db._dsn())
    await conn.execute(
        """INSERT INTO sensor_devices(device_id, field_id, key_hash) VALUES ($1, $2::uuid, $3)
           ON CONFLICT (device_id) DO UPDATE SET field_id = EXCLUDED.field_id,
             key_hash = EXCLUDED.key_hash""",
        args.device,
        args.field,
        hashlib.sha256(key.encode()).hexdigest(),
    )
    await conn.close()
    print(f"device {args.device} registered; put this key in the firmware (shown once): {key}")


async def prewarm(args: argparse.Namespace) -> None:
    """Fill the cache with real responses for every registered field before judging."""
    async with httpx.AsyncClient(base_url=args.base, timeout=60) as client:
        for field in (await client.get("/api/fields")).json():
            r = await client.post("/api/assessments", json={"field_id": field["id"]})
            print(field.get("name") or field["short_code"], r.status_code, r.json())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    s1 = sub.add_parser("register-sensor")
    s1.add_argument("--device", required=True)
    s1.add_argument("--field", required=True)
    s2 = sub.add_parser("prewarm")
    s2.add_argument("--base", required=True)
    parsed = parser.parse_args()
    asyncio.run({"register-sensor": register_sensor, "prewarm": prewarm}[parsed.cmd](parsed))

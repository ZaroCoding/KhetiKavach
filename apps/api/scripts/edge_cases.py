"""Edge-case drill against a running API (Phase 8). Prints PASS/FAIL per case.

    uv run python -m scripts.edge_cases --base https://<api-url> --district PB_LUDHIANA

Polygons are built from the district's own boundary box (fetched from the API), so nothing is
hand-typed; "outside India" uses the API's documented India bounds check.
"""

import argparse
import asyncio
from datetime import UTC, date, datetime, timedelta
from typing import Any

import httpx


def square(lon: float, lat: float, d: float) -> dict[str, Any]:
    return {
        "type": "Polygon",
        "coordinates": [
            [[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]
        ],
    }


async def main(args: argparse.Namespace) -> None:
    async with httpx.AsyncClient(base_url=args.base, timeout=60) as c:
        districts = {d["code"]: d for d in (await c.get("/api/districts")).json()}
        bbox = districts[args.district]["bbox"]
        lon, lat = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
        today = datetime.now(UTC).date()
        bowtie = {
            "type": "Polygon",
            "coordinates": [
                [
                    [lon, lat],
                    [lon + 0.003, lat + 0.003],
                    [lon + 0.003, lat],
                    [lon, lat + 0.003],
                    [lon, lat],
                ]
            ],
        }
        base = {
            "crop": "wheat",
            "sowing_date": str(today - timedelta(days=30)),
            "district_code": args.district,
        }
        cases: list[tuple[str, dict[str, Any], int]] = [
            ("self-intersecting polygon", {**base, "geometry": bowtie}, 422),
            ("outside India", {**base, "geometry": square(0.0, 51.0, 0.003)}, 422),
            ("over 50 ha", {**base, "geometry": square(lon, lat, 0.02)}, 422),
            (
                "future sowing date",
                {
                    **base,
                    "geometry": square(lon, lat, 0.003),
                    "sowing_date": str(today + timedelta(days=3)),
                },
                422,
            ),
            ("unknown crop", {**base, "geometry": square(lon, lat, 0.003), "crop": "banana"}, 422),
            (
                "unknown district",
                {**base, "geometry": square(lon, lat, 0.003), "district_code": "XX_NOWHERE"},
                422,
            ),
        ]
        for name, body, want in cases:
            r = await c.post("/api/fields", json=body)
            reason = r.json().get("error", {}).get("message")
            print(
                f"{'PASS' if r.status_code == want else 'FAIL'}  {name}: {r.status_code} {reason}"
            )
        r = await c.get("/api/assessments/not-a-uuid")
        print(f"{'PASS' if r.status_code == 404 else 'FAIL'}  unknown assessment: {r.status_code}")
        ok = await c.post("/api/fields", json={**base, "geometry": square(lon, lat, 0.003)})
        if ok.status_code == 201:
            fid = ok.json()["id"]
            r = await c.post(
                "/api/assessments", json={"field_id": fid, "as_of": str(date(2020, 1, 1))}
            )
            print(
                f"{'PASS' if r.status_code == 422 else 'FAIL'}  as_of before 2021: {r.status_code}"
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--district", default="PB_LUDHIANA")
    asyncio.run(main(parser.parse_args()))

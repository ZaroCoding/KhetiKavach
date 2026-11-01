"""Download IMD 0.25 deg gridded daily rainfall with imdlib and load one district's area.

    uv run --group data python -m scripts.load_imd --district PB_LUDHIANA --start 1951 --end 2023

The area is the district's OpenStreetMap bounding box (nominatim connector) padded by 0.5 deg, so
no coordinates are typed by hand. IMD publishes yearly files at imdpune.gov.in (cached in --dir).
"""

import argparse
import asyncio
import io

import asyncpg

from app import db
from app.config import get_settings
from app.connectors import nominatim
from app.districts import DISTRICTS


async def main(args: argparse.Namespace) -> None:
    import imdlib

    await db.init_pool()
    (lon0, lat0, lon1, lat1), res = await nominatim.district_bbox(
        DISTRICTS[args.district].boundary_query
    )
    pad = args.pad
    print(f"{args.district}: bbox from {res.source} ({res.status}, {res.fetched_at:%Y-%m-%d})")
    conn = await asyncpg.connect(db._dsn())
    await conn.execute("CREATE TEMP TABLE imd_stage (lat real, lon real, date date, mm real)")
    for year in range(args.start, args.end + 1):
        try:
            imdlib.get_data("rain", year, year, fn_format="yearwise", file_dir=args.dir)
            ds = imdlib.open_data("rain", year, year, "yearwise", args.dir).get_xarray()
        except Exception as exc:
            print(f"{year}: not published yet by IMD ({exc}); skipping")
            continue
        sub = ds["rain"].sel(lat=slice(lat0 - pad, lat1 + pad), lon=slice(lon0 - pad, lon1 + pad))
        frame = sub.to_dataframe().reset_index()
        frame = frame[frame["rain"] > -900]  # -999 = outside India / missing; never filled
        frame["date"] = frame["time"].dt.date
        buf = io.BytesIO()
        frame[["lat", "lon", "date", "rain"]].round({"lat": 2, "lon": 2}).to_csv(
            buf, index=False, header=False
        )
        buf.seek(0)
        await conn.execute("TRUNCATE imd_stage")
        await conn.copy_to_table("imd_stage", source=buf, format="csv")
        await conn.execute(
            "INSERT INTO imd_rain_daily SELECT * FROM imd_stage ON CONFLICT DO NOTHING"
        )
        await conn.execute(
            "INSERT INTO imd_cells SELECT DISTINCT lat, lon FROM imd_stage ON CONFLICT DO NOTHING"
        )
        print(f"{year}: {len(frame):,} rows")
    await conn.close()
    await db.close_pool()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--district", required=True, choices=sorted(DISTRICTS))
    parser.add_argument("--start", type=int, default=1951)
    parser.add_argument("--end", type=int, default=2023)
    parser.add_argument("--pad", type=float, default=0.5, help="degrees around the district bbox")
    parser.add_argument("--dir", default="data/imd")
    get_settings()
    asyncio.run(main(parser.parse_args()))

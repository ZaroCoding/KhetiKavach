"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { MapTarget } from "@/components/FieldMap";
import { api } from "@/lib/api";
import type { AdminSource, Crop, District, Field, GeoJSONPolygon, Place } from "@/lib/types";

const CROPS: Crop[] = ["wheat", "rice", "cotton", "soybean"];
const inputClass = "w-full rounded border bg-white px-2 py-1 text-sm";

export function PlaceSearch({ onGo }: { onGo: (t: MapTarget) => void }) {
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const search = async () => {
    setErr(null);
    try {
      setPlaces(await api.geocode(q));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input className={inputClass} placeholder="Search a village" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" variant="outline" onClick={search} disabled={q.length < 2}>
          Find
        </Button>
      </div>
      {err && <p className="text-xs text-risk-high">{err}</p>}
      {places.map((p) => (
        <button
          key={`${p.lat},${p.lon}`}
          className="block w-full truncate text-left text-xs text-sky-600 hover:underline"
          onClick={() => {
            onGo({ lon: p.lon, lat: p.lat, zoom: 15 });
            setPlaces([]);
          }}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

export function NewFieldForm({
  polygon,
  districts,
  onCreated,
  onGo,
}: {
  polygon: GeoJSONPolygon | null;
  districts: District[];
  onCreated: (f: Field) => void;
  onGo: (t: MapTarget) => void;
}) {
  const [name, setName] = useState("");
  const [crop, setCrop] = useState<Crop>("wheat");
  const [sowing, setSowing] = useState("");
  const [district, setDistrict] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!polygon) return setErr("Draw the field on the map first.");
    setBusy(true);
    setErr(null);
    try {
      onCreated(await api.createField({ name: name || null, geometry: polygon, crop, sowing_date: sowing, district_code: district }));
      setName("");
    } catch (e) {
      setErr((e as Error).message); // API 422 reasons are shown verbatim
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-soil-500">Register a field</div>
      <select
        className={inputClass}
        value={district}
        onChange={(e) => {
          setDistrict(e.target.value);
          const d = districts.find((x) => x.code === e.target.value);
          if (d?.bbox) onGo({ lon: (d.bbox[0] + d.bbox[2]) / 2, lat: (d.bbox[1] + d.bbox[3]) / 2, zoom: 9.5 });
        }}
      >
        <option value="">Choose a demo district…</option>
        {districts.map((d) => (
          <option key={d.code} value={d.code}>
            {d.name}, {d.state} ({d.plan_chunks} plan passages)
          </option>
        ))}
      </select>
      <PlaceSearch onGo={onGo} />
      <p className="text-xs text-soil-500">{polygon ? "✓ Polygon drawn" : "Draw the field boundary on the map."}</p>
      <input className={inputClass} placeholder="Field name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={inputClass} value={crop} onChange={(e) => setCrop(e.target.value as Crop)}>
          {CROPS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input type="date" className={inputClass} value={sowing} onChange={(e) => setSowing(e.target.value)} aria-label="Sowing date" />
      </div>
      {err && <p className="rounded bg-red-50 p-2 text-xs text-risk-high">{err}</p>}
      <Button className="w-full" onClick={submit} disabled={busy || !sowing || !district}>
        {busy ? "Saving…" : "Save field"}
      </Button>
    </div>
  );
}

export function FieldList({ fields, selectedId, onSelect }: { fields: Field[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="max-h-52 overflow-y-auto rounded-lg border bg-card">
      <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-soil-500">Fields ({fields.length})</div>
      {fields.length === 0 && <p className="px-3 py-2 text-xs text-soil-500">No fields yet.</p>}
      <ul>
        {fields.map((f) => (
          <li key={f.id}>
            <button
              onClick={() => onSelect(f.id)}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-soil-100 ${f.id === selectedId ? "bg-soil-100 font-semibold" : ""}`}
            >
              <span>
                {f.name ?? f.short_code}{" "}
                <span className="text-xs font-normal text-soil-500">
                  · {f.crop} · {f.district_code}
                </span>
              </span>
              <span className="font-mono text-[10px] text-soil-500" title="Telegram: /start CODE">
                {f.short_code}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Robustness demo: switch a source off live, re-run, watch the fallback in the trace. */
export function AdminPanel() {
  const [key, setKey] = useState("");
  const [rows, setRows] = useState<AdminSource[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    try {
      setRows(await api.adminSources(key));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const toggle = async (row: AdminSource) => {
    try {
      await api.toggleSource(key, row.source, !row.disabled);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-soil-500">Admin: source kill switch</div>
      <div className="flex gap-2">
        <input type="password" className={inputClass} placeholder="X-Admin-Key" value={key} onChange={(e) => setKey(e.target.value)} />
        <Button size="sm" onClick={load}>
          Load
        </Button>
      </div>
      {err && <p className="text-xs text-risk-high">{err}</p>}
      <div className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <button
            key={row.source}
            onClick={() => toggle(row)}
            className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] ${row.disabled ? "bg-risk-high text-white" : "bg-leaf-500 text-white"}`}
          >
            {row.source}: {row.disabled ? "OFF" : "on"}
          </button>
        ))}
      </div>
    </div>
  );
}

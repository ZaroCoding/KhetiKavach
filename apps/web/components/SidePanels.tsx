"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AsyncContainer } from "@/components/loading/async-container";
import { Skeleton } from "@/components/loading/skeleton";
import type { MapTarget } from "@/components/FieldMap";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AsyncState } from "@/lib/async";
import type { STRINGS } from "@/lib/format";
import type { AdminSource, Crop, District, Field, GeoJSONPolygon, Place } from "@/lib/types";
import { cn } from "@/lib/utils";

type Strings = (typeof STRINGS)["en"];

const CROPS: Crop[] = ["wheat", "rice", "cotton", "soybean"];
const inputClass = "w-full rounded border bg-white px-2 py-1 text-sm";
const label = "text-[11px] font-semibold uppercase tracking-wider text-soil-500";

/** Time Machine presets. From 2024-03-14 the agent replays the forecast actually issued that day;
 * earlier dates use the LightGBM model on observed rain. */
const PRESETS = [
  { label: "Mar 2026 harvest rain (forecast replay)", date: "2026-03-15" },
  { label: "Aug 2023 drought (model replay)", date: "2023-08-05" },
  { label: "Mar 2023 harvest rain (model replay)", date: "2023-03-15" },
];

function PanelCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2 rounded-lg border bg-card p-3", className)}>
      <div className={label}>{title}</div>
      {children}
    </div>
  );
}

function PlaceSearch({ onGo }: { onGo: (t: MapTarget) => void }) {
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const search = async () => {
    try {
      setPlaces(await api.geocode(q));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Search a village"
          aria-label="Search a village"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && q.length >= 2 && search()}
        />
        <Button size="sm" variant="outline" onClick={search} disabled={q.length < 2}>
          Find
        </Button>
      </div>
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
  districts: AsyncState<District[]>;
  onCreated: (f: Field) => void;
  onGo: (t: MapTarget) => void;
}) {
  const [name, setName] = useState("");
  const [crop, setCrop] = useState<Crop>("wheat");
  const [sowing, setSowing] = useState("");
  const [district, setDistrict] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = districts.status === "success" ? districts.data : [];

  const submit = async () => {
    if (!polygon) return setErr("Draw the field on the map first.");
    setBusy(true);
    setErr(null);
    try {
      onCreated(await api.createField({ name: name || null, geometry: polygon, crop, sowing_date: sowing, district_code: district }));
      setName("");
      toast.success("Field saved");
    } catch (e) {
      setErr((e as Error).message); // API 422 reasons are shown verbatim
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelCard title="Register a field">
      <AsyncContainer state={districts} loading={<Skeleton className="h-8" />}>
        {() => (
          <select
            className={inputClass}
            aria-label="District"
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              const d = list.find((x) => x.code === e.target.value);
              if (d?.bbox) onGo({ lon: (d.bbox[0] + d.bbox[2]) / 2, lat: (d.bbox[1] + d.bbox[3]) / 2, zoom: 9.5 });
            }}
          >
            <option value="">Choose a demo district…</option>
            {list.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}, {d.state} ({d.plan_chunks} plan passages)
              </option>
            ))}
          </select>
        )}
      </AsyncContainer>
      <PlaceSearch onGo={onGo} />
      <p className="text-xs text-soil-500">{polygon ? "✓ Polygon drawn" : "Draw the field boundary on the map."}</p>
      <input className={inputClass} placeholder="Field name (optional)" aria-label="Field name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={inputClass} aria-label="Crop" value={crop} onChange={(e) => setCrop(e.target.value as Crop)}>
          {CROPS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input type="date" className={inputClass} value={sowing} onChange={(e) => setSowing(e.target.value)} aria-label="Sowing date" />
      </div>
      {err && (
        <p className="rounded bg-red-50 p-2 text-xs text-risk-high" role="alert">
          {err}
        </p>
      )}
      <Button className="w-full" onClick={submit} disabled={busy || !sowing || !district}>
        {busy ? "Saving…" : "Save field"}
      </Button>
    </PanelCard>
  );
}

export function FieldList({
  fields,
  selectedId,
  onSelect,
  onRetry,
}: {
  fields: AsyncState<Field[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  const count = fields.status === "success" ? ` (${fields.data.length})` : "";
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border bg-card">
      <div className={cn(label, "border-b px-3 py-2")}>Fields{count}</div>
      <AsyncContainer
        state={fields}
        className="p-3"
        loading={<Skeleton lines={3} />}
        onRetry={onRetry}
        isEmpty={(list) => list.length === 0}
        empty={<p className="text-xs text-soil-500">No fields yet. Draw one on the map and save it.</p>}
      >
        {(list) => (
          <ul className="-m-3">
            {list.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => onSelect(f.id)}
                  aria-pressed={f.id === selectedId}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-soil-100",
                    f.id === selectedId && "bg-soil-100 font-semibold",
                  )}
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
        )}
      </AsyncContainer>
    </div>
  );
}

function RunButton({ field, running, onAssess, s }: { field: Field | null; running: boolean; onAssess: () => void; s: Strings }) {
  return (
    <Button className="w-full bg-sky-600 hover:bg-sky-600/90" onClick={onAssess} disabled={!field || running}>
      {running ? "Agent running…" : `${s.assess}${field ? `: ${field.name ?? field.short_code}` : ""}`}
    </Button>
  );
}

export function AssessPanel({
  field,
  asOf,
  running,
  onAssess,
  onChangeDate,
  s,
}: {
  field: Field | null;
  asOf: string;
  running: boolean;
  onAssess: () => void;
  onChangeDate: () => void;
  s: Strings;
}) {
  return (
    <PanelCard title={s.assess}>
      {field ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-soil-500">Field</dt>
          <dd className="font-medium">{field.name ?? field.short_code}</dd>
          <dt className="text-soil-500">Crop</dt>
          <dd>
            {field.crop}, sown {field.sowing_date}
          </dd>
          <dt className="text-soil-500">District</dt>
          <dd>{field.district_code}</dd>
          <dt className="text-soil-500">Telegram code</dt>
          <dd className="font-mono text-xs">{field.short_code}</dd>
        </dl>
      ) : (
        <p className="text-sm text-soil-500">Select a field first: click its polygon on the map or choose it in the Fields panel.</p>
      )}
      <p className="text-xs text-soil-700">
        {asOf ? `Time Machine: replaying ${asOf}.` : "Live: today's forecasts and satellite scenes."}{" "}
        <button className="text-sky-600 hover:underline" onClick={onChangeDate}>
          change date
        </button>
      </p>
      <RunButton field={field} running={running} onAssess={onAssess} s={s} />
    </PanelCard>
  );
}

export function TimeMachinePanel({
  field,
  asOf,
  setAsOf,
  running,
  onAssess,
  s,
}: {
  field: Field | null;
  asOf: string;
  setAsOf: (d: string) => void;
  running: boolean;
  onAssess: () => void;
  s: Strings;
}) {
  return (
    <PanelCard title={s.timeMachine}>
      <input
        type="date"
        value={asOf}
        min="2021-01-01"
        max={new Date().toISOString().slice(0, 10)}
        onChange={(e) => setAsOf(e.target.value)}
        aria-label="Replay date"
        className={inputClass}
      />
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.date}
            onClick={() => setAsOf(p.date)}
            aria-pressed={asOf === p.date}
            className={cn("rounded-full px-2 py-0.5 text-[11px] hover:bg-soil-200", asOf === p.date ? "bg-leaf-700 text-white hover:bg-leaf-700" : "bg-soil-100")}
          >
            {p.label}
          </button>
        ))}
        {asOf && (
          <button onClick={() => setAsOf("")} className="rounded-full px-2 py-0.5 text-[11px] text-sky-600">
            today (live)
          </button>
        )}
      </div>
      <p className="text-xs text-soil-500">
        Replays only what was known on that date. What actually fell afterwards is shown for comparison, never as an input.
      </p>
      <RunButton field={field} running={running} onAssess={onAssess} s={s} />
    </PanelCard>
  );
}

/** Robustness demo: switch a source off live, re-run, watch the fallback in the trace. */
export function AdminPanel() {
  const [key, setKey] = useState("");
  const [rows, setRows] = useState<AdminSource[]>([]);
  const load = async () => {
    try {
      setRows(await api.adminSources(key));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const toggle = async (row: AdminSource) => {
    try {
      await api.toggleSource(key, row.source, !row.disabled);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <PanelCard title="Admin: source kill switch">
      <div className="flex gap-2">
        <input type="password" className={inputClass} placeholder="X-Admin-Key" aria-label="Admin key" value={key} onChange={(e) => setKey(e.target.value)} />
        <Button size="sm" onClick={load}>
          Load
        </Button>
      </div>
      <p className="text-xs text-soil-500">Turn a source off, press Assess, and watch the agent fall back to the next source in its chain.</p>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <button
            key={row.source}
            onClick={() => toggle(row)}
            aria-pressed={row.disabled}
            className={cn("rounded-full px-2.5 py-0.5 font-mono text-[11px] text-white", row.disabled ? "bg-risk-high" : "bg-leaf-500")}
          >
            {row.source}: {row.disabled ? "OFF" : "on"}
          </button>
        ))}
      </div>
    </PanelCard>
  );
}

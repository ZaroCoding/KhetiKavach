"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import AgentTrace from "@/components/AgentTrace";
import type { MapTarget } from "@/components/FieldMap";
import RiskCard from "@/components/RiskCard";
import { AdminPanel, FieldList, NewFieldForm } from "@/components/SidePanels";
import { Button } from "@/components/ui/button";
import { api, streamTrace } from "@/lib/api";
import { STRINGS, headline } from "@/lib/format";
import type { Assessment, District, Field, GeoJSONPolygon, Language, Severity, TraceEvent } from "@/lib/types";

// MapLibre touches `window`, so the map renders client-side only.
const FieldMap = dynamic(() => import("@/components/FieldMap"), { ssr: false });

// Time Machine presets. From 2024-03-14 the agent replays the forecast actually issued that day;
// earlier dates use the LightGBM model on observed rain. Confirm each date against the IMD bulletin
// you cite before the demo.
const PRESETS = [
  { label: "Mar 2026 harvest rain (forecast replay)", date: "2026-03-15" },
  { label: "Aug 2023 drought (model replay)", date: "2023-08-05" },
  { label: "Mar 2023 harvest rain (model replay)", date: "2023-03-15" },
];

export default function Home() {
  const [lang, setLang] = useState<Language>("en");
  const s = STRINGS[lang];
  const [districts, setDistricts] = useState<District[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [levels, setLevels] = useState<Record<string, Severity>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<GeoJSONPolygon | null>(null);
  const [target, setTarget] = useState<MapTarget | null>(null);
  const [asOf, setAsOf] = useState("");
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const stop = useRef<(() => void) | null>(null);

  const refresh = useCallback(() => {
    api.listFields().then(setFields).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
    api.districts().then(setDistricts).catch((e: Error) => setError(e.message));
    return () => stop.current?.();
  }, [refresh]);

  const field = fields.find((f) => f.id === selected) ?? null;

  const assess = async () => {
    if (!field) return;
    stop.current?.();
    setEvents([]);
    setAssessment(null);
    setError(null);
    setRunning(true);
    try {
      const { assessment_id } = await api.startAssessment(field.id, lang, asOf || undefined);
      stop.current = streamTrace(
        assessment_id,
        (e) => setEvents((prev) => [...prev, e]),
        async () => {
          setRunning(false);
          const result = await api.getAssessment(assessment_id);
          setAssessment(result);
          const top = headline(result.risks);
          if (top && result.mode === "live") setLevels((prev) => ({ ...prev, [field.id]: top.severity }));
        },
      );
    } catch (e) {
      setRunning(false);
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div>
          <span className="text-lg font-bold text-leaf-700">KhetKavach</span>
          <span className="ml-3 text-sm text-soil-500">{s.tagline}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => setShowAdmin(!showAdmin)} className="rounded px-2 py-1 text-xs text-soil-500 hover:bg-soil-100">
            admin
          </button>
          {(["en", "hi", "pa"] as Language[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`rounded px-2 py-1 ${lang === l ? "bg-soil-900 text-white" : "hover:bg-soil-100"}`}>
              {{ en: "English", hi: "हिन्दी", pa: "ਪੰਜਾਬੀ" }[l]}
            </button>
          ))}
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="grid min-h-[60vh] grid-rows-[1fr_220px] gap-2 p-2">
          <div className="overflow-hidden rounded-lg">
            <FieldMap
              fields={fields}
              levels={levels}
              districts={districts}
              selectedId={selected}
              target={target}
              onSelect={setSelected}
              onDrawn={setPolygon}
            />
          </div>
          <AgentTrace events={events} running={running} />
        </div>

        <div className="space-y-3 overflow-y-auto p-2 pr-3">
          {showAdmin && <AdminPanel />}
          <div className="grid gap-3 md:grid-cols-2">
            <NewFieldForm
              polygon={polygon}
              districts={districts}
              onGo={setTarget}
              onCreated={(f) => {
                setFields([f, ...fields]);
                setSelected(f.id);
                setPolygon(null);
              }}
            />
            <div className="space-y-3">
              <FieldList fields={fields} selectedId={selected} onSelect={setSelected} />
              <div className="space-y-2 rounded-lg border bg-card p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-soil-500">{s.timeMachine}</div>
                <input
                  type="date"
                  value={asOf}
                  min="2021-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="w-full rounded border bg-white px-2 py-1 text-sm"
                />
                <div className="flex flex-wrap gap-1">
                  {PRESETS.map((p) => (
                    <button key={p.date} onClick={() => setAsOf(p.date)} className="rounded-full bg-soil-100 px-2 py-0.5 text-[11px] hover:bg-soil-200">
                      {p.label}
                    </button>
                  ))}
                  {asOf && (
                    <button onClick={() => setAsOf("")} className="rounded-full px-2 py-0.5 text-[11px] text-sky-600">
                      today (live)
                    </button>
                  )}
                </div>
                <Button className="w-full bg-sky-600 hover:bg-sky-600/90" onClick={assess} disabled={!field || running}>
                  {running ? "Agent running…" : `${s.assess}${field ? `: ${field.name ?? field.short_code}` : ""}`}
                </Button>
              </div>
            </div>
          </div>
          {error && <p className="rounded bg-red-50 p-2 text-sm text-risk-high">{error}</p>}
          {assessment && <RiskCard a={assessment} s={s} />}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";

import { ForecastSpread, NdviChart, SeriesBars } from "@/components/Charts";
import { HAZARD_LABEL, METHOD_NOTE, SEVERITY_CLASS, STRINGS, pct } from "@/lib/format";
import type { Assessment, Evidence, Risk } from "@/lib/types";

type Strings = (typeof STRINGS)["en"];

function RiskTile({ risk, s }: { risk: Risk; s: Strings }) {
  const [open, setOpen] = useState(false);
  const yesNo = risk.method === "deterministic_replay";
  const m = risk.members;
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{HAZARD_LABEL[risk.hazard]}</div>
          <div className="text-[11px] text-soil-500">{risk.threshold.description}</div>
        </div>
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${SEVERITY_CLASS[risk.severity]}`}>{risk.severity}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{yesNo ? (risk.probability ? "YES" : "NO") : pct(risk.probability)}</span>
        {!yesNo && <span className="text-xs text-soil-500">{s.chance}</span>}
        {risk.probability_ci90 && (
          <span className="text-xs text-soil-500">
            (90% CI {pct(risk.probability_ci90[0])}–{pct(risk.probability_ci90[1])})
          </span>
        )}
      </div>
      {m && (
        <div className="text-xs text-soil-700">
          {m.ecmwf && `ECMWF ${m.ecmwf.exceeding}/${m.ecmwf.total}`}
          {m.ecmwf && m.gfs && " · "}
          {m.gfs && `NOAA GEFS ${m.gfs.exceeding}/${m.gfs.total}`}
        </div>
      )}
      {risk.climatology_probability !== null && risk.method !== "climatology" && (
        <div className="text-xs text-soil-700">
          {s.usual}: {pct(risk.climatology_probability)}
        </div>
      )}
      <div className="mt-1 text-[11px] text-soil-500">
        {risk.window ? `${risk.window.start} to ${risk.window.end} · ` : ""}stage: {risk.crop_stage} · weight {risk.stage_weight} ·{" "}
        {METHOD_NOTE[risk.method]}
      </div>
      {risk.uncertainty_note && <div className="mt-1 text-[11px] text-risk-moderate">{risk.uncertainty_note}</div>}
      <button className="mt-1 text-[11px] font-medium text-sky-600" onClick={() => setOpen(!open)}>
        {open ? "hide drivers" : "why?"}
      </button>
      {open && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-soil-700">
          {risk.explanation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const VALUE_LABELS: Record<string, string> = {
  ndvi_latest: "NDVI, latest clear scene",
  ndvi_anomaly: "NDVI vs field's own median",
  optical_age_days: "Age of latest clear scene",
  rain_30d: "Rain, last 30 days",
  soil_moisture: "Root-zone soil moisture",
  soil_moisture_percentile: "Soil moisture percentile",
  soil_moisture_pct: "In-field probe",
  clim_p_dry_spell: "Usual chance: dry spell",
  clim_p_heavy_rain: "Usual chance: heavy rain",
  clim_p_harvest_rain: "Usual chance: rain at harvest",
  normal_rain_15d: "Normal rain, these 15 days",
  model_p_dry_spell: "Model: dry-spell chance",
  imd_rain_30d: "IMD rain, last 30 days",
};

function ValueTable({ evidence }: { evidence: Evidence[] }) {
  const values = evidence.filter((e) => e.series === null);
  return (
    <table className="w-full text-left text-[11px]">
      <tbody>
        {values.map((e) => (
          <tr key={e.id} className="border-t align-top">
            <td className="py-1 pr-2">{VALUE_LABELS[e.variable] ?? e.variable.replaceAll("_", " ")}</td>
            <td className="pr-2 font-medium tabular-nums">
              {e.status === "unavailable" ? (
                <span className="text-risk-high">unavailable (nothing substituted)</span>
              ) : e.unit === "fraction" ? (
                pct(e.value)
              ) : (
                `${e.value}${e.unit ? ` ${e.unit}` : ""}`
              )}
            </td>
            <td className="font-mono text-soil-500">{e.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function RiskCard({ a, s }: { a: Assessment; s: Strings }) {
  const hasForecast = a.evidence.some((e) => e.variable === "precip_p50" && e.series);
  return (
    <div className="space-y-4">
      {a.mode === "replay" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <b>Time Machine: real archived data as of {a.as_of}.</b>{" "}
          {a.replay_basis === "archived_forecast"
            ? "Uses the forecast actually issued that day (archived ECMWF run): a yes/no outcome."
            : "No archived forecast exists for this date: risk comes from the LightGBM model on rain observed up to the day before, plus IMD climatology (evaluated; ensemble probabilities are the primary signal)."}{" "}
          What actually fell afterwards is overlaid for comparison only.
        </div>
      )}
      {a.status === "completed_degraded" && (
        <div className="rounded-lg border border-soil-200 bg-soil-100 p-2 text-xs text-soil-700">
          Completed with degraded inputs: a fallback source was used, an input was unavailable, or the plan was quoted directly. See the trace.
        </div>
      )}

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-soil-500">{s.risks}</h3>
        {a.risks.length === 0 ? (
          <p className="text-sm text-soil-500">No risk could be computed: the forecast sources were unavailable. See the trace.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {a.risks.map((r) => (
              <RiskTile key={r.hazard} risk={r} s={s} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-soil-500">{s.plan}</h3>
        {a.plan.length === 0 ? (
          <p className="text-sm text-soil-500">No cited actions: no contingency-plan passages matched (or none are indexed for this district).</p>
        ) : (
          <div className="rounded-lg border bg-card p-3">
            {a.plan_summary && <p className="mb-2 text-sm">{a.plan_summary}</p>}
            <ol className="space-y-2">
              {a.plan.map((x, i) => (
                <li key={x.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf-700 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="text-sm">
                    <div className="font-medium">{x.text}</div>
                    <div className="text-xs text-soil-700">by {x.when}</div>
                    <div className="text-[11px] text-sky-600">
                      [{x.citation.doc_title} ({x.citation.plan_year}), p.{x.citation.page}]
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t pt-2 text-[11px] text-soil-500">
              {a.plan_generator === "llm"
                ? "✓ Verified: every number is in the evidence or the cited passage; every action cites the plan."
                : "Quoted directly from the district contingency plan (LLM unavailable or rejected)."}
            </p>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-soil-500">{s.evidence}</h3>
        <div className="grid gap-2 lg:grid-cols-2">
          {hasForecast && (
            <div className="rounded-lg border bg-card p-3 lg:col-span-2">
              <span className="text-sm font-semibold">Forecast rainfall spread</span>
              <ForecastSpread evidence={a.evidence} />
            </div>
          )}
          {a.evidence.some((e) => e.variable === "ndvi" && e.series?.length) && (
            <div className="rounded-lg border bg-card p-3">
              <span className="text-sm font-semibold">Sentinel-2 NDVI / NDMI</span>
              <NdviChart evidence={a.evidence} />
            </div>
          )}
          {a.evidence.some((e) => e.variable === "rain_daily" && e.series?.length) && (
            <div className="rounded-lg border bg-card p-3">
              <span className="text-sm font-semibold">Rain, last 30 days</span>
              <SeriesBars evidence={a.evidence} variable="rain_daily" label="mm/day" />
            </div>
          )}
          <div className="rounded-lg border bg-card p-3 lg:col-span-2">
            <ValueTable evidence={a.evidence} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-soil-500">{s.sources}</h3>
        <table className="w-full text-left text-[11px]">
          <thead className="text-soil-500">
            <tr>
              <th className="py-1 pr-2">source</th>
              <th className="pr-2">status</th>
              <th className="pr-2">fetched</th>
              <th>attribution / request</th>
            </tr>
          </thead>
          <tbody>
            {a.sources.map((p) => (
              <tr key={p.name} className="border-t align-top">
                <td className="py-1 pr-2 font-mono">{p.name}</td>
                <td className="pr-2">{p.status}</td>
                <td className="whitespace-nowrap pr-2">{new Date(p.fetched_at).toLocaleString()}</td>
                <td className="break-all text-soil-700">
                  {p.attribution}{" "}
                  {p.url?.startsWith("http") && (
                    <a className="text-sky-600 underline" href={p.url} target="_blank" rel="noreferrer">
                      upstream request
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] text-soil-500">
          Forecasts sit on a ~25 km grid; field-level detail comes from 10 m satellite pixels. We report yield-risk exposure, not tonnes
          per hectare.
        </p>
      </section>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";

import { ForecastSpread, NdviChart, SeriesBars } from "@/components/Charts";
import { BentoGrid, type BentoSlotConfig } from "@/components/layouts/bento-grid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HAZARD_LABEL, METHOD_NOTE, SEVERITY_CLASS, STRINGS, pct, riskHeading, when } from "@/lib/format";
import type { Assessment, Evidence, Risk } from "@/lib/types";
import { cn } from "@/lib/utils";

type Strings = (typeof STRINGS)["en"];

const SECTION = "text-[11px] font-semibold uppercase tracking-wider text-soil-500";

const findEvidence = (evidence: Evidence[], variable: string): Evidence | undefined =>
  evidence.find((e) => e.variable === variable && (e.series?.length ?? 0) > 0);

/** source · status · fetched: the provenance every number in the UI carries. */
function ProvLine({ e }: { e: Pick<Evidence, "source" | "status" | "fetched_at"> }) {
  return (
    <p className="font-mono text-[10px] text-soil-500">
      {e.source} · {e.status} · {when(e.fetched_at)}
    </p>
  );
}

function Hint({ children, text }: { children: ReactNode; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">{children}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

function RiskTile({ risk, evidence, s }: { risk: Risk; evidence: Evidence[]; s: Strings }) {
  const [open, setOpen] = useState(false);
  const yesNo = risk.method === "deterministic_replay";
  const m = risk.members;
  const drivers = risk.driver_ids.map((id) => evidence.find((e) => e.id === id)).filter((e): e is Evidence => e !== undefined);
  return (
    <Card className="h-full">
      <CardContent className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{HAZARD_LABEL[risk.hazard]}</div>
            <div className="text-[11px] text-soil-500">{risk.threshold.description}</div>
          </div>
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-bold uppercase", SEVERITY_CLASS[risk.severity])}>{risk.severity}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-2 pt-1">
          <span className="text-3xl font-bold tabular-nums">{yesNo ? (risk.probability ? "YES" : "NO") : pct(risk.probability)}</span>
          {!yesNo && <span className="text-xs text-soil-500">{s.chance}</span>}
        </div>
        {risk.probability_ci90 && (
          <div className="text-xs text-soil-700">
            <Hint text="90% Wilson interval on the share of ensemble members. It reflects how few members there are, not forecast skill.">
              90% range
            </Hint>{" "}
            {pct(risk.probability_ci90[0])}–{pct(risk.probability_ci90[1])}
          </div>
        )}
        {m && (
          <div className="text-xs text-soil-700">
            {m.ecmwf && `ECMWF ${m.ecmwf.exceeding}/${m.ecmwf.total}`}
            {m.ecmwf && m.gfs && " · "}
            {m.gfs && `NOAA GEFS ${m.gfs.exceeding}/${m.gfs.total}`}
          </div>
        )}
        {risk.climatology_probability !== null && risk.method !== "climatology" && (
          <div className="text-xs text-soil-700">
            <Hint text="How often this event happened in this window at this IMD grid cell, 1991–2020.">{s.usual}</Hint>:{" "}
            {pct(risk.climatology_probability)}
          </div>
        )}
        <div className="text-[11px] text-soil-500">
          {risk.window ? `${risk.window.start} to ${risk.window.end} · ` : ""}stage: {risk.crop_stage} · weight {risk.stage_weight} ·{" "}
          {METHOD_NOTE[risk.method]}
        </div>
        {risk.uncertainty_note && <div className="text-[11px] text-risk-moderate">{risk.uncertainty_note}</div>}
        <button type="button" className="text-[11px] font-medium text-sky-600" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "hide drivers" : "why?"}
        </button>
        {open && (
          <div className="space-y-2">
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-soil-700">
              {risk.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {drivers.length > 0 && (
              <div className="space-y-0.5 border-t pt-1">
                <div className="text-[10px] font-semibold uppercase text-soil-500">Evidence behind this number</div>
                {drivers.map((e) => (
                  <ProvLine key={e.id} e={e} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
      <thead className="text-soil-500">
        <tr>
          <th className="py-1 pr-2 font-medium">value</th>
          <th className="pr-2 font-medium">reading</th>
          <th className="font-medium">source · status · fetched</th>
        </tr>
      </thead>
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
            <td>
              <ProvLine e={e} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartCard({ title, evidence, children }: { title: string; evidence: Evidence; children: ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {children}
        <ProvLine e={evidence} />
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className={SECTION}>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** One column when a single chart is present, two otherwise; the first of three spans the row. */
function chartSpan(index: number, count: number): BentoSlotConfig["cols"] {
  if (count === 1) return 12;
  if (count === 3 && index === 0) return 12;
  return 6;
}

function riskSpan(count: number): BentoSlotConfig["cols"] {
  return count >= 3 ? 4 : count === 2 ? 6 : 12;
}

export default function RiskCard({ a, s }: { a: Assessment; s: Strings }) {
  const spread = findEvidence(a.evidence, "precip_p50");
  const ndvi = findEvidence(a.evidence, "ndvi");
  const rain = findEvidence(a.evidence, "rain_daily");
  const charts = [
    spread && "spread",
    ndvi && "ndvi",
    rain && "rain",
  ].filter((id): id is string => Boolean(id));

  const slots: BentoSlotConfig[] = [
    { id: "notes", cols: 12 },
    ...a.risks.map((r, _i, all) => ({ id: `risk-${r.hazard}`, cols: riskSpan(all.length) })),
    { id: "no-risk", cols: 12 },
    ...charts.map((id, i) => ({ id, cols: chartSpan(i, charts.length) })),
    { id: "plan", cols: 12 },
    { id: "values", cols: 12 },
    { id: "sources", cols: 12 },
  ];

  const content: Record<string, ReactNode> = {
    notes: (a.mode === "replay" || a.status === "completed_degraded") && (
      <div className="space-y-2">
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
            Completed with degraded inputs: a fallback source was used, an input was unavailable, or the plan was quoted directly. See the
            trace.
          </div>
        )}
      </div>
    ),
    "no-risk": a.risks.length === 0 && (
      <Section title={riskHeading(s, a.risks)}>
        <p className="text-sm text-soil-500">No risk could be computed: the forecast sources were unavailable. See the trace.</p>
      </Section>
    ),
    spread: spread && (
      <ChartCard title="Forecast rainfall spread" evidence={spread}>
        <ForecastSpread evidence={a.evidence} />
      </ChartCard>
    ),
    ndvi: ndvi && (
      <ChartCard title="Sentinel-2 NDVI / NDMI" evidence={ndvi}>
        <NdviChart evidence={a.evidence} />
      </ChartCard>
    ),
    rain: rain && (
      <ChartCard title="Rain, last 30 days" evidence={rain}>
        <SeriesBars evidence={a.evidence} variable="rain_daily" label="mm/day" />
      </ChartCard>
    ),
    plan: (
      <Section title={s.plan}>
        {a.plan.length === 0 ? (
          <p className="text-sm text-soil-500">No cited actions: no contingency-plan passages matched (or none are indexed for this district).</p>
        ) : (
          <>
            {a.plan_summary && <p className="mb-2 text-sm">{a.plan_summary}</p>}
            <ol className="space-y-2">
              {a.plan.map((x, i) => (
                <li key={x.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-leaf-700 text-[11px] font-bold text-white">
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
          </>
        )}
      </Section>
    ),
    values: (
      <Section title={s.evidence}>
        <ValueTable evidence={a.evidence} />
      </Section>
    ),
    sources: (
      <Section title={s.sources}>
        <table className="w-full text-left text-[11px]">
          <thead className="text-soil-500">
            <tr>
              <th className="py-1 pr-2 font-medium">source</th>
              <th className="pr-2 font-medium">status</th>
              <th className="pr-2 font-medium">fetched</th>
              <th className="font-medium">attribution / request</th>
            </tr>
          </thead>
          <tbody>
            {a.sources.map((p) => (
              <tr key={p.name} className="border-t align-top">
                <td className="py-1 pr-2 font-mono">{p.name}</td>
                <td className="pr-2">
                  <Badge variant="outline" className="text-[10px]">
                    {p.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap pr-2">{when(p.fetched_at)}</td>
                <td className="break-words text-soil-700">
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
          Forecasts sit on a ~25 km grid; field-level detail comes from 10 m satellite pixels. We report yield-risk exposure, not tonnes per
          hectare.
        </p>
      </Section>
    ),
  };
  a.risks.forEach((r) => {
    content[`risk-${r.hazard}`] = <RiskTile risk={r} evidence={a.evidence} s={s} />;
  });

  return (
    <div className="space-y-2">
      <h3 className={SECTION}>{riskHeading(s, a.risks)}</h3>
      <BentoGrid slots={slots}>{content}</BentoGrid>
    </div>
  );
}

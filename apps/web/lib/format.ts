import type { Assessment, Evidence, Language, Risk, Severity } from "@/lib/types";

export const pct = (p: number | null | undefined): string =>
  p === null || p === undefined ? "—" : `${Math.round(p * 100)}%`;

/** Local date and time of an ISO timestamp, for provenance labels. */
export const when = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const HAZARD_LABEL: Record<Risk["hazard"], string> = {
  dry_spell: "Dry spell",
  heavy_rain: "Heavy rain",
  harvest_rain: "Rain at harvest",
};

export const METHOD_NOTE: Record<Risk["method"], string> = {
  ensemble: "share of ensemble members",
  multi_model: "agreement across independent models (not a calibrated probability)",
  deterministic_replay: "archived single forecast run: yes/no, not a probability",
  model: "LightGBM on observed rain (evaluated; ensemble probabilities are the primary signal)",
  climatology: "climatological frequency only (no forecast for this date)",
};

export const SEVERITY_CLASS: Record<Severity, string> = {
  severe: "bg-risk-severe text-white",
  high: "bg-risk-high text-white",
  moderate: "bg-risk-moderate text-white",
  low: "bg-risk-low text-white",
  unknown: "bg-muted text-muted-foreground",
};

/** "Risk for the next N days" with the horizon the forecast really covers (14 live, 10 for a replay). */
export function riskHeading(strings: Record<string, string>, risks: Risk[]): string {
  if (risks.length === 0) return strings.risksNone;
  const days = Math.max(...risks.map((r) => r.horizon_days));
  return strings.risks.replace("{days}", String(days));
}

/** Why an assessment has no risks. Outside the season is a fact about the crop, not an outage. */
export function noRiskReason(a: Pick<Assessment, "crop_status" | "days_after_sowing">): string {
  if (a.crop_status === "past_maturity") {
    return `This crop is past maturity (day ${a.days_after_sowing} after sowing), so there is no forecast risk to assess. To assess a new crop, add the field again with its new sowing date.`;
  }
  if (a.crop_status === "pre_sowing") {
    return `This crop is not sown yet (sowing is ${-a.days_after_sowing} days away) and no growth stage falls inside the forecast window, so there is no forecast risk to assess yet.`;
  }
  return "No risk could be computed: the forecast sources were unavailable. See the trace.";
}

/** The headline risk: highest probability x stage weight. */
export function headline(risks: Risk[]): Risk | null {
  const scored = risks.filter((r) => r.probability !== null);
  if (scored.length === 0) return null;
  return scored.reduce((a, b) =>
    (a.probability ?? 0) * a.stage_weight >= (b.probability ?? 0) * b.stage_weight ? a : b,
  );
}

/** Join several evidence series into chart rows keyed by date. */
export function joinSeries(
  evidence: Evidence[],
  variables: string[],
): Array<Record<string, number | string>> {
  const rows = new Map<string, Record<string, number | string>>();
  for (const variable of variables) {
    const item = evidence.find((e) => e.variable === variable && e.series);
    for (const point of item?.series ?? []) {
      const day = point.ts.slice(0, 10);
      const row = rows.get(day) ?? { date: day };
      row[variable] = point.value;
      rows.set(day, row);
    }
  }
  return Array.from(rows.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export const STRINGS: Record<Language, Record<string, string>> = {
  en: {
    tagline: "Field-level early warning for dry spells and damaging rain",
    risks: "Risk for the next {days} days",
    risksNone: "Risk outlook",
    plan: "Action plan",
    evidence: "Evidence",
    sources: "Data provenance",
    chance: "chance",
    usual: "usual for this window",
    assess: "Assess risk",
    timeMachine: "Time Machine (as of)",
  },
  hi: {
    tagline: "सूखे और नुकसानदेह बारिश की खेत-स्तर पर अग्रिम चेतावनी",
    risks: "अगले {days} दिनों का जोखिम",
    risksNone: "जोखिम का पूर्वानुमान",
    plan: "कार्य योजना",
    evidence: "प्रमाण",
    sources: "डेटा स्रोत",
    chance: "संभावना",
    usual: "इस समय सामान्यतः",
    assess: "जोखिम जाँचें",
    timeMachine: "टाइम मशीन (तारीख)",
  },
  pa: {
    tagline: "ਸੋਕੇ ਅਤੇ ਨੁਕਸਾਨਦੇਹ ਮੀਂਹ ਦੀ ਖੇਤ-ਪੱਧਰ ਅਗਾਊਂ ਚੇਤਾਵਨੀ",
    risks: "ਅਗਲੇ {days} ਦਿਨਾਂ ਦਾ ਜੋਖਮ",
    risksNone: "ਜੋਖਮ ਦਾ ਅਨੁਮਾਨ",
    plan: "ਕਾਰਜ ਯੋਜਨਾ",
    evidence: "ਸਬੂਤ",
    sources: "ਡਾਟਾ ਸਰੋਤ",
    chance: "ਸੰਭਾਵਨਾ",
    usual: "ਇਸ ਸਮੇਂ ਆਮ ਤੌਰ ਤੇ",
    assess: "ਜੋਖਮ ਜਾਂਚੋ",
    timeMachine: "ਟਾਈਮ ਮਸ਼ੀਨ (ਤਾਰੀਖ)",
  },
};

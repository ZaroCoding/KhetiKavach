import { describe, expect, it } from "vitest";

import { STRINGS, headline, joinSeries, pct, riskHeading } from "@/lib/format";
import type { Evidence, Risk } from "@/lib/types";

// Hand-built test inputs (CLAUDE.md rule 1); they never reach app code.
const testRisk = (hazard: Risk["hazard"], probability: number | null, stage_weight: number): Risk => ({
  hazard,
  probability,
  probability_ci90: null,
  climatology_probability: null,
  severity: "low",
  threshold: { description: "test", value: 1, unit: "mm" },
  horizon_days: 15,
  crop_stage: "flowering",
  stage_weight,
  method: "ensemble",
  members: null,
  driver_ids: [],
  explanation: [],
  window: null,
  uncertainty_note: null,
});

describe("format helpers", () => {
  it("formats probabilities", () => {
    expect(pct(0.333)).toBe("33%");
    expect(pct(null)).toBe("—");
  });

  it("picks the headline by probability x stage weight", () => {
    const top = headline([testRisk("dry_spell", 0.6, 0.2), testRisk("heavy_rain", 0.3, 1)]);
    expect(top?.hazard).toBe("heavy_rain");
    expect(headline([testRisk("dry_spell", null, 1)])).toBeNull();
  });

  it("titles the risk section with the horizon the forecast covers, in every language", () => {
    const replay = { ...testRisk("harvest_rain", 1, 1), horizon_days: 10 };
    expect(riskHeading(STRINGS.en, [replay])).toBe("Risk for the next 10 days");
    expect(riskHeading(STRINGS.hi, [replay])).toBe("अगले 10 दिनों का जोखिम");
    expect(riskHeading(STRINGS.pa, [testRisk("dry_spell", 0.5, 1), replay])).toBe("ਅਗਲੇ 15 ਦਿਨਾਂ ਦਾ ਜੋਖਮ");
    expect(riskHeading(STRINGS.en, [])).toBe("Risk outlook"); // no risk: no horizon to claim
  });

  it("joins evidence series by date", () => {
    const series = (variable: string, value: number): Evidence => ({
      id: variable,
      variable,
      value: null,
      series: [{ ts: "2026-11-01T00:00:00Z", value }],
      unit: "mm/day",
      source: "open_meteo_ensemble",
      source_url: null,
      fetched_at: "2026-11-01T00:00:00Z",
      status: "live",
    });
    const rows = joinSeries([series("precip_p10", 1), series("precip_p90", 9)], ["precip_p10", "precip_p90"]);
    expect(rows).toEqual([{ date: "2026-11-01", precip_p10: 1, precip_p90: 9 }]);
  });
});

"use client";

import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { joinSeries } from "@/lib/format";
import type { Evidence } from "@/lib/types";

const axis = { fontSize: 10, fill: "#8a7356" };
const short = (d: string) => d.slice(5);

/** Forecast spread: p10–p90 band, median, share of rainy members, optional "what actually fell". */
export function ForecastSpread({ evidence }: { evidence: Evidence[] }) {
  const rows = joinSeries(evidence, ["precip_p10", "precip_p50", "precip_p90", "wet_member_share", "observed_precip_after"]).map(
    (r) => ({ ...r, band: [r.precip_p10, r.precip_p90] }) as Record<string, unknown>,
  );
  const observed = rows.some((r) => r.observed_precip_after !== undefined);
  if (rows.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#f1ebe0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={short} tick={axis} />
        <YAxis yAxisId="mm" tick={axis} />
        <YAxis yAxisId="share" orientation="right" domain={[0, 1]} hide />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="share" dataKey="wet_member_share" name="share of members ≥2.5 mm" fill="#2f6690" opacity={0.18} />
        <Area yAxisId="mm" dataKey="band" name="p10–p90 mm/day" stroke="none" fill="#2f6690" fillOpacity={0.25} />
        <Line yAxisId="mm" dataKey="precip_p50" name="median mm/day" stroke="#2f6690" dot={false} strokeWidth={2} />
        {observed && (
          <Line yAxisId="mm" dataKey="observed_precip_after" name="what actually fell" stroke="#b3361f" strokeDasharray="4 3" dot />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function NdviChart({ evidence }: { evidence: Evidence[] }) {
  const rows = joinSeries(evidence, ["ndvi", "ndmi", "ndvi_hist_median"]);
  if (rows.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#f1ebe0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={short} tick={axis} />
        <YAxis domain={[-0.1, 1]} tick={axis} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line dataKey="ndvi_hist_median" name="this field, 2017+ median" stroke="#8a7356" strokeDasharray="4 3" dot={false} connectNulls />
        <Line dataKey="ndvi" name="NDVI this season" stroke="#3f7d4e" strokeWidth={2} />
        <Line dataKey="ndmi" name="NDMI (canopy water)" stroke="#2f6690" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SeriesBars({ evidence, variable, label }: { evidence: Evidence[]; variable: string; label: string }) {
  const rows = joinSeries(evidence, [variable]);
  if (rows.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={130}>
      <ComposedChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="date" tickFormatter={short} tick={axis} />
        <YAxis tick={axis} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Bar dataKey={variable} name={label} fill="#2f6690" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useEffect, useRef } from "react";

import type { StepData, TraceEvent } from "@/lib/types";

const STYLE: Record<TraceEvent["event"], { dot: string; label: string }> = {
  node_started: { dot: "bg-sky-600", label: "step" },
  tool_result: { dot: "bg-leaf-500", label: "tool" },
  gate_failed: { dot: "bg-risk-moderate", label: "gate" },
  fallback_used: { dot: "bg-amber-500", label: "fallback" },
  verifier_rejected: { dot: "bg-risk-high", label: "verifier" },
  done: { dot: "bg-leaf-700", label: "done" },
  error: { dot: "bg-risk-high", label: "error" },
};

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function summarise(summary: unknown): string {
  if (!summary || typeof summary !== "object") return "ok";
  const s = summary as Record<string, unknown>;
  if ("members" in s) return `${text(s.members)} members × ${text(s.days)} days (${text(s.model)})`;
  if ("observations" in s) return `${text(s.observations)} observations`;
  return (
    Object.entries(s)
      .filter(([, v]) => v !== null)
      .slice(0, 3)
      .map(([k, v]) => `${k}=${text(v).slice(0, 24)}`)
      .join(", ") || "ok"
  );
}

function describe(e: TraceEvent): string {
  if (e.event === "done") return `finished: ${text((e.data as Record<string, unknown>).status)}`;
  if (e.event === "error") return `error: ${text((e.data as Record<string, unknown>).message)}`;
  const step = e.data as StepData;
  const d = step.detail ?? {};
  switch (e.event) {
    case "tool_result":
      return step.status === "failed"
        ? `${text(step.tool)} failed: ${text(d.error)}`
        : `${text(step.tool)} → ${summarise(d.summary)}${d.freshness === "cached" ? " (cached)" : ""}${d.note ? `: ${text(d.note)}` : ""}`;
    case "gate_failed":
      return `${text(step.tool ?? e.node)} [${text(d.check)}]: ${text(d.reason)}`;
    case "fallback_used":
      return `${text(d.from_source)} → ${text(d.to_source)}${d.message ? `: ${text(d.message)}` : ""}`;
    case "verifier_rejected":
      return `draft ${text(d.attempt)} rejected, ${text(d.item)}: ${text(d.reason)}`;
    default:
      return `${text(e.node)}: ${text(d.message)}`;
  }
}

export default function AgentTrace({ events, running }: { events: TraceEvent[]; running: boolean }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-soil-500">Agent trace</span>
        {running && (
          <span className="flex items-center gap-1.5 text-xs text-sky-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-600" />
            live
          </span>
        )}
      </div>
      <ol ref={list} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2 font-mono text-[11.5px] leading-snug">
        {events.length === 0 && (
          <li className="text-soil-500">Press “Assess risk” to watch the agent plan, call tools, check quality and verify its plan.</li>
        )}
        {events.map((e) => {
          const style = STYLE[e.event];
          const step = e.data as StepData;
          const failed = e.event === "verifier_rejected" || e.event === "error" || step.status === "failed";
          return (
            <li key={e.seq} className="trace-enter flex gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              <span className="w-14 shrink-0 text-soil-500">{style.label}</span>
              <span className={`flex-1 ${failed ? "text-risk-high" : ""}`}>
                {describe(e)}
                {typeof step.latency_ms === "number" && <span className="text-soil-500"> · {step.latency_ms} ms</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

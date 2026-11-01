"use client";

import { useCallback, useEffect, useState } from "react";

import { AsyncContainer } from "@/components/loading/async-container";
import { Skeleton } from "@/components/loading/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, apiBaseUrl, fetchHealth } from "@/lib/api";
import { failure, loading, type AsyncState } from "@/lib/async";
import { when } from "@/lib/format";
import type { District, Health, SourceHealth } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Reading<T> {
  data: T;
  checkedAt: string;
}

const DOT: Record<SourceHealth["status"], string> = {
  ok: "bg-leaf-500",
  degraded: "bg-risk-moderate",
  down: "bg-risk-high",
  unknown: "bg-soil-200",
};

function Dot({ status }: { status: SourceHealth["status"] }) {
  return <span className={cn("inline-block size-2 rounded-full", DOT[status])} aria-hidden="true" />;
}

const unavailable = (e: unknown) => failure(new Error(`unavailable (${e instanceof Error ? e.message : String(e)})`));

function Row({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-soil-500">{name}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function ApiCard({ state, retry }: { state: AsyncState<Reading<Health>>; retry: () => void }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>API and model</CardTitle>
      </CardHeader>
      <CardContent>
        <AsyncContainer state={state} onRetry={retry} loading={<Skeleton lines={4} />}>
          {({ data: h, checkedAt }) => (
            <div className="space-y-3">
              <dl className="space-y-1">
                <Row name="Status" value={h.status} />
                <Row name="Version" value={h.version} />
                <Row name="Database" value={h.db.status === "ok" ? `ok (${h.db.latency_ms ?? "?"} ms)` : "down"} />
                <Row name="Dry-spell model" value={h.model_version ?? "not loaded"} />
                <Row
                  name="Assessment time (last 10)"
                  value={h.latency.p50_ms === null ? "no runs yet" : `p50 ${h.latency.p50_ms} ms, p95 ${h.latency.p95_ms ?? "?"} ms`}
                />
              </dl>
              <p className="font-mono text-[10px] text-soil-500">GET /health · live · {when(checkedAt)}</p>
            </div>
          )}
        </AsyncContainer>
      </CardContent>
    </Card>
  );
}

function SourcesCard({ state, retry }: { state: AsyncState<Reading<Health>>; retry: () => void }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Data sources the API has called</CardTitle>
      </CardHeader>
      <CardContent>
        <AsyncContainer state={state} onRetry={retry} loading={<Skeleton lines={4} />}>
          {({ data: h }) => {
            const all = Object.entries(h.sources) as [string, SourceHealth][];
            const seen = all.filter(([, v]) => v.status !== "unknown" || v.disabled);
            return (
              <div className="space-y-2">
                {seen.length === 0 ? (
                  <p className="text-sm text-soil-500">No upstream call recorded yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {seen.map(([name, v]) => (
                      <li key={name} className="flex items-center gap-2 text-sm">
                        <Dot status={v.status} />
                        <span className="flex-1 font-mono text-xs">{name}</span>
                        <span className="text-xs text-soil-500">
                          {v.disabled ? "disabled" : v.status}
                          {v.last_latency_ms !== null && ` · ${v.last_latency_ms} ms`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-soil-500">
                  {all.length - seen.length} of {all.length} known sources have not been called yet.
                </p>
              </div>
            );
          }}
        </AsyncContainer>
      </CardContent>
    </Card>
  );
}

function DistrictsCard({ state, retry }: { state: AsyncState<Reading<District[]>>; retry: () => void }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Demo districts</CardTitle>
      </CardHeader>
      <CardContent>
        <AsyncContainer state={state} onRetry={retry} loading={<Skeleton lines={4} />}>
          {({ data: districts, checkedAt }) => (
            <div className="space-y-3">
              <ul className="space-y-2">
                {districts.map((d) => (
                  <li key={d.code} className="text-sm">
                    <div className="font-medium">
                      {d.name}, {d.state}
                    </div>
                    <div className="text-xs text-soil-500">
                      {d.plan_chunks} indexed passages from the {d.plan_year} CRIDA plan ·{" "}
                      {d.bbox ? `boundary from ${d.bbox_source}` : "boundary unavailable"}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="font-mono text-[10px] text-soil-500">GET /api/districts · live · {when(checkedAt)}</p>
            </div>
          )}
        </AsyncContainer>
      </CardContent>
    </Card>
  );
}

/** Live readings from our own API. Anything it cannot answer shows as unavailable. */
export default function LiveStatus() {
  const [health, setHealth] = useState<AsyncState<Reading<Health>>>(loading);
  const [districts, setDistricts] = useState<AsyncState<Reading<District[]>>>(loading);
  const [docsUrl, setDocsUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    setHealth(loading);
    setDistricts(loading);
    fetchHealth()
      .then((data) => setHealth({ status: "success", data: { data, checkedAt: new Date().toISOString() } }))
      .catch((e: unknown) => setHealth(unavailable(e)));
    api
      .districts()
      .then((data) => setDistricts({ status: "success", data: { data, checkedAt: new Date().toISOString() } }))
      .catch((e: unknown) => setDistricts(unavailable(e)));
  }, []);

  useEffect(() => {
    load();
    try {
      setDocsUrl(`${apiBaseUrl()}/docs`);
    } catch {
      setDocsUrl(null);
    }
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-3">
        <ApiCard state={health} retry={load} />
        <SourcesCard state={health} retry={load} />
        <DistrictsCard state={districts} retry={load} />
      </div>
      {docsUrl && (
        <p className="text-center text-xs text-soil-500">
          Read straight from the running API.{" "}
          <a className="text-sky-600 underline" href={docsUrl} target="_blank" rel="noreferrer">
            Interactive API docs
          </a>
        </p>
      )}
    </div>
  );
}

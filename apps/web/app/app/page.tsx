"use client";

import { Gauge, History, MapPinned, PanelBottomOpen, ShieldCheck, Sprout } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import AgentTrace from "@/components/AgentTrace";
import type { MapTarget } from "@/components/FieldMap";
import { SplitView } from "@/components/layouts/split-view";
import { Skeleton } from "@/components/loading/skeleton";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { SidebarNav, type NavItem } from "@/components/navigation/sidebar-nav";
import RiskCard from "@/components/RiskCard";
import { AdminPanel, AssessPanel, FieldList, NewFieldForm, TimeMachinePanel } from "@/components/SidePanels";
import { DashboardShell } from "@/components/shells/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, streamTrace } from "@/lib/api";
import { failure, loading, type AsyncState } from "@/lib/async";
import { STRINGS, headline } from "@/lib/format";
import type { Assessment, District, Field, GeoJSONPolygon, Language, Severity, TraceEvent } from "@/lib/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

// MapLibre touches `window`, so the map renders client-side only.
const FieldMap = dynamic(() => import("@/components/FieldMap"), { ssr: false });

type PanelId = "fields" | "assess" | "time-machine" | "admin";

const PANELS: { id: PanelId; label: string; icon: ReactNode }[] = [
  { id: "fields", label: "Fields", icon: <MapPinned /> },
  { id: "assess", label: "Assess", icon: <Gauge /> },
  { id: "time-machine", label: "Time Machine", icon: <History /> },
  { id: "admin", label: "Admin", icon: <ShieldCheck /> },
];

const LANGUAGES: Record<Language, string> = { en: "English", hi: "हिन्दी", pa: "ਪੰਜਾਬੀ" };

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-52" />
      <Skeleton lines={4} />
    </div>
  );
}

export default function Workspace() {
  const [lang, setLang] = useState<Language>("en");
  const s = STRINGS[lang];
  const [districts, setDistricts] = useState<AsyncState<District[]>>(loading);
  const [fieldsState, setFieldsState] = useState<AsyncState<Field[]>>(loading);
  const [levels, setLevels] = useState<Record<string, Severity>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<GeoJSONPolygon | null>(null);
  const [target, setTarget] = useState<MapTarget | null>(null);
  const [asOf, setAsOf] = useState("");
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [runFailed, setRunFailed] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [panel, setPanel] = useState<PanelId>("fields");
  const [sheetOpen, setSheetOpen] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const results = useRef<HTMLDivElement>(null);
  const desktop = useMediaQuery("(min-width: 1024px)");

  const fields = fieldsState.status === "success" ? fieldsState.data : [];
  const field = fields.find((f) => f.id === selected) ?? null;

  const loadFields = useCallback(() => {
    setFieldsState(loading);
    api
      .listFields()
      .then((data) => setFieldsState({ status: "success", data }))
      .catch((e: Error) => {
        setFieldsState(failure(e));
        toast.error(e.message);
      });
  }, []);

  useEffect(() => {
    loadFields();
    api
      .districts()
      .then((data) => setDistricts({ status: "success", data }))
      .catch((e: Error) => {
        setDistricts(failure(e));
        toast.error(e.message);
      });
    return () => stop.current?.();
  }, [loadFields]);

  useEffect(() => {
    if (assessment) results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [assessment]);

  const assess = async () => {
    if (!field) return;
    stop.current?.();
    setEvents([]);
    setAssessment(null);
    setRunFailed(false);
    setRunning(true);
    setSheetOpen(false);
    try {
      const { assessment_id } = await api.startAssessment(field.id, lang, asOf || undefined);
      stop.current = streamTrace(
        assessment_id,
        (e) => setEvents((prev) => [...prev, e]),
        async () => {
          setRunning(false);
          setLoadingResult(true);
          try {
            const result = await api.getAssessment(assessment_id);
            if (result.status !== "completed" && result.status !== "completed_degraded") {
              setRunFailed(true);
              return;
            }
            setAssessment(result);
            const top = headline(result.risks);
            if (top && result.mode === "live") setLevels((prev) => ({ ...prev, [field.id]: top.severity }));
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setLoadingResult(false);
          }
        },
      );
    } catch (e) {
      setRunning(false);
      toast.error((e as Error).message);
    }
  };

  const select = (id: PanelId) => {
    setPanel(id);
    if (desktop === false) setSheetOpen(true);
  };

  const nav: NavItem[] = PANELS.map((p) => ({ ...p, active: panel === p.id, onSelect: () => select(p.id) }));

  const panelBody = (() => {
    switch (panel) {
      case "fields":
        return (
          <>
            <NewFieldForm
              polygon={polygon}
              districts={districts}
              onGo={setTarget}
              onCreated={(f) => {
                setFieldsState({ status: "success", data: [f, ...fields] });
                setSelected(f.id);
                setPolygon(null);
              }}
            />
            <FieldList fields={fieldsState} selectedId={selected} onSelect={setSelected} onRetry={loadFields} />
          </>
        );
      case "assess":
        return <AssessPanel field={field} asOf={asOf} running={running} onAssess={assess} onChangeDate={() => select("time-machine")} s={s} />;
      case "time-machine":
        return <TimeMachinePanel field={field} asOf={asOf} setAsOf={setAsOf} running={running} onAssess={assess} s={s} />;
      case "admin":
        return <AdminPanel />;
    }
  })();

  const resultsBody = (
    <div ref={results} className="scroll-mt-3">
      {assessment ? (
        <RiskCard a={assessment} s={s} />
      ) : running || loadingResult ? (
        <ResultsSkeleton />
      ) : runFailed ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p>This assessment did not finish, so there is no result to show. The trace says what happened.</p>
          <Button size="sm" variant="outline" onClick={assess}>
            Run it again
          </Button>
        </div>
      ) : null}
    </div>
  );

  const map = (
    <FieldMap
      fields={fields}
      levels={levels}
      districts={districts.status === "success" ? districts.data : []}
      selectedId={selected}
      drawn={polygon}
      target={target}
      onSelect={setSelected}
      onDrawn={setPolygon}
    />
  );
  const trace = <AgentTrace events={events} running={running} />;

  const activeLabel = PANELS.find((p) => p.id === panel)?.label ?? "";

  return (
    <DashboardShell>
      <DashboardShell.Header>
        <MobileNav items={nav} title="KhetKavach" className="lg:hidden" />
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-leaf-700">
          <Sprout className="size-5" />
          KhetKavach
        </Link>
        <span className="ml-2 hidden truncate text-sm text-soil-500 xl:inline">{s.tagline}</span>
        <div className="ml-auto flex items-center gap-1 text-sm" role="group" aria-label="Language">
          {(Object.keys(LANGUAGES) as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={cn("rounded px-2 py-1", lang === l ? "bg-soil-900 text-white" : "hover:bg-soil-100")}
            >
              {LANGUAGES[l]}
            </button>
          ))}
        </div>
      </DashboardShell.Header>

      <DashboardShell.Sidebar>
        <div className="space-y-3 p-3">
          <SidebarNav items={nav} ariaLabel="Workspace panels" />
          <Separator />
          <p className="px-1 text-[11px] leading-snug text-soil-500">
            Every number carries its source, status and fetch time. A source that cannot answer shows as unavailable; nothing is filled in.
          </p>
        </div>
      </DashboardShell.Sidebar>

      <DashboardShell.Main>
        {desktop === null ? (
          <div className="p-3" aria-busy="true">
            <Skeleton className="h-[60vh]" />
          </div>
        ) : desktop ? (
          <SplitView
            panels={[
              { id: "workspace", label: "Map and agent trace", defaultSize: 52, minSize: 30 },
              { id: "panels", label: "Panels and results", defaultSize: 48, minSize: 28 },
            ]}
          >
            <SplitView
              direction="vertical"
              panels={[
                { id: "map", label: "Map", defaultSize: 70, minSize: 30 },
                { id: "trace", label: "Agent trace", defaultSize: 30, minSize: 12 },
              ]}
            >
              <div className="h-full p-2 pb-1 pr-1">
                <div className="h-full overflow-hidden rounded-lg">{map}</div>
              </div>
              <div className="h-full p-2 pt-1 pr-1">{trace}</div>
            </SplitView>
            <div className="h-full overflow-y-auto">
              <div className="space-y-3 p-3">
                {panelBody}
                {resultsBody}
              </div>
            </div>
          </SplitView>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="h-[52dvh] p-2">
              <div className="h-full overflow-hidden rounded-lg">{map}</div>
            </div>
            <div className="h-[34dvh] p-2 pt-0">{trace}</div>
            <div className="p-2 pb-24">{resultsBody}</div>
            <Button className="fixed right-4 bottom-4 z-30 h-11 rounded-full px-4 shadow-lg" onClick={() => setSheetOpen(true)}>
              <PanelBottomOpen /> {activeLabel}
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>{activeLabel}</SheetTitle>
                  <SheetDescription className="sr-only">Workspace panel</SheetDescription>
                </SheetHeader>
                <div className="space-y-3 overflow-y-auto p-4 pt-2">{panelBody}</div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </DashboardShell.Main>
    </DashboardShell>
  );
}

"use client";

import { Children, Fragment, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SplitPanelConfig {
  id: string;
  label: string;
  /** Initial share of the container, in percent. All panels together must add up to 100. */
  defaultSize: number;
  /** Smallest share the user can drag this panel to, in percent. */
  minSize: number;
}

interface SplitViewProps {
  direction?: "horizontal" | "vertical";
  panels: SplitPanelConfig[];
  /** One child per panel, in order. */
  children: ReactNode;
  className?: string;
}

const KEY_STEP = 2;

/** Move the boundary after panel `index` so that panel is `size` percent, keeping both neighbours >= min. */
function resize(sizes: number[], index: number, size: number, panels: SplitPanelConfig[]): number[] {
  const total = sizes[index] + sizes[index + 1];
  const clamped = Math.min(Math.max(size, panels[index].minSize), total - panels[index + 1].minSize);
  const next = [...sizes];
  next[index] = clamped;
  next[index + 1] = total - clamped;
  return next;
}

/** Resizable panels that share the container in percent, so a window resize keeps the proportions. */
export function SplitView({ direction = "horizontal", panels, children, className }: SplitViewProps) {
  const items = Children.toArray(children);
  const [sizes, setSizes] = useState(() => panels.map((p) => p.defaultSize));
  const container = useRef<HTMLDivElement>(null);
  const horizontal = direction === "horizontal";

  const drag = (index: number) => (event: PointerEvent<HTMLDivElement>) => {
    const el = container.current;
    if (!el) return;
    event.preventDefault();
    const rect = el.getBoundingClientRect();
    const extent = horizontal ? rect.width : rect.height;
    const origin = horizontal ? rect.left : rect.top;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (e: globalThis.PointerEvent) => {
      const pct = (((horizontal ? e.clientX : e.clientY) - origin) / extent) * 100;
      setSizes((prev) => resize(prev, index, pct - prev.slice(0, index).reduce((a, b) => a + b, 0), panels));
    };
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  };

  const keyboard = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    const back = horizontal ? "ArrowLeft" : "ArrowUp";
    const forward = horizontal ? "ArrowRight" : "ArrowDown";
    if (event.key !== back && event.key !== forward) return;
    event.preventDefault();
    const delta = event.key === forward ? KEY_STEP : -KEY_STEP;
    setSizes((prev) => resize(prev, index, prev[index] + delta, panels));
  };

  return (
    <div ref={container} className={cn("flex h-full w-full min-h-0 min-w-0", horizontal ? "flex-row" : "flex-col", className)}>
      {panels.map((panel, i) => (
        <Fragment key={panel.id}>
          <section
            aria-label={panel.label}
            className="min-h-0 min-w-0 overflow-hidden"
            style={{ flex: `${sizes[i]} 1 0%` }}
          >
            {items[i]}
          </section>
          {i < panels.length - 1 && (
            <div
              role="separator"
              tabIndex={0}
              aria-label={`Resize ${panel.label}`}
              aria-orientation={horizontal ? "vertical" : "horizontal"}
              aria-valuenow={Math.round(sizes[i])}
              aria-valuemin={panel.minSize}
              aria-valuemax={100 - panels[i + 1].minSize}
              onPointerDown={drag(i)}
              onKeyDown={keyboard(i)}
              className={cn(
                "group relative flex shrink-0 touch-none items-center justify-center bg-border outline-none transition-colors hover:bg-primary/30 focus-visible:bg-primary/40",
                horizontal ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize",
              )}
            >
              <span className={cn("rounded-full bg-primary/50", horizontal ? "h-8 w-0.5" : "h-0.5 w-8")} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

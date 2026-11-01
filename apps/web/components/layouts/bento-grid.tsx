import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BentoSlotConfig {
  id: string;
  /** Columns of the 12-column grid this slot spans once the grid itself is wide enough. */
  cols: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12;
  className?: string;
}

// Static class names so Tailwind can see them. The breakpoint is a *container* query: the grid sits
// in a resizable panel, so the viewport width says nothing about the room it has.
const SPAN: Record<BentoSlotConfig["cols"], string> = {
  3: "@lg:col-span-3",
  4: "@lg:col-span-4",
  5: "@lg:col-span-5",
  6: "@lg:col-span-6",
  7: "@lg:col-span-7",
  8: "@lg:col-span-8",
  9: "@lg:col-span-9",
  12: "@lg:col-span-12",
};

interface BentoGridProps {
  slots: BentoSlotConfig[];
  /** Content by slot id. A slot with no content is not rendered. */
  children: Record<string, ReactNode>;
  className?: string;
}

/** Asymmetric 12-column grid. Slots stack full-width below ~32rem of container width. */
export function BentoGrid({ slots, children, className }: BentoGridProps) {
  return (
    <div className={cn("@container w-full", className)}>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-12">
        {slots.map((slot) =>
          children[slot.id] ? (
            <div key={slot.id} data-slot={slot.id} className={cn("min-w-0", SPAN[slot.cols], slot.className)}>
              {children[slot.id]}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

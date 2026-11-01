/**
 * SplitLayout component
 * Two-panel layout with configurable split ratios
 */

import { cn } from "@/lib/layouts/utils"
import type { SplitLayoutProps, SplitRatio } from "./types"

function getRatioPercentages(ratio: SplitRatio = "50-50"): [number, number] {
  const ratios: Record<SplitRatio, [number, number]> = {
    "50-50": [50, 50],
    "60-40": [60, 40],
    "40-60": [40, 60],
    "70-30": [70, 30],
    "30-70": [30, 70],
    "66-33": [66.666, 33.333],
    "33-66": [33.333, 66.666],
  }

  return ratios[ratio]
}

export function SplitLayout({ config, children, className }: SplitLayoutProps) {
  const { ratio = "50-50", direction = "horizontal", gap = 4, stackOnMobile = true } = config

  const [leftPercent, rightPercent] = getRatioPercentages(ratio)

  const isHorizontal = direction === "horizontal"

  return (
    <div
      className={cn(
        "flex w-full",
        isHorizontal ? "flex-row" : "flex-col",
        stackOnMobile && isHorizontal && "flex-col lg:flex-row",
        config.className,
        className,
      )}
      style={{ gap: gap > 0 ? `${gap * 0.25}rem` : undefined }}
      role="region"
      aria-label={config.name || "Split layout"}
    >
      <div
        className={cn("flex-shrink-0", stackOnMobile && isHorizontal && "w-full lg:w-auto")}
        style={{
          [isHorizontal ? "width" : "height"]: stackOnMobile && isHorizontal ? undefined : `${leftPercent}%`,
        }}
      >
        {children.left}
      </div>

      <div
        className={cn("flex-shrink-0", stackOnMobile && isHorizontal && "w-full lg:w-auto")}
        style={{
          [isHorizontal ? "width" : "height"]: stackOnMobile && isHorizontal ? undefined : `${rightPercent}%`,
        }}
      >
        {children.right}
      </div>
    </div>
  )
}

"use client"

import { cn } from "@/lib/layouts/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import type { PanelProps } from "./types"

export function Panel({ config, children, size, collapsed, onToggleCollapse, className }: PanelProps) {
  const { id, position, minSize = 200, label, collapsible } = config

  const isVertical = position === "top" || position === "bottom"

  // Determine collapse icon based on position
  const CollapseIcon = collapsed
    ? position === "left"
      ? ChevronRight
      : position === "right"
        ? ChevronLeft
        : position === "top"
          ? ChevronDown
          : ChevronUp
    : position === "left"
      ? ChevronLeft
      : position === "right"
        ? ChevronRight
        : position === "top"
          ? ChevronUp
          : ChevronDown

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden bg-background transition-all",
        collapsed && "flex-shrink-0",
        className,
      )}
      style={{
        [isVertical ? "height" : "width"]: collapsed ? "auto" : `${size}px`,
        minWidth: !collapsed && !isVertical ? `${minSize}px` : undefined,
        minHeight: !collapsed && isVertical ? `${minSize}px` : undefined,
      }}
      role="region"
      aria-label={label || `Panel ${id}`}
      aria-expanded={!collapsed}
    >
      {collapsible && onToggleCollapse && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute z-10 h-6 w-6",
            position === "left" && "right-2 top-2",
            position === "right" && "left-2 top-2",
            position === "top" && "bottom-2 right-2",
            position === "bottom" && "right-2 top-2",
          )}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        >
          <CollapseIcon className="h-4 w-4" />
        </Button>
      )}

      {collapsed ? (
        <div className="flex h-full items-center justify-center p-2">
          <span className="text-xs text-muted-foreground">{label || id}</span>
        </div>
      ) : (
        <div className="h-full w-full overflow-auto">{children}</div>
      )}
    </div>
  )
}

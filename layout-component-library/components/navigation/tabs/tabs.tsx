/**
 * Tabs component
 * Horizontal or vertical tab navigation
 */

"use client"

import { cn } from "@/lib/layouts/utils"
import type { TabConfig } from "@/lib/navigation/types"

export interface TabsProps {
  config: TabConfig
  className?: string
}

export function Tabs({ config, className }: TabsProps) {
  const {
    items,
    activeTab,
    onTabChange,
    variant = "underline",
    orientation = "horizontal",
    size = "md",
    fullWidth = false,
  } = config

  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-base",
    lg: "h-12 px-5 text-lg",
  }

  const variantClasses = {
    underline: {
      container: "border-b",
      tab: "border-b-2 border-transparent hover:border-muted-foreground",
      active: "border-foreground font-medium",
    },
    pills: {
      container: "gap-1",
      tab: "rounded-full hover:bg-accent",
      active: "bg-accent text-accent-foreground font-medium",
    },
    enclosed: {
      container: "border-b",
      tab: "rounded-t-md border border-transparent hover:border-border",
      active: "border-border border-b-background bg-background font-medium",
    },
    soft: {
      container: "gap-1 bg-muted p-1 rounded-lg",
      tab: "rounded-md hover:bg-background",
      active: "bg-background shadow-sm font-medium",
    },
  }

  const orientationClasses = {
    horizontal: "flex-row",
    vertical: "flex-col",
  }

  const styles = variantClasses[variant]

  return (
    <div
      className={cn("flex", orientationClasses[orientation], styles.container, fullWidth && "w-full", className)}
      role="tablist"
      aria-orientation={orientation}
    >
      {items.map((item) => {
        const isActive = activeTab === item.id

        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 transition-colors",
              sizeClasses[size],
              styles.tab,
              isActive && styles.active,
              item.disabled && "pointer-events-none opacity-50",
              fullWidth && "flex-1",
            )}
            onClick={() => {
              if (!item.disabled) {
                onTabChange?.(item.id)
                item.onClick?.()
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="h-4 w-4">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{item.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

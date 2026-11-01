/**
 * SidebarLayout component
 * Classic application layout with sidebar navigation
 */

"use client"

import { useState } from "react"
import { cn } from "@/lib/layouts/utils"
import type { SidebarLayoutProps, SidebarWidth } from "./types"

function getSidebarWidth(width: SidebarWidth = "standard"): number {
  if (typeof width === "number") return width

  const widths = {
    narrow: 240,
    standard: 280,
    wide: 320,
  }

  return widths[width]
}

export function SidebarLayout({ config, children, className }: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const {
    position = "left",
    width = "standard",
    collapsible = true,
    collapsedWidth = 64,
    mobileBreakpoint = "lg",
    gap = 0,
  } = config

  const sidebarWidth = getSidebarWidth(width)
  const currentWidth = isCollapsed ? collapsedWidth : sidebarWidth

  const breakpointClass = {
    sm: "sm",
    md: "md",
    lg: "lg",
  }[mobileBreakpoint]

  return (
    <div
      className={cn("flex h-screen w-full flex-col", className)}
      style={{ gap: gap > 0 ? `${gap * 0.25}rem` : undefined }}
    >
      {children.header && <header className="flex-shrink-0 border-b">{children.header}</header>}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex-shrink-0 border-r transition-all duration-300",
            `hidden ${breakpointClass}:block`,
            position === "right" && "order-2 border-l border-r-0",
          )}
          style={{ width: `${currentWidth}px` }}
          aria-label="Sidebar navigation"
        >
          <div className="h-full overflow-y-auto">{children.sidebar}</div>

          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute bottom-4 right-4 rounded-md border bg-background p-2 shadow-sm hover:bg-accent"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? "→" : "←"}
            </button>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">{children.main}</main>
      </div>
    </div>
  )
}

/**
 * SidebarNav component
 * Vertical navigation with collapsible sections
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/layouts/utils"
import { isNavGroup } from "@/lib/navigation/utils"
import type { NavConfig } from "@/lib/navigation/types"

export interface SidebarNavProps {
  config: NavConfig
  className?: string
}

export function SidebarNav({ config, className }: SidebarNavProps) {
  const {
    items,
    variant = "sidebar",
    size = "md",
    showIcons = true,
    showBadges = true,
    collapseBehavior = "accordion",
  } = config

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (collapseBehavior === "accordion") {
        next.clear()
      }
      if (prev.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const sizeClasses = {
    sm: "h-8 px-2 text-sm",
    md: "h-10 px-3 text-base",
    lg: "h-12 px-4 text-lg",
  }

  return (
    <nav className={cn("flex flex-col gap-1", className)} role="navigation">
      {items.map((item) => {
        if (isNavGroup(item)) {
          const isExpanded = expandedGroups.has(item.id)
          const hasActiveChild = item.items.some((i) => i.active)

          return (
            <div key={item.id} className="flex flex-col">
              {item.label && (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    hasActiveChild && "text-accent-foreground",
                  )}
                  onClick={() => toggleGroup(item.id)}
                  aria-expanded={isExpanded}
                >
                  <span>{item.label}</span>
                  <svg
                    className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}

              {isExpanded && (
                <div className="ml-2 mt-1 flex flex-col gap-0.5 border-l pl-2">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.id}
                      href={subItem.href || "#"}
                      className={cn(
                        "flex items-center gap-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                        sizeClasses[size],
                        subItem.active && "bg-accent text-accent-foreground font-medium",
                        subItem.disabled && "pointer-events-none opacity-50",
                      )}
                      onClick={subItem.onClick}
                      aria-current={subItem.active ? "page" : undefined}
                    >
                      {showIcons && subItem.icon && <span className="h-4 w-4 flex-shrink-0">{subItem.icon}</span>}
                      <span className="flex-1 truncate">{subItem.label}</span>
                      {showBadges && subItem.badge && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {subItem.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <Link
            key={item.id}
            href={item.href || "#"}
            className={cn(
              "flex items-center gap-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
              sizeClasses[size],
              item.active && "bg-accent text-accent-foreground font-medium",
              item.disabled && "pointer-events-none opacity-50",
            )}
            onClick={item.onClick}
            aria-current={item.active ? "page" : undefined}
          >
            {showIcons && item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
            {showBadges && item.badge && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{item.badge}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

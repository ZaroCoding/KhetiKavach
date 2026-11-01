/**
 * TopNav component
 * Horizontal navigation bar for headers
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/layouts/utils"
import { isNavGroup } from "@/lib/navigation/utils"
import type { NavConfig } from "@/lib/navigation/types"

export interface TopNavProps {
  config: NavConfig
  className?: string
}

export function TopNav({ config, className }: TopNavProps) {
  const { items, variant = "default", size = "md", showIcons = true, showBadges = true } = config

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-base",
    lg: "h-12 px-5 text-lg",
  }

  const variantClasses = {
    default: "hover:bg-accent hover:text-accent-foreground",
    pills: "rounded-full hover:bg-accent hover:text-accent-foreground",
    underline: "border-b-2 border-transparent hover:border-foreground",
    sidebar: "hover:bg-accent",
    minimal: "hover:text-foreground",
  }

  return (
    <nav className={cn("flex items-center gap-1", className)} role="navigation">
      {items.map((item) => {
        if (isNavGroup(item)) {
          return (
            <div key={item.id} className="relative">
              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-md transition-colors",
                  sizeClasses[size],
                  variantClasses[variant],
                  item.items.some((i) => i.active) && "bg-accent text-accent-foreground",
                )}
                onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                aria-expanded={openDropdown === item.id}
                aria-haspopup="true"
              >
                {item.label}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openDropdown === item.id && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-1 shadow-lg">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.id}
                      href={subItem.href || "#"}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                        subItem.active && "bg-accent text-accent-foreground",
                        subItem.disabled && "pointer-events-none opacity-50",
                      )}
                      onClick={() => {
                        setOpenDropdown(null)
                        subItem.onClick?.()
                      }}
                    >
                      {showIcons && subItem.icon && <span className="h-4 w-4">{subItem.icon}</span>}
                      <span className="flex-1">{subItem.label}</span>
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
              "inline-flex items-center gap-2 rounded-md transition-colors",
              sizeClasses[size],
              variantClasses[variant],
              item.active && "bg-accent text-accent-foreground",
              item.disabled && "pointer-events-none opacity-50",
            )}
            onClick={item.onClick}
            aria-current={item.active ? "page" : undefined}
          >
            {showIcons && item.icon && <span className="h-4 w-4">{item.icon}</span>}
            <span>{item.label}</span>
            {showBadges && item.badge && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{item.badge}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

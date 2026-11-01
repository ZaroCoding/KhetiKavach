/**
 * MobileNav component
 * Mobile-optimized navigation with drawer
 */

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/layouts/utils"
import { isNavGroup } from "@/lib/navigation/utils"
import type { MobileNavConfig } from "@/lib/navigation/types"

export interface MobileNavProps {
  config: MobileNavConfig
  trigger?: React.ReactNode
  className?: string
}

export function MobileNav({ config, trigger, className }: MobileNavProps) {
  const {
    items,
    type = "drawer",
    position = "left",
    showOverlay = true,
    closeOnClick = true,
    showIcons = true,
    showBadges = true,
  } = config

  const [isOpen, setIsOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (prev.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const handleItemClick = (onClick?: () => void) => {
    onClick?.()
    if (closeOnClick) {
      setIsOpen(false)
    }
  }

  const drawerClasses = {
    left: "left-0 top-0 h-full w-80 max-w-[85vw]",
    right: "right-0 top-0 h-full w-80 max-w-[85vw]",
    top: "left-0 top-0 h-auto w-full",
    bottom: "bottom-0 left-0 h-auto w-full",
  }

  const slideClasses = {
    left: isOpen ? "translate-x-0" : "-translate-x-full",
    right: isOpen ? "translate-x-0" : "translate-x-full",
    top: isOpen ? "translate-y-0" : "-translate-y-full",
    bottom: isOpen ? "translate-y-0" : "translate-y-full",
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn("inline-flex items-center justify-center", className)}
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        {trigger || (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay */}
      {showOverlay && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed z-50 bg-background shadow-lg transition-transform duration-300",
          drawerClasses[position],
          slideClasses[position],
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button onClick={() => setIsOpen(false)} className="rounded-md p-2 hover:bg-accent" aria-label="Close menu">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-1">
              {items.map((item) => {
                if (isNavGroup(item)) {
                  const isExpanded = expandedGroups.has(item.id)

                  return (
                    <div key={item.id} className="flex flex-col">
                      {item.label && (
                        <button
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                          onClick={() => toggleGroup(item.id)}
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
                        <div className="ml-4 mt-1 flex flex-col gap-0.5">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.id}
                              href={subItem.href || "#"}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                                subItem.active && "bg-accent font-medium",
                                subItem.disabled && "pointer-events-none opacity-50",
                              )}
                              onClick={() => handleItemClick(subItem.onClick)}
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
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                      item.active && "bg-accent font-medium",
                      item.disabled && "pointer-events-none opacity-50",
                    )}
                    onClick={() => handleItemClick(item.onClick)}
                  >
                    {showIcons && item.icon && <span className="h-4 w-4">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {showBadges && item.badge && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}

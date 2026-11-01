/**
 * DashboardShell with compound component pattern
 * Data-heavy interface optimized for metrics and charts
 */

"use client"

import type React from "react"

import { useState } from "react"
import { cn } from "@/lib/layouts/utils"
import { useComposition } from "@/lib/composition/context"

export interface DashboardShellProps {
  children: React.ReactNode
  className?: string
  sidebarWidth?: number
  collapsible?: boolean
  headerHeight?: number
  contentPadding?: "none" | "sm" | "md" | "lg"
  showBreadcrumbs?: boolean
  mobileBreakpoint?: "sm" | "md" | "lg"
}

interface SlotProps {
  children: React.ReactNode
  className?: string
}

interface DashboardShellComposition {
  Header: typeof Header
  Sidebar: typeof Sidebar
  Breadcrumbs: typeof Breadcrumbs
  Main: typeof Main
}

function Header({ children, className }: SlotProps) {
  return <div className={cn("flex-1", className)}>{children}</div>
}

function Sidebar({ children, className }: SlotProps) {
  return <div className={cn("h-full overflow-y-auto p-3", className)}>{children}</div>
}

function Breadcrumbs({ children, className }: SlotProps) {
  return <div className={cn("border-b bg-background px-6 py-3 text-sm", className)}>{children}</div>
}

function Main({ children, className }: SlotProps) {
  return <>{children}</>
}

export function DashboardShellRoot({
  children,
  className,
  sidebarWidth = 240,
  collapsible = true,
  headerHeight = 56,
  contentPadding = "md",
  showBreadcrumbs = true,
  mobileBreakpoint = "lg",
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const composition = useComposition()

  const paddingClass = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[contentPadding]

  const breakpointClass = {
    sm: "sm",
    md: "md",
    lg: "lg",
  }[mobileBreakpoint]

  const childrenArray = Array.isArray(children) ? children : [children]
  const headerContent = childrenArray.find((child: any) => child?.type === Header)
  const sidebarContent = childrenArray.find((child: any) => child?.type === Sidebar)
  const breadcrumbsContent = childrenArray.find((child: any) => child?.type === Breadcrumbs)
  const mainContent = childrenArray.find((child: any) => child?.type === Main)

  return (
    <div className={cn("flex h-screen w-full flex-col overflow-hidden bg-muted/30", className)}>
      {/* Header */}
      {headerContent && (
        <header className="flex-shrink-0 border-b bg-background" style={{ height: `${headerHeight}px` }}>
          <div className="flex h-full items-center gap-4 px-4">
            {collapsible && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn("rounded-md p-1.5 hover:bg-accent", `${breakpointClass}:inline-flex hidden`)}
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            {headerContent.props.children}
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarContent && isSidebarOpen && (
          <aside
            className={cn(
              "flex-shrink-0 border-r bg-background transition-all duration-300",
              `hidden ${breakpointClass}:block`,
            )}
            style={{ width: `${sidebarWidth}px` }}
            aria-label="Dashboard navigation"
          >
            {sidebarContent.props.children}
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {showBreadcrumbs && breadcrumbsContent && breadcrumbsContent.props.children}
          <div className={cn("h-full", paddingClass)}>{mainContent?.props.children}</div>
        </main>
      </div>
    </div>
  )
}

DashboardShellRoot.Header = Header
DashboardShellRoot.Sidebar = Sidebar
DashboardShellRoot.Breadcrumbs = Breadcrumbs
DashboardShellRoot.Main = Main

export const DashboardShell = DashboardShellRoot as typeof DashboardShellRoot & DashboardShellComposition

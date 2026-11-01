/**
 * DocsShell with compound component pattern
 * Documentation layout with table of contents
 */

"use client"

import type React from "react"

import { cn } from "@/lib/layouts/utils"
import { useComposition } from "@/lib/composition/context"

export interface DocsShellProps {
  children: React.ReactNode
  className?: string
  sidebarWidth?: number
  asideWidth?: number
  showAside?: boolean
  headerHeight?: number
  maxContentWidth?: number
  mobileBreakpoint?: "sm" | "md" | "lg"
}

interface SlotProps {
  children: React.ReactNode
  className?: string
}

interface DocsShellComposition {
  Header: typeof Header
  Sidebar: typeof Sidebar
  Main: typeof Main
  Aside: typeof Aside
}

function Header({ children, className }: SlotProps) {
  return <div className={cn("flex h-full items-center px-4", className)}>{children}</div>
}

function Sidebar({ children, className }: SlotProps) {
  return <div className={cn("h-full overflow-y-auto p-6", className)}>{children}</div>
}

function Main({ children, className }: SlotProps) {
  return <>{children}</>
}

function Aside({ children, className }: SlotProps) {
  return <div className={cn("h-full overflow-y-auto p-6", className)}>{children}</div>
}

export function DocsShellRoot({
  children,
  className,
  sidebarWidth = 280,
  asideWidth = 240,
  showAside = true,
  headerHeight = 64,
  maxContentWidth = 800,
  mobileBreakpoint = "lg",
}: DocsShellProps) {
  const composition = useComposition()

  const breakpointClass = {
    sm: "sm",
    md: "md",
    lg: "lg",
  }[mobileBreakpoint]

  const childrenArray = Array.isArray(children) ? children : [children]
  const headerContent = childrenArray.find((child: any) => child?.type === Header)
  const sidebarContent = childrenArray.find((child: any) => child?.type === Sidebar)
  const mainContent = childrenArray.find((child: any) => child?.type === Main)
  const asideContent = childrenArray.find((child: any) => child?.type === Aside)

  return (
    <div className={cn("flex h-screen w-full flex-col overflow-hidden", className)}>
      {/* Header */}
      {headerContent && (
        <header className="flex-shrink-0 border-b bg-background" style={{ height: `${headerHeight}px` }}>
          {headerContent.props.children}
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar (TOC) */}
        {sidebarContent && (
          <aside
            className={cn("flex-shrink-0 border-r bg-background", `hidden ${breakpointClass}:block`)}
            style={{ width: `${sidebarWidth}px` }}
            aria-label="Table of contents"
          >
            {sidebarContent.props.children}
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto px-6 py-8" style={{ maxWidth: `${maxContentWidth}px` }}>
            {mainContent?.props.children}
          </div>
        </main>

        {/* Right sidebar (On this page) */}
        {showAside && asideContent && (
          <aside
            className={cn("flex-shrink-0 border-l bg-background", `hidden xl:block`)}
            style={{ width: `${asideWidth}px` }}
            aria-label="On this page"
          >
            {asideContent.props.children}
          </aside>
        )}
      </div>
    </div>
  )
}

DocsShellRoot.Header = Header
DocsShellRoot.Sidebar = Sidebar
DocsShellRoot.Main = Main
DocsShellRoot.Aside = Aside

export const DocsShell = DocsShellRoot as typeof DocsShellRoot & DocsShellComposition

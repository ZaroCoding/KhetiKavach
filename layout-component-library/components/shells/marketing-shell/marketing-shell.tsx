/**
 * MarketingShell with compound component pattern
 */

"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/layouts/utils"
import type { SlotProps } from "@/lib/composition/types"

export interface MarketingShellCompoundProps {
  children: ReactNode
  className?: string
  headerStyle?: "transparent" | "solid" | "blur"
  headerHeight?: number
  stickyHeader?: boolean
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

interface MarketingShellComposition {
  Nav: typeof Nav
  Hero: typeof Hero
  Main: typeof Main
  Footer: typeof Footer
}

function Nav({ children, className }: SlotProps) {
  return <>{children}</>
}

function Hero({ children, className }: SlotProps) {
  return <>{children}</>
}

function Main({ children, className }: SlotProps) {
  return <>{children}</>
}

function Footer({ children, className }: SlotProps) {
  return <>{children}</>
}

export function MarketingShellCompound({
  children,
  className,
  headerStyle = "solid",
  headerHeight = 64,
  stickyHeader = true,
  maxWidth = "2xl",
}: MarketingShellCompoundProps) {
  const maxWidthClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  }[maxWidth]

  const headerStyleClass = {
    transparent: "bg-transparent",
    solid: "bg-background border-b",
    blur: "bg-background/80 backdrop-blur-sm border-b",
  }[headerStyle]

  // Extract children by type
  const childrenArray = Array.isArray(children) ? children : [children]
  const navContent = childrenArray.find((child: any) => child?.type === Nav)
  const heroContent = childrenArray.find((child: any) => child?.type === Hero)
  const mainContent = childrenArray.find((child: any) => child?.type === Main)
  const footerContent = childrenArray.find((child: any) => child?.type === Footer)

  return (
    <div className={cn("flex min-h-screen w-full flex-col", className)}>
      {/* Header */}
      {navContent && (
        <header
          className={cn(
            "flex-shrink-0 transition-all duration-200",
            headerStyleClass,
            stickyHeader && "sticky top-0 z-50",
          )}
          style={{ height: `${headerHeight}px` }}
        >
          <div className={cn("mx-auto flex h-full items-center px-4", maxWidthClass)}>{navContent.props.children}</div>
        </header>
      )}

      {/* Hero */}
      {heroContent && <section className="flex-shrink-0">{heroContent.props.children}</section>}

      {/* Main content */}
      {mainContent && <main className="flex-1">{mainContent.props.children}</main>}

      {/* Footer */}
      {footerContent && (
        <footer className="flex-shrink-0 border-t bg-muted/30">
          <div className={cn("mx-auto px-4 py-12", maxWidthClass)}>{footerContent.props.children}</div>
        </footer>
      )}
    </div>
  )
}

// Attach compound components
MarketingShellCompound.Nav = Nav
MarketingShellCompound.Hero = Hero
MarketingShellCompound.Main = Main
MarketingShellCompound.Footer = Footer

// Type assertion for compound component
export const MarketingShell = MarketingShellCompound as typeof MarketingShellCompound & MarketingShellComposition

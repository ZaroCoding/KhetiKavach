/**
 * AuthShell with compound component pattern
 * Centered card layout for authentication pages
 */

"use client"

import type React from "react"

import { cn } from "@/lib/layouts/utils"
import { useComposition } from "@/lib/composition/context"

export interface AuthShellProps {
  children: React.ReactNode
  className?: string
  cardWidth?: "sm" | "md" | "lg"
  backgroundStyle?: "solid" | "gradient" | "pattern" | "image"
  showLogo?: boolean
  showFooter?: boolean
  elevation?: "none" | "sm" | "md" | "lg"
}

interface SlotProps {
  children: React.ReactNode
  className?: string
}

interface AuthShellComposition {
  Logo: typeof Logo
  Main: typeof Main
  Footer: typeof Footer
}

function Logo({ children, className }: SlotProps) {
  return <div className={cn("flex justify-center", className)}>{children}</div>
}

function Main({ children, className }: SlotProps) {
  return <>{children}</>
}

function Footer({ children, className }: SlotProps) {
  return <div className={cn("text-center text-sm text-muted-foreground", className)}>{children}</div>
}

export function AuthShellRoot({
  children,
  className,
  cardWidth = "md",
  backgroundStyle = "solid",
  showLogo = true,
  showFooter = true,
  elevation = "md",
}: AuthShellProps) {
  const composition = useComposition()

  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  }[cardWidth]

  const backgroundClass = {
    solid: "bg-muted/30",
    gradient: "bg-gradient-to-br from-muted/50 to-muted/30",
    pattern:
      "bg-muted/30 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.05)_1px,transparent_0)] bg-[length:24px_24px]",
    image: "bg-muted/30",
  }[backgroundStyle]

  const elevationClass = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  }[elevation]

  const childrenArray = Array.isArray(children) ? children : [children]
  const logoContent = childrenArray.find((child: any) => child?.type === Logo)
  const mainContent = childrenArray.find((child: any) => child?.type === Main)
  const footerContent = childrenArray.find((child: any) => child?.type === Footer)

  return (
    <div className={cn("flex min-h-screen w-full items-center justify-center", backgroundClass, className)}>
      <div className={cn("w-full space-y-6 px-4 py-12", widthClass)}>
        {/* Logo */}
        {showLogo && logoContent && logoContent.props.children}

        {/* Main card */}
        {mainContent && (
          <div className={cn("rounded-lg border bg-background p-8", elevationClass)}>{mainContent.props.children}</div>
        )}

        {/* Footer */}
        {showFooter && footerContent && footerContent.props.children}
      </div>
    </div>
  )
}

AuthShellRoot.Logo = Logo
AuthShellRoot.Main = Main
AuthShellRoot.Footer = Footer

export const AuthShell = AuthShellRoot as typeof AuthShellRoot & AuthShellComposition

/**
 * CTA Section Component
 * Call-to-action sections with multiple variants
 */

"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/layouts/utils"
import type { CTAConfig } from "@/lib/sections/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface CTASectionProps extends CTAConfig {
  title: string
  description?: string
  primaryCTA?: {
    label: string
    onClick?: () => void
  }
  secondaryCTA?: {
    label: string
    onClick?: () => void
  }
  showEmailInput?: boolean
  children?: ReactNode
}

export function CTASection({
  title,
  description,
  primaryCTA,
  secondaryCTA,
  showEmailInput = false,
  children,
  variant = "centered",
  size = "md",
  background = "accent",
  padding = "lg",
  maxWidth = "2xl",
  className,
}: CTASectionProps) {
  const paddingClass = {
    none: "",
    sm: "py-12",
    md: "py-16",
    lg: "py-24",
    xl: "py-32",
  }[padding]

  const backgroundClass = {
    default: "bg-background",
    muted: "bg-muted/30",
    accent: "bg-accent/10",
    gradient: "bg-gradient-to-br from-primary/10 via-accent/10 to-background",
  }[background]

  const maxWidthClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  }[maxWidth]

  if (children) {
    return (
      <section className={cn("relative w-full", backgroundClass, paddingClass, className)}>
        <div className={cn("mx-auto px-4", maxWidthClass)}>{children}</div>
      </section>
    )
  }

  return (
    <section className={cn("relative w-full", backgroundClass, paddingClass, className)}>
      <div className={cn("mx-auto px-4", maxWidthClass)}>
        {variant === "centered" && (
          <div className="text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
            {description && (
              <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg text-muted-foreground">{description}</p>
            )}
            {showEmailInput ? (
              <div className="mx-auto flex max-w-md gap-2">
                <Input type="email" placeholder="Enter your email" className="flex-1" />
                <Button onClick={primaryCTA?.onClick}>{primaryCTA?.label || "Subscribe"}</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4">
                {primaryCTA && (
                  <Button size="lg" onClick={primaryCTA.onClick}>
                    {primaryCTA.label}
                  </Button>
                )}
                {secondaryCTA && (
                  <Button size="lg" variant="outline" onClick={secondaryCTA.onClick}>
                    {secondaryCTA.label}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {variant === "split" && (
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
              {description && <p className="text-pretty text-lg text-muted-foreground">{description}</p>}
            </div>
            <div>
              {showEmailInput ? (
                <div className="flex gap-2">
                  <Input type="email" placeholder="Enter your email" className="flex-1" />
                  <Button onClick={primaryCTA?.onClick}>{primaryCTA?.label || "Subscribe"}</Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {primaryCTA && (
                    <Button size="lg" onClick={primaryCTA.onClick}>
                      {primaryCTA.label}
                    </Button>
                  )}
                  {secondaryCTA && (
                    <Button size="lg" variant="outline" onClick={secondaryCTA.onClick}>
                      {secondaryCTA.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {variant === "banner" && (
          <div className="rounded-lg border bg-card p-8 text-center shadow-lg">
            <h2 className="mb-4 text-balance text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
            {description && <p className="mx-auto mb-6 max-w-2xl text-pretty text-muted-foreground">{description}</p>}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {primaryCTA && <Button onClick={primaryCTA.onClick}>{primaryCTA.label}</Button>}
              {secondaryCTA && (
                <Button variant="ghost" onClick={secondaryCTA.onClick}>
                  {secondaryCTA.label}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

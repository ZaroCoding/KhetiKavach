/**
 * Pricing Section Component
 * Pricing tables with tier comparison and billing toggle
 */

"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/layouts/utils"
import type { PricingConfig, PricingTier } from "@/lib/sections/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export interface PricingSectionProps extends PricingConfig {
  title?: string
  description?: string
  tiers: PricingTier[]
  children?: ReactNode
}

export function PricingSection({
  title,
  description,
  tiers,
  children,
  variant = "cards",
  billingToggle = true,
  background = "default",
  padding = "lg",
  maxWidth = "2xl",
  className,
}: PricingSectionProps) {
  const [isAnnual, setIsAnnual] = useState(true)

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
    gradient: "bg-gradient-to-br from-background via-muted/20 to-accent/10",
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
        <div className="mb-12 text-center">
          {title && <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
          {description && <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">{description}</p>}

          {billingToggle && (
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border bg-muted/50 p-1">
              <button
                onClick={() => setIsAnnual(false)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all",
                  !isAnnual ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all",
                  isAnnual ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                Annual
                <Badge variant="secondary" className="ml-2">
                  Save 20%
                </Badge>
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <Card
              key={index}
              className={cn(
                "relative flex flex-col transition-all",
                tier.highlighted && "border-primary shadow-lg ring-2 ring-primary/20",
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge>Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                {tier.description && <CardDescription>{tier.description}</CardDescription>}
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {tier.currency || "$"}
                    {isAnnual ? tier.price.annual : tier.price.monthly}
                  </span>
                  <span className="text-muted-foreground">/{isAnnual ? "year" : "month"}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  onClick={tier.cta.onClick}
                >
                  {tier.cta.label}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

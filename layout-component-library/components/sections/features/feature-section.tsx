/**
 * Feature Section Component
 * Showcase product features with multiple layout variants
 */

"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/layouts/utils"
import type { FeatureConfig, FeatureItem } from "@/lib/sections/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface FeatureSectionProps extends FeatureConfig {
  title?: string
  description?: string
  features: FeatureItem[]
  children?: ReactNode
}

export function FeatureSection({
  title,
  description,
  features,
  children,
  variant = "grid",
  columns = 3,
  background = "default",
  padding = "lg",
  maxWidth = "2xl",
  className,
}: FeatureSectionProps) {
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
        {(title || description) && (
          <div className="mb-12 text-center">
            {title && <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
            {description && (
              <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {variant === "grid" && <GridFeatures features={features} columns={columns} />}
        {variant === "alternating" && <AlternatingFeatures features={features} />}
        {variant === "bento" && <BentoFeatures features={features} />}
        {variant === "cards" && <CardFeatures features={features} columns={columns} />}
      </div>
    </section>
  )
}

function GridFeatures({ features, columns }: { features: FeatureItem[]; columns: number }) {
  const gridClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[columns]

  return (
    <div className={cn("grid gap-8", gridClass)}>
      {features.map((feature, index) => (
        <div key={index} className="flex flex-col items-start">
          {feature.icon && (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {feature.icon}
            </div>
          )}
          <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
          <p className="text-pretty text-muted-foreground">{feature.description}</p>
        </div>
      ))}
    </div>
  )
}

function AlternatingFeatures({ features }: { features: FeatureItem[] }) {
  return (
    <div className="space-y-24">
      {features.map((feature, index) => (
        <div
          key={index}
          className={cn("grid items-center gap-12 lg:grid-cols-2", index % 2 === 1 && "lg:grid-flow-dense")}
        >
          <div className={cn(index % 2 === 1 && "lg:col-start-2")}>
            {feature.icon && (
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {feature.icon}
              </div>
            )}
            <h3 className="mb-4 text-2xl font-bold">{feature.title}</h3>
            <p className="text-pretty text-lg text-muted-foreground">{feature.description}</p>
          </div>
          {feature.image && (
            <div className={cn(index % 2 === 1 && "lg:col-start-1 lg:row-start-1")}>
              <img
                src={feature.image || "/placeholder.svg"}
                alt={feature.title}
                className="h-auto w-full rounded-lg border shadow-lg"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function BentoFeatures({ features }: { features: FeatureItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <div
          key={index}
          className={cn(
            "group relative overflow-hidden rounded-lg border bg-card p-6 transition-all hover:shadow-lg",
            index === 0 && "md:col-span-2",
            index === features.length - 1 && features.length % 3 === 1 && "lg:col-span-2",
          )}
        >
          {feature.image && (
            <div className="mb-4 overflow-hidden rounded-md">
              <img
                src={feature.image || "/placeholder.svg"}
                alt={feature.title}
                className="h-48 w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
          )}
          {feature.icon && (
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {feature.icon}
            </div>
          )}
          <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
          <p className="text-sm text-muted-foreground">{feature.description}</p>
        </div>
      ))}
    </div>
  )
}

function CardFeatures({ features, columns }: { features: FeatureItem[]; columns: number }) {
  const gridClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[columns]

  return (
    <div className={cn("grid gap-6", gridClass)}>
      {features.map((feature, index) => (
        <Card key={index} className="transition-all hover:shadow-lg">
          <CardHeader>
            {feature.icon && (
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {feature.icon}
              </div>
            )}
            <CardTitle>{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">{feature.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

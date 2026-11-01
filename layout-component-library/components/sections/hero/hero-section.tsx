/**
 * Hero Section Component
 * Full-featured hero sections with multiple variants
 */

"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/layouts/utils"
import type { HeroConfig, HeroContent } from "@/lib/sections/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface HeroSectionProps extends HeroConfig {
  content?: HeroContent
  children?: ReactNode
}

export function HeroSection({
  content,
  children,
  variant = "centered",
  height = "screen",
  background = "default",
  padding = "xl",
  maxWidth = "2xl",
  className,
}: HeroSectionProps) {
  const heightClass = {
    auto: "min-h-[400px]",
    screen: "min-h-screen",
    lg: "min-h-[600px]",
    xl: "min-h-[800px]",
  }[height]

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
      <section className={cn("relative w-full", heightClass, backgroundClass, paddingClass, className)}>
        <div className={cn("mx-auto px-4", maxWidthClass)}>{children}</div>
      </section>
    )
  }

  if (!content) return null

  return (
    <section className={cn("relative w-full", heightClass, backgroundClass, paddingClass, className)}>
      <div className={cn("mx-auto px-4", maxWidthClass)}>
        {variant === "centered" && <CenteredHero content={content} />}
        {variant === "split" && <SplitHero content={content} />}
        {variant === "minimal" && <MinimalHero content={content} />}
        {variant === "video" && <VideoHero content={content} />}
      </div>
    </section>
  )
}

function CenteredHero({ content }: { content: HeroContent }) {
  return (
    <div className="flex min-h-[inherit] flex-col items-center justify-center text-center">
      {content.badge && (
        <Badge variant="secondary" className="mb-4">
          {content.badge}
        </Badge>
      )}
      <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{content.heading}</h1>
      {content.subheading && (
        <p className="mb-6 text-pretty text-xl text-muted-foreground md:text-2xl">{content.subheading}</p>
      )}
      {content.description && (
        <p className="mb-8 max-w-2xl text-pretty text-lg text-muted-foreground">{content.description}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {content.primaryCTA && (
          <Button size="lg" onClick={content.primaryCTA.onClick}>
            {content.primaryCTA.label}
          </Button>
        )}
        {content.secondaryCTA && (
          <Button size="lg" variant="outline" onClick={content.secondaryCTA.onClick}>
            {content.secondaryCTA.label}
          </Button>
        )}
      </div>
      {content.image && (
        <div className="mt-12 w-full max-w-4xl">
          <img
            src={content.image || "/placeholder.svg"}
            alt={content.heading}
            className="h-auto w-full rounded-lg border shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

function SplitHero({ content }: { content: HeroContent }) {
  return (
    <div className="grid min-h-[inherit] items-center gap-12 lg:grid-cols-2">
      <div>
        {content.badge && (
          <Badge variant="secondary" className="mb-4">
            {content.badge}
          </Badge>
        )}
        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          {content.heading}
        </h1>
        {content.subheading && (
          <p className="mb-6 text-pretty text-xl text-muted-foreground md:text-2xl">{content.subheading}</p>
        )}
        {content.description && <p className="mb-8 text-pretty text-lg text-muted-foreground">{content.description}</p>}
        <div className="flex flex-wrap items-center gap-4">
          {content.primaryCTA && (
            <Button size="lg" onClick={content.primaryCTA.onClick}>
              {content.primaryCTA.label}
            </Button>
          )}
          {content.secondaryCTA && (
            <Button size="lg" variant="outline" onClick={content.secondaryCTA.onClick}>
              {content.secondaryCTA.label}
            </Button>
          )}
        </div>
      </div>
      {content.image && (
        <div className="relative">
          <img
            src={content.image || "/placeholder.svg"}
            alt={content.heading}
            className="h-auto w-full rounded-lg border shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

function MinimalHero({ content }: { content: HeroContent }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {content.badge && (
        <Badge variant="secondary" className="mb-4">
          {content.badge}
        </Badge>
      )}
      <h1 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">{content.heading}</h1>
      {content.description && (
        <p className="mb-6 max-w-2xl text-pretty text-lg text-muted-foreground">{content.description}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {content.primaryCTA && <Button onClick={content.primaryCTA.onClick}>{content.primaryCTA.label}</Button>}
        {content.secondaryCTA && (
          <Button variant="outline" onClick={content.secondaryCTA.onClick}>
            {content.secondaryCTA.label}
          </Button>
        )}
      </div>
    </div>
  )
}

function VideoHero({ content }: { content: HeroContent }) {
  return (
    <div className="relative flex min-h-[inherit] flex-col items-center justify-center text-center">
      {content.video && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video autoPlay loop muted playsInline className="h-full w-full object-cover opacity-20">
            <source src={content.video} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        </div>
      )}
      {content.badge && (
        <Badge variant="secondary" className="mb-4">
          {content.badge}
        </Badge>
      )}
      <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{content.heading}</h1>
      {content.subheading && (
        <p className="mb-6 text-pretty text-xl text-muted-foreground md:text-2xl">{content.subheading}</p>
      )}
      {content.description && (
        <p className="mb-8 max-w-2xl text-pretty text-lg text-muted-foreground">{content.description}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {content.primaryCTA && (
          <Button size="lg" onClick={content.primaryCTA.onClick}>
            {content.primaryCTA.label}
          </Button>
        )}
        {content.secondaryCTA && (
          <Button size="lg" variant="outline" onClick={content.secondaryCTA.onClick}>
            {content.secondaryCTA.label}
          </Button>
        )}
      </div>
    </div>
  )
}

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";

export interface CtaLink {
  label: string;
  href: string;
  external?: boolean;
}

interface HeroSectionProps {
  badge?: string;
  heading: string;
  description: string;
  primaryCTA: CtaLink;
  secondaryCTA?: CtaLink;
  /** Optional content under the buttons (for example a short note). */
  children?: ReactNode;
}

export function HeroSection({ badge, heading, description, primaryCTA, secondaryCTA, children }: HeroSectionProps) {
  return (
    <div className="bg-gradient-to-b from-soil-100/70 to-background py-16 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
        {badge && (
          <Badge variant="secondary" className="mb-4">
            {badge}
          </Badge>
        )}
        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-soil-900 md:text-5xl">{heading}</h1>
        <p className="mb-8 max-w-2xl text-pretty text-lg text-muted-foreground">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href={primaryCTA.href} external={primaryCTA.external} className="h-10 px-5 text-base">
            {primaryCTA.label}
          </ButtonLink>
          {secondaryCTA && (
            <ButtonLink href={secondaryCTA.href} external={secondaryCTA.external} variant="outline" className="h-10 px-5 text-base">
              {secondaryCTA.label}
            </ButtonLink>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

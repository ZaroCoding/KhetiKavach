import type { CtaLink } from "@/components/sections/hero";
import { ButtonLink } from "@/components/ui/button-link";

interface CTASectionProps {
  title: string;
  description: string;
  primaryCTA: CtaLink;
  secondaryCTA?: CtaLink;
}

export function CTASection({ title, description, primaryCTA, secondaryCTA }: CTASectionProps) {
  return (
    <div className="bg-soil-100/60 py-16">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="mb-3 text-balance text-3xl font-bold tracking-tight text-soil-900">{title}</h2>
        <p className="mx-auto mb-8 max-w-2xl text-pretty text-muted-foreground">{description}</p>
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
      </div>
    </div>
  );
}

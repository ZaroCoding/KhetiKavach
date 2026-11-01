import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface FeatureItem {
  icon: ReactNode;
  title: string;
  description: string;
}

interface FeatureSectionProps {
  title: string;
  description?: string;
  features: FeatureItem[];
}

export function FeatureSection({ title, description, features }: FeatureSectionProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 text-center">
        <h2 className="mb-3 text-balance text-3xl font-bold tracking-tight text-soil-900">{title}</h2>
        {description && <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-5">
                {feature.icon}
              </div>
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-pretty">{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

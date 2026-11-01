"use client"

import { HeroSection } from "@/components/sections/hero/hero-section"
import { FeatureSection } from "@/components/sections/features/feature-section"
import { PricingSection } from "@/components/sections/pricing/pricing-section"
import { CTASection } from "@/components/sections/cta/cta-section"
import { Zap, Shield, Rocket, Star } from "lucide-react"

export default function SectionsShowcase() {
  return (
    <div className="min-h-screen">
      {/* Hero Sections */}
      <div className="border-b">
        <HeroSection
          variant="centered"
          height="screen"
          background="gradient"
          content={{
            badge: "New Release",
            heading: "Build faster with pre-built sections",
            subheading: "Production-ready components that compose beautifully",
            description:
              "Stop rebuilding the same sections over and over. Use our battle-tested patterns to ship faster.",
            primaryCTA: { label: "Get Started", onClick: () => console.log("Get Started") },
            secondaryCTA: { label: "View Docs", onClick: () => console.log("View Docs") },
            image: "/dashboard-mockup.png",
          }}
        />
      </div>

      {/* Feature Sections */}
      <FeatureSection
        title="Everything you need to build modern apps"
        description="Comprehensive section patterns that cover all your marketing and application needs"
        variant="grid"
        columns={3}
        padding="xl"
        features={[
          {
            icon: <Zap className="h-6 w-6" />,
            title: "Lightning Fast",
            description: "Optimized for performance with minimal bundle size and maximum impact",
          },
          {
            icon: <Shield className="h-6 w-6" />,
            title: "Type Safe",
            description: "Full TypeScript support with comprehensive type definitions",
          },
          {
            icon: <Rocket className="h-6 w-6" />,
            title: "Production Ready",
            description: "Battle-tested components used by thousands of developers",
          },
          {
            icon: <Star className="h-6 w-6" />,
            title: "Fully Composable",
            description: "Mix and match sections to create unique page layouts",
          },
          {
            icon: <Zap className="h-6 w-6" />,
            title: "Responsive",
            description: "Mobile-first design that looks great on all devices",
          },
          {
            icon: <Shield className="h-6 w-6" />,
            title: "Accessible",
            description: "WCAG compliant with proper ARIA labels and keyboard navigation",
          },
        ]}
      />

      {/* Alternating Features */}
      <FeatureSection
        title="See it in action"
        description="Real examples of how these sections work together"
        variant="alternating"
        background="muted"
        padding="xl"
        features={[
          {
            title: "Hero Sections",
            description:
              "Multiple variants including centered, split, minimal, and video backgrounds. Perfect for landing pages and product launches.",
            image: "/hero-section-example.jpg",
          },
          {
            title: "Feature Showcases",
            description: "Grid, alternating, bento, and card layouts to highlight your product features with style.",
            image: "/feature-grid-example.jpg",
          },
        ]}
      />

      {/* Pricing Section */}
      <PricingSection
        title="Simple, transparent pricing"
        description="Choose the plan that's right for you"
        billingToggle={true}
        padding="xl"
        tiers={[
          {
            name: "Starter",
            description: "Perfect for side projects",
            price: { monthly: 9, annual: 90 },
            features: ["Up to 3 projects", "Basic components", "Community support", "Regular updates"],
            cta: { label: "Start Free Trial", onClick: () => console.log("Starter") },
          },
          {
            name: "Pro",
            description: "For professional developers",
            price: { monthly: 29, annual: 290 },
            features: [
              "Unlimited projects",
              "All components",
              "Priority support",
              "Advanced features",
              "Custom themes",
            ],
            highlighted: true,
            cta: { label: "Get Started", onClick: () => console.log("Pro") },
          },
          {
            name: "Enterprise",
            description: "For large teams",
            price: { monthly: 99, annual: 990 },
            features: [
              "Everything in Pro",
              "Dedicated support",
              "Custom development",
              "SLA guarantee",
              "Training sessions",
            ],
            cta: { label: "Contact Sales", onClick: () => console.log("Enterprise") },
          },
        ]}
      />

      {/* CTA Section */}
      <CTASection
        title="Ready to build something amazing?"
        description="Join thousands of developers who are shipping faster with our component library"
        variant="centered"
        background="gradient"
        padding="xl"
        primaryCTA={{ label: "Get Started Free", onClick: () => console.log("CTA") }}
        secondaryCTA={{ label: "Schedule Demo", onClick: () => console.log("Demo") }}
      />
    </div>
  )
}

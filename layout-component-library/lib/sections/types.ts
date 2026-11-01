/**
 * Section pattern types
 * Reusable content sections for marketing and application pages
 */

import type { ReactNode } from "react"

/**
 * Base section configuration
 */
export interface SectionConfig {
  /**
   * Section identifier
   */
  id?: string

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Background variant
   */
  background?: "default" | "muted" | "accent" | "gradient"

  /**
   * Vertical padding
   */
  padding?: "none" | "sm" | "md" | "lg" | "xl"

  /**
   * Maximum content width
   */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

/**
 * Hero section configuration
 */
export interface HeroConfig extends SectionConfig {
  variant?: "centered" | "split" | "minimal" | "video"
  height?: "auto" | "screen" | "lg" | "xl"
}

/**
 * Feature section configuration
 */
export interface FeatureConfig extends SectionConfig {
  variant?: "grid" | "alternating" | "bento" | "cards"
  columns?: 2 | 3 | 4
}

/**
 * Testimonial section configuration
 */
export interface TestimonialConfig extends SectionConfig {
  variant?: "grid" | "carousel" | "featured" | "marquee"
  columns?: 1 | 2 | 3
}

/**
 * Pricing section configuration
 */
export interface PricingConfig extends SectionConfig {
  variant?: "cards" | "table" | "comparison"
  tiers?: 2 | 3 | 4
  billingToggle?: boolean
}

/**
 * CTA section configuration
 */
export interface CTAConfig extends SectionConfig {
  variant?: "centered" | "split" | "banner" | "inline"
  size?: "sm" | "md" | "lg"
}

/**
 * Stats section configuration
 */
export interface StatsConfig extends SectionConfig {
  variant?: "simple" | "cards" | "highlighted"
  columns?: 2 | 3 | 4
}

/**
 * Logo cloud configuration
 */
export interface LogoCloudConfig extends SectionConfig {
  variant?: "grid" | "marquee" | "scattered"
  columns?: 3 | 4 | 5 | 6
}

/**
 * FAQ section configuration
 */
export interface FAQConfig extends SectionConfig {
  variant?: "accordion" | "two-column" | "grid"
  searchable?: boolean
}

/**
 * Common content types
 */
export interface HeroContent {
  badge?: string
  heading: string
  subheading?: string
  description?: string
  primaryCTA?: CTAButton
  secondaryCTA?: CTAButton
  image?: string
  video?: string
}

export interface FeatureItem {
  icon?: ReactNode
  title: string
  description: string
  image?: string
  link?: string
}

export interface TestimonialItem {
  quote: string
  author: string
  role: string
  company?: string
  avatar?: string
  logo?: string
  rating?: number
}

export interface PricingTier {
  name: string
  description?: string
  price: {
    monthly: number
    annual: number
  }
  currency?: string
  features: string[]
  highlighted?: boolean
  cta: CTAButton
}

export interface StatItem {
  value: string | number
  label: string
  description?: string
  icon?: ReactNode
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}

export interface FAQItem {
  question: string
  answer: string
}

export interface CTAButton {
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "outline" | "ghost"
}

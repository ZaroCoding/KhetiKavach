/**
 * Shared utilities for layout templates
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Spacing } from "./types"

/**
 * Combines class names with proper precedence
 * Re-exports the cn utility for layout-specific use
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Converts spacing value to Tailwind class
 */
export function getSpacingClass(value: Spacing, prefix: "gap" | "p" | "m"): string {
  return `${prefix}-${value}`
}

/**
 * Generates responsive classes for breakpoints
 */
export function getResponsiveClasses(baseClass: string, breakpoints?: Partial<Record<string, string>>): string {
  if (!breakpoints) return baseClass

  const classes = [baseClass]

  Object.entries(breakpoints).forEach(([breakpoint, value]) => {
    if (value) {
      classes.push(`${breakpoint}:${value}`)
    }
  })

  return classes.join(" ")
}

/**
 * Validates slot IDs are unique
 */
export function validateUniqueSlots(slotIds: string[]): boolean {
  const uniqueIds = new Set(slotIds)
  return uniqueIds.size === slotIds.length
}

/**
 * Generates a unique slot ID
 */
export function generateSlotId(prefix: string, index: number): string {
  return `${prefix}-slot-${index}`
}

/**
 * Layout template registry
 * Central registry for all available layout templates
 */

import type { LayoutTemplate } from "./types"

/**
 * Registry of all layout templates
 * Add new templates here as they are created
 */
export const layoutRegistry: Record<string, LayoutTemplate> = {
  "bento-grid": {
    id: "bento-grid",
    name: "Bento Grid",
    description: "Asymmetric grid layout with variable-sized cells, inspired by bento box designs",
    category: "grid",
    complexity: "moderate",
    presets: ["featured", "balanced", "sidebar", "magazine"],
    version: "1.0.0",
  },
  sidebar: {
    id: "sidebar",
    name: "Sidebar Layout",
    description: "Classic application layout with collapsible sidebar navigation",
    category: "sidebar",
    complexity: "simple",
    presets: ["standard", "narrow", "wide", "right"],
    version: "1.0.0",
  },
  split: {
    id: "split",
    name: "Split Layout",
    description: "Two-panel layout with configurable split ratios",
    category: "content",
    complexity: "simple",
    presets: ["equal", "contentSidebar", "imageText", "vertical"],
    version: "1.0.0",
  },
  stack: {
    id: "stack",
    name: "Stack Layout",
    description: "Vertical or horizontal stacking with consistent spacing",
    category: "content",
    complexity: "simple",
    presets: ["vertical", "horizontal", "centered", "split"],
    version: "1.0.0",
  },
  cluster: {
    id: "cluster",
    name: "Cluster Layout",
    description: "Wrapping flexbox layout for tags, chips, and button groups",
    category: "content",
    complexity: "simple",
    presets: ["tags", "buttons", "centered"],
    version: "1.0.0",
  },
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category: LayoutTemplate["category"]): LayoutTemplate[] {
  return Object.values(layoutRegistry).filter((template) => template.category === category)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): LayoutTemplate | undefined {
  return layoutRegistry[id]
}

/**
 * Get all available templates
 */
export function getAllTemplates(): LayoutTemplate[] {
  return Object.values(layoutRegistry)
}

/**
 * Stack layout presets
 */

import type { StackConfig } from "./types"

export const stackPresets: Record<string, StackConfig> = {
  vertical: {
    id: "stack-vertical",
    name: "Vertical Stack",
    description: "Items stacked vertically with consistent spacing",
    direction: "vertical",
    align: "stretch",
    gap: 4,
  },

  horizontal: {
    id: "stack-horizontal",
    name: "Horizontal Stack",
    description: "Items arranged horizontally",
    direction: "horizontal",
    align: "center",
    gap: 4,
  },

  centered: {
    id: "stack-centered",
    name: "Centered Stack",
    description: "Vertically stacked items centered on page",
    direction: "vertical",
    align: "center",
    justify: "center",
    gap: 6,
  },

  split: {
    id: "stack-split",
    name: "Split Stack",
    description: "Items pushed to opposite ends",
    direction: "horizontal",
    align: "center",
    split: true,
    gap: 4,
  },
}

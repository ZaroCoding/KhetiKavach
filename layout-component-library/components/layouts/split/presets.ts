/**
 * Split layout presets
 */

import type { SplitConfig } from "./types"

export const splitPresets: Record<string, SplitConfig> = {
  equal: {
    id: "split-equal",
    name: "Equal Split",
    description: "50/50 split between two panels",
    ratio: "50-50",
    direction: "horizontal",
    stackOnMobile: true,
    gap: 4,
  },

  contentSidebar: {
    id: "split-content-sidebar",
    name: "Content with Sidebar",
    description: "Main content area with smaller sidebar",
    ratio: "70-30",
    direction: "horizontal",
    stackOnMobile: true,
    gap: 6,
  },

  imageText: {
    id: "split-image-text",
    name: "Image and Text",
    description: "Balanced image and text layout",
    ratio: "60-40",
    direction: "horizontal",
    stackOnMobile: true,
    gap: 8,
  },

  vertical: {
    id: "split-vertical",
    name: "Vertical Split",
    description: "Top and bottom panels",
    ratio: "50-50",
    direction: "vertical",
    stackOnMobile: false,
    gap: 4,
  },
}

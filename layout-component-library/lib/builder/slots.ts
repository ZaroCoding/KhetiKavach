/**
 * Slot Definitions
 * Defines available slots for each container type
 */

import type { SlotDefinition, BlockType } from "./types"

/**
 * Slot definitions for shells
 */
export const shellSlots: Record<string, SlotDefinition[]> = {
  "shell:app": [
    {
      id: "header",
      label: "Header",
      description: "Top navigation bar",
      accepts: ["nav:top", "section:hero"],
      required: false,
      multiple: false,
    },
    {
      id: "sidebar",
      label: "Sidebar",
      description: "Side navigation panel",
      accepts: ["nav:sidebar"],
      required: false,
      multiple: false,
    },
    {
      id: "main",
      label: "Main Content",
      description: "Primary content area",
      accepts: null, // Accepts anything
      required: true,
      multiple: true,
    },
    {
      id: "footer",
      label: "Footer",
      description: "Bottom footer area",
      accepts: ["section:cta"],
      required: false,
      multiple: false,
    },
  ],
  "shell:marketing": [
    {
      id: "header",
      label: "Header",
      description: "Top navigation",
      accepts: ["nav:top"],
      required: false,
      multiple: false,
    },
    {
      id: "main",
      label: "Main Content",
      description: "Page sections",
      accepts: ["section:hero", "section:features", "section:pricing", "section:cta", "section:testimonials"],
      required: true,
      multiple: true,
    },
    {
      id: "footer",
      label: "Footer",
      description: "Footer content",
      accepts: null,
      required: false,
      multiple: false,
    },
  ],
  "shell:dashboard": [
    {
      id: "header",
      label: "Header",
      description: "Dashboard header",
      accepts: ["nav:top", "nav:breadcrumbs"],
      required: false,
      multiple: false,
    },
    {
      id: "sidebar",
      label: "Sidebar",
      description: "Navigation sidebar",
      accepts: ["nav:sidebar"],
      required: false,
      multiple: false,
    },
    {
      id: "main",
      label: "Main Content",
      description: "Dashboard content",
      accepts: ["layout:bento-grid", "layout:stack", "section:stats"],
      required: true,
      multiple: true,
    },
  ],
}

/**
 * Get slot definitions for a block type
 */
export function getSlotDefinitions(blockType: BlockType): SlotDefinition[] | undefined {
  if (blockType.startsWith("shell:")) {
    return shellSlots[blockType]
  }
  // Add more container types as needed
  return undefined
}

/**
 * Check if a block type can be placed in a slot
 */
export function canPlaceInSlot(blockType: BlockType, slot: SlotDefinition): boolean {
  if (!slot.accepts) return true // Accepts anything
  return slot.accepts.includes(blockType)
}

/**
 * Get available block types for a slot
 */
export function getAvailableBlocksForSlot(slot: SlotDefinition): BlockType[] {
  if (!slot.accepts) {
    // Return common block types
    return ["section:hero", "section:features", "section:pricing", "section:cta", "layout:bento-grid", "layout:stack"]
  }
  return slot.accepts
}

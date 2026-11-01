/**
 * Bento Grid presets
 * Pre-configured layouts for common use cases
 */

import type { BentoGridConfig } from "./types"

export const featuredPreset: BentoGridConfig = {
  id: "bento-featured",
  name: "Featured Layout",
  description: "Large featured area with smaller supporting content",
  columns: 12,
  gap: 4,
  padding: 0,
  autoRows: true,
  minRowHeight: 200,
  slots: [
    {
      id: "hero",
      label: "Hero Section",
      span: { cols: 8, rows: 2 },
      spanMd: { cols: 12, rows: 1 },
      ariaLabel: "Featured content area",
    },
    {
      id: "secondary-1",
      label: "Secondary Content 1",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Secondary content area 1",
    },
    {
      id: "secondary-2",
      label: "Secondary Content 2",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Secondary content area 2",
    },
    {
      id: "tertiary-1",
      label: "Tertiary Content 1",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 4 },
      ariaLabel: "Tertiary content area 1",
    },
    {
      id: "tertiary-2",
      label: "Tertiary Content 2",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 4 },
      ariaLabel: "Tertiary content area 2",
    },
    {
      id: "tertiary-3",
      label: "Tertiary Content 3",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 4 },
      ariaLabel: "Tertiary content area 3",
    },
  ],
}

export const balancedPreset: BentoGridConfig = {
  id: "bento-balanced",
  name: "Balanced Layout",
  description: "Evenly distributed content areas",
  columns: 12,
  gap: 4,
  padding: 0,
  autoRows: true,
  minRowHeight: 250,
  slots: [
    {
      id: "content-1",
      label: "Content Area 1",
      span: { cols: 6, rows: 2 },
      spanMd: { cols: 12, rows: 1 },
      ariaLabel: "Content area 1",
    },
    {
      id: "content-2",
      label: "Content Area 2",
      span: { cols: 6, rows: 2 },
      spanMd: { cols: 12, rows: 1 },
      ariaLabel: "Content area 2",
    },
    {
      id: "content-3",
      label: "Content Area 3",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Content area 3",
    },
    {
      id: "content-4",
      label: "Content Area 4",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Content area 4",
    },
    {
      id: "content-5",
      label: "Content Area 5",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 12 },
      ariaLabel: "Content area 5",
    },
  ],
}

export const sidebarPreset: BentoGridConfig = {
  id: "bento-sidebar",
  name: "Sidebar Layout",
  description: "Main content area with complementary sidebar",
  columns: 12,
  gap: 4,
  padding: 0,
  autoRows: true,
  minRowHeight: 200,
  slots: [
    {
      id: "main",
      label: "Main Content",
      span: { cols: 8, rows: 3 },
      spanMd: { cols: 12, rows: 2 },
      ariaLabel: "Main content area",
    },
    {
      id: "sidebar-1",
      label: "Sidebar Item 1",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Sidebar content 1",
    },
    {
      id: "sidebar-2",
      label: "Sidebar Item 2",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Sidebar content 2",
    },
    {
      id: "sidebar-3",
      label: "Sidebar Item 3",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 12 },
      ariaLabel: "Sidebar content 3",
    },
  ],
}

export const magazinePreset: BentoGridConfig = {
  id: "bento-magazine",
  name: "Magazine Layout",
  description: "Editorial-style layout with varied content sizes",
  columns: 12,
  gap: 4,
  padding: 0,
  autoRows: true,
  minRowHeight: 180,
  slots: [
    {
      id: "feature",
      label: "Feature Story",
      span: { cols: 7, rows: 2 },
      spanMd: { cols: 12, rows: 1 },
      ariaLabel: "Featured story",
    },
    {
      id: "highlight-1",
      label: "Highlight 1",
      span: { cols: 5, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Highlighted content 1",
    },
    {
      id: "highlight-2",
      label: "Highlight 2",
      span: { cols: 5, rows: 1 },
      spanMd: { cols: 6 },
      ariaLabel: "Highlighted content 2",
    },
    {
      id: "story-1",
      label: "Story 1",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 4 },
      ariaLabel: "Story 1",
    },
    {
      id: "story-2",
      label: "Story 2",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 4 },
      ariaLabel: "Story 2",
    },
    {
      id: "story-3",
      label: "Story 3",
      span: { cols: 4, rows: 1 },
      spanMd: { cols: 4 },
      ariaLabel: "Story 3",
    },
  ],
}

export const bentoPresets = {
  featured: featuredPreset,
  balanced: balancedPreset,
  sidebar: sidebarPreset,
  magazine: magazinePreset,
} as const

export function getBentoPreset(name: keyof typeof bentoPresets): BentoGridConfig {
  return bentoPresets[name]
}

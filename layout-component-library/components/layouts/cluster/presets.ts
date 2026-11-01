/**
 * Cluster layout presets
 */

import type { ClusterConfig } from "./types"

export const clusterPresets: Record<string, ClusterConfig> = {
  tags: {
    id: "cluster-tags",
    name: "Tag Cluster",
    description: "Wrapping layout for tags and labels",
    align: "center",
    justify: "start",
    gapX: 2,
    gapY: 2,
  },

  buttons: {
    id: "cluster-buttons",
    name: "Button Cluster",
    description: "Group of action buttons",
    align: "center",
    justify: "start",
    gapX: 3,
    gapY: 3,
  },

  centered: {
    id: "cluster-centered",
    name: "Centered Cluster",
    description: "Items centered with wrapping",
    align: "center",
    justify: "center",
    gapX: 4,
    gapY: 4,
  },
}

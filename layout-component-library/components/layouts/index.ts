/**
 * Layouts barrel export
 * All layout components in one place
 */

// Bento Grid
export { BentoGrid, BentoSlot } from "./bento-grid/bento-grid"
export { bentoPresets, getBentoPreset } from "./bento-grid/presets"
export type { BentoGridConfig, BentoSlotConfig } from "./bento-grid/types"

// Sidebar Layout
export { SidebarLayout } from "./sidebar/sidebar-layout"
export { sidebarPresets, getSidebarPreset } from "./sidebar/presets"
export type { SidebarLayoutConfig, SidebarLayoutProps } from "./sidebar/types"

// Split Layout
export { SplitLayout } from "./split/split-layout"
export { splitPresets, getSplitPreset } from "./split/presets"
export type { SplitLayoutConfig, SplitLayoutProps } from "./split/types"

// Stack Layout
export { StackLayout, Stack } from "./stack/stack-layout"
export { stackPresets, getStackPreset } from "./stack/presets"
export type { StackLayoutConfig, StackLayoutProps } from "./stack/types"

// Cluster Layout
export { ClusterLayout } from "./cluster/cluster-layout"
export { clusterPresets, getClusterPreset } from "./cluster/presets"
export type { ClusterLayoutConfig, ClusterLayoutProps } from "./cluster/types"

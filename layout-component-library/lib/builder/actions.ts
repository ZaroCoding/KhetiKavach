/**
 * Builder Actions
 * All possible state mutations for the builder
 */

import type { BuilderNode } from "./types"

/**
 * Action types
 */
export type BuilderAction =
  // Node operations
  | { type: "ADD_NODE"; payload: { node: BuilderNode; parentId?: string | null } }
  | { type: "ADD_NODE_TO_SLOT"; payload: { node: BuilderNode; parentId: string; slotId: string } }
  | { type: "REMOVE_NODE"; payload: { nodeId: string } }
  | { type: "UPDATE_NODE"; payload: { nodeId: string; updates: Partial<BuilderNode> } }
  | { type: "MOVE_NODE"; payload: { nodeId: string; newParentId: string | null; index?: number } }
  | { type: "DUPLICATE_NODE"; payload: { nodeId: string } }
  // Selection
  | { type: "SELECT_NODE"; payload: { nodeId: string; addToSelection?: boolean } }
  | { type: "DESELECT_NODE"; payload: { nodeId: string } }
  | { type: "CLEAR_SELECTION" }
  | { type: "SELECT_ALL" }
  // Hover
  | { type: "SET_HOVER"; payload: { nodeId: string | null } }
  // Canvas
  | { type: "SET_ZOOM"; payload: { zoom: number } }
  | { type: "SET_PAN"; payload: { x: number; y: number } }
  | { type: "SET_VIEWPORT"; payload: { width: number; height: number } }
  | { type: "RESET_CANVAS" }
  // History
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_HISTORY" }
  // Batch operations
  | { type: "BATCH"; payload: { actions: BuilderAction[] } }

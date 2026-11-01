/**
 * Builder Reducer
 * Pure state management for the layout builder
 */

import type { BuilderState, BuilderNode, ContainerNode } from "./types"
import type { BuilderAction } from "./actions"
import { cloneNode } from "./utils"

/**
 * Initial builder state
 */
export const initialBuilderState: BuilderState = {
  nodes: {},
  rootIds: [],
  selectedIds: [],
  hoveredId: null,
  canvas: {
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewport: { width: 1920, height: 1080 },
  },
  history: {
    past: [],
    future: [],
  },
}

/**
 * Create a snapshot of current state for history
 */
function createSnapshot(state: BuilderState): BuilderState {
  return {
    ...state,
    history: { past: [], future: [] }, // Don't include history in snapshots
  }
}

/**
 * Add node to state
 */
function addNode(state: BuilderState, node: BuilderNode, parentId: string | null | undefined): BuilderState {
  const newNodes = { ...state.nodes, [node.id]: node }

  // If no parent, add to root
  if (!parentId) {
    return {
      ...state,
      nodes: newNodes,
      rootIds: [...state.rootIds, node.id],
    }
  }

  // Add to parent's children
  const parent = state.nodes[parentId]
  if (!parent) {
    console.error(`[v0] Parent node ${parentId} not found`)
    return state
  }

  const updatedParent = {
    ...parent,
    children: [...parent.children, node.id],
  }

  return {
    ...state,
    nodes: { ...newNodes, [parentId]: updatedParent },
  }
}

/**
 * Add node to a specific slot in a container
 */
function addNodeToSlot(state: BuilderState, node: BuilderNode, parentId: string, slotId: string): BuilderState {
  const parent = state.nodes[parentId] as ContainerNode
  if (!parent) {
    console.error(`[v0] Parent node ${parentId} not found`)
    return state
  }

  const parentSlots = parent.slots || {}
  const slotChildren = parentSlots[slotId] || []

  const updatedNode: BuilderNode = {
    ...node,
    parentId,
    metadata: {
      ...node.metadata,
      slotId, // Track which slot this node belongs to
    },
  }

  const updatedParent: ContainerNode = {
    ...parent,
    children: [...parent.children, node.id],
    slots: {
      ...parentSlots,
      [slotId]: [...slotChildren, node.id],
    },
  }

  return {
    ...state,
    nodes: {
      ...state.nodes,
      [node.id]: updatedNode,
      [parentId]: updatedParent,
    },
  }
}

/**
 * Remove node and all descendants
 */
function removeNode(state: BuilderState, nodeId: string): BuilderState {
  const node = state.nodes[nodeId]
  if (!node) return state

  // Collect all descendant IDs
  const toRemove = new Set<string>([nodeId])
  const collectDescendants = (id: string) => {
    const n = state.nodes[id]
    if (n) {
      n.children.forEach((childId) => {
        toRemove.add(childId)
        collectDescendants(childId)
      })
    }
  }
  collectDescendants(nodeId)

  // Remove from nodes
  const newNodes = { ...state.nodes }
  toRemove.forEach((id) => delete newNodes[id])

  // Remove from parent's children or rootIds
  let newRootIds = state.rootIds
  if (node.parentId) {
    const parent = state.nodes[node.parentId]
    if (parent) {
      newNodes[node.parentId] = {
        ...parent,
        children: parent.children.filter((id) => id !== nodeId),
      }
    }
  } else {
    newRootIds = state.rootIds.filter((id) => id !== nodeId)
  }

  // Remove from selection
  const newSelectedIds = state.selectedIds.filter((id) => !toRemove.has(id))

  return {
    ...state,
    nodes: newNodes,
    rootIds: newRootIds,
    selectedIds: newSelectedIds,
    hoveredId: state.hoveredId && toRemove.has(state.hoveredId) ? null : state.hoveredId,
  }
}

/**
 * Update node properties
 */
function updateNode(state: BuilderState, nodeId: string, updates: Partial<BuilderNode>): BuilderState {
  const node = state.nodes[nodeId]
  if (!node) return state

  const updatedNode = {
    ...node,
    ...updates,
    metadata: {
      ...node.metadata,
      updatedAt: Date.now(),
    },
  }

  return {
    ...state,
    nodes: { ...state.nodes, [nodeId]: updatedNode },
  }
}

/**
 * Main reducer
 */
export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  // Save to history for undoable actions
  const shouldSaveHistory = [
    "ADD_NODE",
    "ADD_NODE_TO_SLOT",
    "REMOVE_NODE",
    "UPDATE_NODE",
    "MOVE_NODE",
    "DUPLICATE_NODE",
  ].includes(action.type)

  const newState = (() => {
    switch (action.type) {
      case "ADD_NODE":
        return addNode(state, action.payload.node, action.payload.parentId)

      case "ADD_NODE_TO_SLOT":
        return addNodeToSlot(state, action.payload.node, action.payload.parentId, action.payload.slotId)

      case "REMOVE_NODE":
        return removeNode(state, action.payload.nodeId)

      case "UPDATE_NODE":
        return updateNode(state, action.payload.nodeId, action.payload.updates)

      case "MOVE_NODE": {
        const { nodeId, newParentId, index } = action.payload
        // First remove from current parent
        let tempState = state
        const node = state.nodes[nodeId]
        if (!node) return state

        // Remove from old parent
        if (node.parentId) {
          const oldParent = state.nodes[node.parentId]
          if (oldParent) {
            tempState = {
              ...tempState,
              nodes: {
                ...tempState.nodes,
                [node.parentId]: {
                  ...oldParent,
                  children: oldParent.children.filter((id) => id !== nodeId),
                },
              },
            }
          }
        } else {
          tempState = {
            ...tempState,
            rootIds: tempState.rootIds.filter((id) => id !== nodeId),
          }
        }

        // Add to new parent
        const updatedNode = { ...node, parentId: newParentId }
        if (!newParentId) {
          return {
            ...tempState,
            nodes: { ...tempState.nodes, [nodeId]: updatedNode },
            rootIds:
              index !== undefined
                ? [...tempState.rootIds.slice(0, index), nodeId, ...tempState.rootIds.slice(index)]
                : [...tempState.rootIds, nodeId],
          }
        }

        const newParent = tempState.nodes[newParentId]
        if (!newParent) return state

        return {
          ...tempState,
          nodes: {
            ...tempState.nodes,
            [nodeId]: updatedNode,
            [newParentId]: {
              ...newParent,
              children:
                index !== undefined
                  ? [...newParent.children.slice(0, index), nodeId, ...newParent.children.slice(index)]
                  : [...newParent.children, nodeId],
            },
          },
        }
      }

      case "DUPLICATE_NODE": {
        const { nodeId } = action.payload
        const node = state.nodes[nodeId]
        if (!node) return state

        const cloned = cloneNode(node, state.nodes)
        return addNode(state, cloned, node.parentId)
      }

      case "SELECT_NODE": {
        const { nodeId, addToSelection } = action.payload
        if (!state.nodes[nodeId]) return state

        return {
          ...state,
          selectedIds: addToSelection ? [...state.selectedIds, nodeId] : [nodeId],
        }
      }

      case "DESELECT_NODE":
        return {
          ...state,
          selectedIds: state.selectedIds.filter((id) => id !== action.payload.nodeId),
        }

      case "CLEAR_SELECTION":
        return { ...state, selectedIds: [] }

      case "SELECT_ALL":
        return { ...state, selectedIds: Object.keys(state.nodes) }

      case "SET_HOVER":
        return { ...state, hoveredId: action.payload.nodeId }

      case "SET_ZOOM":
        return {
          ...state,
          canvas: { ...state.canvas, zoom: action.payload.zoom },
        }

      case "SET_PAN":
        return {
          ...state,
          canvas: { ...state.canvas, pan: action.payload },
        }

      case "SET_VIEWPORT":
        return {
          ...state,
          canvas: { ...state.canvas, viewport: action.payload },
        }

      case "RESET_CANVAS":
        return {
          ...state,
          canvas: initialBuilderState.canvas,
        }

      case "UNDO": {
        const { past, future } = state.history
        if (past.length === 0) return state

        const previous = past[past.length - 1]
        const newPast = past.slice(0, -1)

        return {
          ...previous,
          history: {
            past: newPast,
            future: [createSnapshot(state), ...future],
          },
        }
      }

      case "REDO": {
        const { past, future } = state.history
        if (future.length === 0) return state

        const next = future[0]
        const newFuture = future.slice(1)

        return {
          ...next,
          history: {
            past: [...past, createSnapshot(state)],
            future: newFuture,
          },
        }
      }

      case "CLEAR_HISTORY":
        return {
          ...state,
          history: { past: [], future: [] },
        }

      case "BATCH": {
        return action.payload.actions.reduce((acc, a) => builderReducer(acc, a), state)
      }

      default:
        return state
    }
  })()

  // Add to history if needed
  if (shouldSaveHistory && newState !== state) {
    return {
      ...newState,
      history: {
        past: [...state.history.past, createSnapshot(state)],
        future: [], // Clear future on new action
      },
    }
  }

  return newState
}

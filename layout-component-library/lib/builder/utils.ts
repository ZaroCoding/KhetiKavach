/**
 * Builder Utilities
 * Pure helper functions for tree operations
 */

import type { BuilderNode } from "./types"

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Clone a node with new ID
 */
export function cloneNode(node: BuilderNode, allNodes: Record<string, BuilderNode>): BuilderNode {
  const newId = generateId()
  const clonedChildren: string[] = []

  // Recursively clone children
  node.children.forEach((childId) => {
    const child = allNodes[childId]
    if (child) {
      const clonedChild = cloneNode(child, allNodes)
      clonedChildren.push(clonedChild.id)
    }
  })

  return {
    ...node,
    id: newId,
    label: `${node.label} (Copy)`,
    children: clonedChildren,
    metadata: {
      ...node.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  }
}

/**
 * Get all ancestor IDs
 */
export function getAncestors(nodeId: string, nodes: Record<string, BuilderNode>): string[] {
  const ancestors: string[] = []
  let current = nodes[nodeId]

  while (current?.parentId) {
    ancestors.push(current.parentId)
    current = nodes[current.parentId]
  }

  return ancestors
}

/**
 * Get all descendant IDs
 */
export function getDescendants(nodeId: string, nodes: Record<string, BuilderNode>): string[] {
  const descendants: string[] = []
  const node = nodes[nodeId]

  if (!node) return descendants

  const traverse = (id: string) => {
    const n = nodes[id]
    if (n) {
      n.children.forEach((childId) => {
        descendants.push(childId)
        traverse(childId)
      })
    }
  }

  traverse(nodeId)
  return descendants
}

/**
 * Check if node can be moved to target
 */
export function canMoveNode(nodeId: string, targetId: string | null, nodes: Record<string, BuilderNode>): boolean {
  // Can't move to self
  if (nodeId === targetId) return false

  // Can't move to own descendant
  if (targetId) {
    const descendants = getDescendants(nodeId, nodes)
    if (descendants.includes(targetId)) return false
  }

  return true
}

/**
 * Get node depth in tree
 */
export function getNodeDepth(nodeId: string, nodes: Record<string, BuilderNode>): number {
  return getAncestors(nodeId, nodes).length
}

/**
 * Get siblings of a node
 */
export function getSiblings(nodeId: string, nodes: Record<string, BuilderNode>): string[] {
  const node = nodes[nodeId]
  if (!node) return []

  if (!node.parentId) {
    // Root level - would need rootIds from state
    return []
  }

  const parent = nodes[node.parentId]
  if (!parent) return []

  return parent.children.filter((id) => id !== nodeId)
}

/**
 * Find node by predicate
 */
export function findNode(
  nodes: Record<string, BuilderNode>,
  predicate: (node: BuilderNode) => boolean,
): BuilderNode | null {
  for (const node of Object.values(nodes)) {
    if (predicate(node)) return node
  }
  return null
}

/**
 * Filter nodes by predicate
 */
export function filterNodes(
  nodes: Record<string, BuilderNode>,
  predicate: (node: BuilderNode) => boolean,
): BuilderNode[] {
  return Object.values(nodes).filter(predicate)
}

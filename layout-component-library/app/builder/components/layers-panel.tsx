"use client"

import type React from "react"

import type { BuilderState } from "@/lib/builder/types"
import type { BuilderAction } from "@/lib/builder/actions"
import { Layers, ChevronRight, ChevronDown, EyeOff, Lock } from "lucide-react"
import { cn } from "@/lib/layouts/utils"

interface LayersPanelProps {
  state: BuilderState
  dispatch: React.Dispatch<BuilderAction>
}

export function LayersPanel({ state, dispatch }: LayersPanelProps) {
  const { nodes, rootIds, selectedIds } = state

  const renderNode = (nodeId: string, depth = 0) => {
    const node = nodes[nodeId]
    if (!node) return null

    const isSelected = selectedIds.includes(nodeId)
    const hasChildren = node.children.length > 0
    const isVisible = node.style?.visible !== false
    const isLocked = node.style?.locked === true

    return (
      <div key={nodeId}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-accent cursor-pointer rounded-sm",
            isSelected && "bg-accent",
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => dispatch({ type: "SELECT_NODE", payload: { nodeId, addToSelection: false } })}
        >
          {hasChildren ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0" />
          )}

          <Layers className="h-3 w-3 text-muted-foreground" />

          <span className="flex-1 truncate">{node.label}</span>

          <div className="flex items-center gap-1">
            {!isVisible && <EyeOff className="h-3 w-3 text-muted-foreground" />}
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
        </div>

        {hasChildren && <div>{node.children.map((childId) => renderNode(childId, depth + 1))}</div>}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="h-10 border-b flex items-center px-3">
        <h2 className="text-sm font-medium">Layers</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {rootIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Layers className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No blocks yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add a block to get started</p>
          </div>
        ) : (
          <div className="space-y-0.5">{rootIds.map((nodeId) => renderNode(nodeId))}</div>
        )}
      </div>
    </div>
  )
}

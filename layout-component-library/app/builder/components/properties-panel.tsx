"use client"

import type React from "react"

import type { BuilderState } from "@/lib/builder/types"
import type { BuilderAction } from "@/lib/builder/actions"
import { Settings } from "lucide-react"

interface PropertiesPanelProps {
  state: BuilderState
  dispatch: React.Dispatch<BuilderAction>
}

export function PropertiesPanel({ state, dispatch }: PropertiesPanelProps) {
  const { selectedIds, nodes } = state
  const selectedNode = selectedIds.length === 1 ? nodes[selectedIds[0]] : null

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="h-10 border-b flex items-center px-3">
        <h2 className="text-sm font-medium">Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!selectedNode ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Settings className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No selection</p>
            <p className="text-xs text-muted-foreground mt-1">Select a block to edit properties</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Block Type</label>
              <p className="text-sm mt-1">{selectedNode.type}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Label</label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_NODE",
                    payload: { nodeId: selectedNode.id, updates: { label: e.target.value } },
                  })
                }
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">ID</label>
              <p className="text-xs mt-1 font-mono text-muted-foreground">{selectedNode.id}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Children</label>
              <p className="text-sm mt-1">{selectedNode.children.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useReducer, useCallback, useMemo } from "react"
import { builderReducer, initialBuilderState } from "@/lib/builder/reducer"
import { Button } from "@/components/ui/button"
import { Undo2, Redo2, Play, Code } from "lucide-react"
import { ReactFlow, Background, Controls, MiniMap, Panel, type NodeTypes, type Node } from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { LayersPanel } from "./components/layers-panel"
import { PropertiesPanel } from "./components/properties-panel"
import { ComponentLibrary } from "./components/component-library"
import BlockNode from "./components/block-node"
import type { BuilderNode } from "@/lib/builder/types"
import { getSlotDefinitions } from "@/lib/builder/slots"

function getSlotPosition(slotId: string, slotIndex: number): { x: number; y: number } {
  const slotHeight = 140
  const headerHeight = 80
  const slotGap = 12

  return {
    x: 20,
    y: headerHeight + slotIndex * (slotHeight + slotGap),
  }
}

export default function BuilderPage() {
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState)

  const canUndo = state.history.past.length > 0
  const canRedo = state.history.future.length > 0

  const nodeTypes: NodeTypes = useMemo(() => ({ block: BlockNode }), [])

  const nodes: Node[] = useMemo(() => {
    const flowNodes: Node[] = []

    Object.values(state.nodes).forEach((node: BuilderNode) => {
      const isRoot = !node.parentId
      const slotId = node.metadata?.slotId

      // Calculate position
      let position = { x: 100, y: 100 }

      if (!isRoot && slotId) {
        // Child node in a slot - position relative to parent
        const parent = state.nodes[node.parentId!]
        if (parent) {
          const slotDefinitions = getSlotDefinitions(parent.type)
          if (slotDefinitions) {
            const slotIndex = slotDefinitions.findIndex((s: any) => s.id === slotId)
            position = getSlotPosition(slotId, slotIndex)
          }
        }
      } else if (!isRoot) {
        // Child node without slot
        position = { x: 50, y: 50 }
      } else {
        // Root node - use stored position or default
        position = { x: 100 + flowNodes.length * 500, y: 100 }
      }

      flowNodes.push({
        id: node.id,
        type: "block",
        position,
        data: { node, dispatch },
        parentId: node.parentId || undefined,
        extent: node.parentId ? ("parent" as const) : undefined,
      })
    })

    return flowNodes
  }, [state.nodes])

  const onNodesChange = useCallback(() => {
    // TODO: Handle node position changes and sync back to builder state
  }, [])

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Layout Builder</h1>
          <span className="text-xs text-muted-foreground">React Flow Edition</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "REDO" })}
            disabled={!canRedo}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button variant="ghost" size="sm" title="Preview">
            <Play className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="View Code">
            <Code className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* React Flow Canvas with Panels */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          fitView
          className="bg-muted/20"
        >
          <Background />
          <Controls />
          <MiniMap />

          {/* Left Panel - Layers */}
          <Panel
            position="top-left"
            className="bg-card border rounded-lg shadow-lg m-4 w-64 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col"
          >
            <LayersPanel state={state} dispatch={dispatch} />
          </Panel>

          {/* Right Panel - Properties */}
          <Panel
            position="top-right"
            className="bg-card border rounded-lg shadow-lg m-4 w-80 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col"
          >
            <PropertiesPanel state={state} dispatch={dispatch} />
          </Panel>

          {/* Bottom Panel - Component Library */}
          <Panel
            position="bottom-center"
            className="bg-card border rounded-lg shadow-lg mb-4 w-[600px] max-h-48 overflow-hidden flex flex-col"
          >
            <ComponentLibrary dispatch={dispatch} />
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}

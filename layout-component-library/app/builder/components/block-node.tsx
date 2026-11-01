"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { BuilderNode, ContainerNode } from "@/lib/builder/types"
import { Card } from "@/components/ui/card"
import { Layers, Layout, Navigation, Loader2, Box } from "lucide-react"
import { getSlotDefinitions } from "@/lib/builder/slots"
import { SlotPlaceholder } from "./slot-placeholder"
import { SlotMenu } from "./slot-menu"

interface BlockNodeData {
  node: BuilderNode
  dispatch: React.Dispatch<any>
}

function getBlockIcon(type: string) {
  if (type.startsWith("shell:")) return Layers
  if (type.startsWith("layout:")) return Layout
  if (type.startsWith("nav:")) return Navigation
  if (type.startsWith("loading:")) return Loader2
  if (type.startsWith("section:")) return Box
  return Box
}

function BlockNode({ data, selected }: NodeProps<BlockNodeData>) {
  const { node, dispatch } = data
  const Icon = getBlockIcon(node.type)

  const slotDefinitions = getSlotDefinitions(node.type)
  const isContainer = !!slotDefinitions

  const handleAddToSlot = (slotId: string, blockType: string) => {
    const newNode: BuilderNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockType as any,
      label: blockType.split(":")[1] || "Block",
      parentId: node.id,
      children: [],
      props: {},
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        slotId, // Track which slot this belongs to
      },
    }

    dispatch({
      type: "ADD_NODE_TO_SLOT",
      payload: {
        node: newNode,
        parentId: node.id,
        slotId,
      },
    })
  }

  if (isContainer && slotDefinitions) {
    const containerNode = node as ContainerNode
    const slots = containerNode.slots || {}

    return (
      <Card
        className={`min-w-[400px] p-4 cursor-pointer transition-all ${
          selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
        }`}
      >
        <Handle type="target" position={Position.Top} className="w-3 h-3" />

        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{node.label}</div>
            <div className="text-xs text-muted-foreground truncate">{node.type}</div>
          </div>
        </div>

        <div className="space-y-3">
          {slotDefinitions.map((slot) => {
            const slotChildren = slots[slot.id] || []
            const isEmpty = slotChildren.length === 0

            return (
              <div key={slot.id}>
                {isEmpty ? (
                  <SlotMenu slot={slot} onSelect={(blockType) => handleAddToSlot(slot.id, blockType)}>
                    <div className="cursor-pointer">
                      <SlotPlaceholder slot={slot} onAddClick={() => {}} />
                    </div>
                  </SlotMenu>
                ) : (
                  <Card className="p-3 bg-muted/50">
                    <div className="text-xs font-medium text-muted-foreground mb-2">{slot.label}</div>
                    <div className="text-xs text-muted-foreground">{slotChildren.length} item(s)</div>
                  </Card>
                )}
              </div>
            )
          })}
        </div>

        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </Card>
    )
  }

  return (
    <Card
      className={`min-w-[200px] p-3 cursor-pointer transition-all ${
        selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{node.label}</div>
          <div className="text-xs text-muted-foreground truncate">{node.type}</div>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {node.children.length} child{node.children.length !== 1 ? "ren" : ""}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </Card>
  )
}

export default memo(BlockNode)

"use client"

import type React from "react"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Layers, Layout, Box, Navigation } from "lucide-react"
import type { BlockType, SlotDefinition } from "@/lib/builder/types"
import { getAvailableBlocksForSlot } from "@/lib/builder/slots"

interface SlotMenuProps {
  slot: SlotDefinition
  onSelect: (blockType: BlockType) => void
  children: React.ReactNode
}

function getBlockIcon(type: BlockType) {
  if (type.startsWith("shell:")) return Layers
  if (type.startsWith("layout:")) return Layout
  if (type.startsWith("nav:")) return Navigation
  if (type.startsWith("section:")) return Box
  return Box
}

function getBlockLabel(type: BlockType): string {
  const [category, name] = type.split(":")
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function SlotMenu({ slot, onSelect, children }: SlotMenuProps) {
  const [open, setOpen] = useState(false)
  const availableBlocks = getAvailableBlocksForSlot(slot)

  const handleSelect = (blockType: BlockType) => {
    onSelect(blockType)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="font-medium text-sm">Add to {slot.label}</div>
          {slot.description && <div className="text-xs text-muted-foreground mt-1">{slot.description}</div>}
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {availableBlocks.map((blockType) => {
              const Icon = getBlockIcon(blockType)
              return (
                <Button
                  key={blockType}
                  variant="ghost"
                  className="w-full justify-start gap-2 h-auto py-2"
                  onClick={() => handleSelect(blockType)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{getBlockLabel(blockType)}</div>
                    <div className="text-xs text-muted-foreground">{blockType}</div>
                  </div>
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

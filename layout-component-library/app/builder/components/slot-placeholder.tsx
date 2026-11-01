"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { SlotDefinition } from "@/lib/builder/types"

interface SlotPlaceholderProps {
  slot: SlotDefinition
  onAddClick: () => void
}

export function SlotPlaceholder({ slot, onAddClick }: SlotPlaceholderProps) {
  return (
    <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/5 p-6 flex flex-col items-center justify-center gap-3 min-h-[120px] hover:border-muted-foreground/50 hover:bg-muted/10 transition-colors">
      <div className="text-center">
        <div className="font-medium text-sm text-muted-foreground">{slot.label}</div>
        {slot.description && <div className="text-xs text-muted-foreground/75 mt-1">{slot.description}</div>}
      </div>
      <Button variant="outline" size="sm" onClick={onAddClick} className="gap-2 bg-transparent">
        <Plus className="h-4 w-4" />
        Add Content
      </Button>
    </Card>
  )
}

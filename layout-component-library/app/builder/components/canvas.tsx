"use client"

import type React from "react"

import type { BuilderState } from "@/lib/builder/types"
import type { BuilderAction } from "@/lib/builder/actions"
import { ZoomIn, ZoomOut, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CanvasProps {
  state: BuilderState
  dispatch: React.Dispatch<BuilderAction>
}

export function Canvas({ state, dispatch }: CanvasProps) {
  const { canvas, nodes, rootIds } = state
  const zoomPercent = Math.round(canvas.zoom * 100)

  return (
    <div className="h-full flex flex-col bg-muted/20">
      <div className="h-10 border-b flex items-center justify-between px-3 bg-card">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Canvas</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: Math.max(0.1, canvas.zoom - 0.1) } })}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-12 text-center">{zoomPercent}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: Math.min(2, canvas.zoom + 0.1) } })}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "RESET_CANVAS" })} title="Reset view">
            <Maximize className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div
          className="bg-background rounded-lg shadow-lg mx-auto"
          style={{
            width: `${canvas.viewport.width}px`,
            minHeight: `${canvas.viewport.height}px`,
            transform: `scale(${canvas.zoom})`,
            transformOrigin: "top center",
          }}
        >
          {rootIds.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-center p-8">
              <div>
                <p className="text-muted-foreground mb-2">Empty canvas</p>
                <p className="text-sm text-muted-foreground">Add blocks from the toolbar to start building</p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {rootIds.map((nodeId) => {
                const node = nodes[nodeId]
                return (
                  <div key={nodeId} className="border-2 border-dashed border-primary/20 rounded p-4 mb-4">
                    <div className="text-sm font-medium text-muted-foreground">{node.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{node.type}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

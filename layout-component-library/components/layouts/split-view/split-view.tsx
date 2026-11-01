"use client"

import { cn } from "@/lib/layouts/utils"
import { useSplitViewState } from "./hooks"
import { Panel } from "./panel"
import { ResizeHandle } from "./resize-handle"
import type { SplitViewProps } from "./types"
import React from "react"

export function SplitView({ config, children, className, onStateChange }: SplitViewProps) {
  const {
    direction = "horizontal",
    panels,
    persistState = false,
    storageKey = "split-view-state",
    showHandles = true,
    handleSize = 8,
    gap = 0,
  } = config

  const { state, updatePanelSize, togglePanelCollapse } = useSplitViewState(panels, persistState, storageKey)

  // Notify parent of state changes
  React.useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  const isHorizontal = direction === "horizontal"

  // Convert children to array
  const childArray = React.Children.toArray(children)

  // Match children with panel configs
  const panelElements = panels.map((panelConfig, index) => {
    const panelState = state.panels[panelConfig.id]
    const child = childArray[index]

    if (!panelState || !child) return null

    return (
      <React.Fragment key={panelConfig.id}>
        <Panel
          config={panelConfig}
          size={panelState.size}
          collapsed={panelState.collapsed}
          onToggleCollapse={panelConfig.collapsible ? () => togglePanelCollapse(panelConfig.id) : undefined}
        >
          {child}
        </Panel>

        {/* Add resize handle between panels (except after last panel) */}
        {index < panels.length - 1 && panelConfig.resizable && showHandles && (
          <ResizeHandle
            direction={isHorizontal ? "horizontal" : "vertical"}
            size={handleSize}
            onResize={(delta) => {
              const nextPanel = panels[index + 1]
              const currentSize = panelState.size
              const nextSize = state.panels[nextPanel.id].size

              // Calculate new sizes
              const newCurrentSize = Math.max(
                panelConfig.minSize || 100,
                Math.min(panelConfig.maxSize || Number.POSITIVE_INFINITY, currentSize + delta),
              )
              const newNextSize = Math.max(
                nextPanel.minSize || 100,
                Math.min(nextPanel.maxSize || Number.POSITIVE_INFINITY, nextSize - delta),
              )

              // Update both panels
              updatePanelSize(panelConfig.id, newCurrentSize)
              updatePanelSize(nextPanel.id, newNextSize)
            }}
          />
        )}
      </React.Fragment>
    )
  })

  return (
    <div
      className={cn("flex h-full w-full", isHorizontal ? "flex-row" : "flex-col", config.className, className)}
      style={{ gap: gap > 0 ? `${gap * 0.25}rem` : undefined }}
      role="group"
      aria-label={config.name || "Split view layout"}
    >
      {panelElements}
    </div>
  )
}

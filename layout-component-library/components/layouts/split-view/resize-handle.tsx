"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { cn } from "@/lib/layouts/utils"
import type { ResizeHandleProps } from "./types"

export function ResizeHandle({ direction, onResize, className, size = 8 }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)

  const isHorizontal = direction === "horizontal"

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setStartPos(isHorizontal ? e.clientX : e.clientY)
    },
    [isHorizontal],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = isHorizontal ? e.clientX : e.clientY
      const delta = currentPos - startPos
      onResize(delta)
      setStartPos(currentPos)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, startPos, onResize, isHorizontal])

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 bg-border transition-colors hover:bg-primary/20",
        isHorizontal ? "cursor-col-resize" : "cursor-row-resize",
        isDragging && "bg-primary/30",
        className,
      )}
      style={{
        width: isHorizontal ? `${size}px` : "100%",
        height: isHorizontal ? "100%" : `${size}px`,
      }}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      aria-label="Resize panel"
    >
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "opacity-100",
        )}
      >
        <div className={cn("rounded-full bg-primary/50", isHorizontal ? "h-8 w-1" : "h-1 w-8")} />
      </div>
    </div>
  )
}

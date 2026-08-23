"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface ProgressiveBlurProps {
  className?: string
  height?: string
  position?: "top" | "bottom" | "both"
  blurLevels?: number[]
  children?: React.ReactNode
}

/**
 * A small, React-Bits-style gradual blur. Each layer covers the complete
 * curtain and uses a deliberately overlapping mask; the blur values change
 * continuously through the overlap instead of producing one hard stripe per
 * value. Keeping the default at three layers limits backdrop-filter work while
 * preserving the progressive dissolve.
 */
export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [2, 6, 14],
}: ProgressiveBlurProps) {
  const levels = blurLevels.length > 0 ? blurLevels : [2, 6, 14]
  const band = 100 / levels.length
  const overlap = Math.min(32, band * 0.82)
  const direction = position === "top" ? "to top" : "to bottom"

  const layers = levels.map((blur, index) => {
    const start = Math.max(0, index * band - overlap)
    const solidStart = Math.min(100, index * band + band * 0.06)
    const solidEnd = Math.min(100, (index + 1) * band - band * 0.06)
    const end = Math.min(100, (index + 1) * band + overlap)
    const isEdgeLayer = index === levels.length - 1
    // Leave a soft, non-zero mask at the exact section edge. This prevents a
    // one-pixel sharp strip while the blur still dissolves naturally inward.
    const edgeStop = isEdgeLayer
      ? "rgba(0,0,0,1) 100%"
      : `rgba(0,0,0,0) ${end}%`
    const verticalMask = `linear-gradient(${direction}, rgba(0,0,0,0) ${start}%, rgba(0,0,0,1) ${solidStart}%, rgba(0,0,0,1) ${solidEnd}%, ${edgeStop})`

    return (
      <div
        key={`blur-${index}`}
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          zIndex: index + 1,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          maskImage: verticalMask,
          WebkitMaskImage: verticalMask,
        }}
      />
    )
  })

  return (
    <div
      className={cn(
        "gradient-blur pointer-events-none absolute inset-x-0 z-10",
        className,
        position === "top"
          ? "top-0"
          : position === "bottom"
            ? "bottom-0"
            : "inset-y-0"
      )}
      style={{ height: position === "both" ? "100%" : height }}
    >
      {layers}
    </div>
  )
}

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
 * React-Bits-style gradual blur. Each layer covers the full curtain with a
 * smooth linear-gradient mask — no flat plateau, no discrete stripe. The
 * masks overlap generously so the dissolve is continuous even with just
 * three layers. The strongest blur sits at the section edge; each successive
 * layer fades in earlier toward the content.
 */
export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [2, 6, 14],
}: ProgressiveBlurProps) {
  const levels = blurLevels.length > 0 ? blurLevels : [2, 6, 14]
  const direction = position === "top" ? "to top" : "to bottom"

  const layers = levels.map((blur, index) => {
    // Each layer fades from transparent → opaque over a broad segment.
    // Layers overlap heavily: layer 0 fades 0→45%, layer 1 fades 25→78%,
    // layer 2 fades 55→100%. No banding, no plateaus.
    const fadeStart = Math.max(0, (index - 0.55) * (100 / levels.length))
    const fadeEnd = Math.min(100, (index + 1.45) * (100 / levels.length))
    const maskEnd = index === levels.length - 1
      ? "rgba(0,0,0,1) 100%"
      : `rgba(0,0,0,0) ${fadeEnd}%`
    const verticalMask = `linear-gradient(${direction}, rgba(0,0,0,0) ${fadeStart}%, rgba(0,0,0,1) ${fadeEnd}%, ${maskEnd})`

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

"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface ProgressiveBlurProps {
  className?: string
  height?: string
  position?: "top" | "bottom" | "both"
  blurLevels?: number[]
  /**
   * When true the blur dissolves on BOTH sides of the curtain: transparent at
   * each edge, full strength in the middle band. Use for section curtains
   * (reviews, chatbot) where a hard edge at the outer side reads as a sharp
   * cut. The default asymmetric mode (navbar, hero bottom) keeps the strongest
   * blur AT the section edge, which is the correct look for viewport-edge bars.
   */
  symmetric?: boolean
  children?: React.ReactNode
}

/**
 * React-Bits-style gradual blur. Each layer covers the full curtain with a
 * smooth linear-gradient mask — no flat plateau, no discrete stripe. The
 * masks overlap generously so the dissolve is continuous even with just
 * three layers. The strongest blur sits at the section edge; each successive
 * layer fades in earlier toward the content. With `symmetric`, the strongest
 * blur sits in the MIDDLE of the curtain and every edge dissolves to 0 — a
 * true halo with no sharp cut on either side.
 */
export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [2, 6, 14],
  symmetric = false,
}: ProgressiveBlurProps) {
  const levels = blurLevels.length > 0 ? blurLevels : [1, 4, 9, 18]
  const total = levels.length
  const direction = position === "top" ? "to top" : "to bottom"

  const layers = levels.map((blur, index) => {
    let verticalMask: string
    if (symmetric) {
      // Halo shape: transparent at both edges, opaque in the middle band.
      // Every layer widens its band a bit, so the composite ramps 0 → max
      // blur smoothly from either side — no sharp line inside or outside.
      const edgeFade = 5 + ((index + 1) / total) * 38
      verticalMask = `linear-gradient(${direction}, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${edgeFade}%, rgba(0,0,0,1) ${100 - edgeFade}%, rgba(0,0,0,0) 100%)`
    } else {
      // Edge shape: transparent at the content side, opaque from the section
      // edge outward (strongest blur at the edge — right for viewport bars).
      const zoneStart = Math.max(0, (index - 0.6) / total * 100)
      const opaqueAt = Math.min(100, (index + 0.85) / total * 100)
      verticalMask = `linear-gradient(${direction}, rgba(0,0,0,0) ${zoneStart}%, rgba(0,0,0,1) ${opaqueAt}%, rgba(0,0,0,1) 100%)`
    }

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

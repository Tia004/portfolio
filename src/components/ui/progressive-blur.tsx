"use client"

import React from "react"

import { cn } from "@/lib/utils"

export interface ProgressiveBlurProps {
  className?: string
  height?: string
  position?: "top" | "bottom" | "both"
  blurLevels?: number[]
  /** Horizontal dissolve (% of width at each end). IMPORTANT: the fade is
   *  baked into the blur layers themselves, NOT applied on a wrapper element.
   *  A wrapper with mask-image becomes a backdrop root, so the backdrop-filter
   *  of the layers inside samples only the wrapper's own (transparent) content
   *  and the blur becomes INVISIBLE — the reviews/chatbot curtains had exactly
   *  this bug. Pass 0 for full-width bands (navbar, hero). */
  edgeFade?: number
  children?: React.ReactNode
}

/**
 * Lightweight progressive blur ("gradient blur"). Each layer is a masked
 * backdrop-filter band; the masks tile the band height adaptively (any number
 * of layers, not just 8) with soft overlapping fades so there is no banding.
 * blurLevels is ordered WEAKEST → STRONGEST: the strongest lands at the
 * curtain edge (where content disappears), the weakest toward the interior.
 *
 * Fewer layers = proportionally fewer backdrop-filter elements. 3 layers is
 * enough for a light, visible dissolve and costs ~1/3 of the old 8-layer
 * stack (reviews has 2 curtains, chatbot 1, navbar/hero 2-3 more — 40 vs 15
 * backdrop-filters on the page).
 */
export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [0.5, 1, 2, 4, 8, 16, 32, 64],
  edgeFade = 0,
}: ProgressiveBlurProps) {
  const n = blurLevels.length
  const band = 100 / n
  // Soft edge on each bump (fraction of a band that fades on both sides).
  const fade = band * 0.6

  const layers = blurLevels.map((blur, i) => {
    const from = Math.max(0, i * band - fade)
    const fullA = i * band + band * 0.1
    const fullB = Math.min(100, (i + 1) * band - band * 0.1)
    const to = Math.min(100, (i + 1) * band + fade)

    // Direction flip puts the strongest layer (last in blurLevels) at the
    // curtain edge: for a bottom curtain the edge is the bottom (to bottom,
    // 100%), for a top curtain the edge is the top (to top, 100%).
    const vertical =
      position === "bottom"
        ? `linear-gradient(to bottom, rgba(0,0,0,0) ${from}%, rgba(0,0,0,1) ${fullA}%, rgba(0,0,0,1) ${fullB}%, rgba(0,0,0,0) ${to}%)`
        : `linear-gradient(to top, rgba(0,0,0,0) ${from}%, rgba(0,0,0,1) ${fullA}%, rgba(0,0,0,1) ${fullB}%, rgba(0,0,0,0) ${to}%)`

    let maskImage = vertical
    let maskComposite: string | undefined
    if (edgeFade > 0) {
      // Horizontal dissolve of the band's left/right ends — combined INSIDE
      // the layer (intersect), never on a wrapper, so no backdrop root is
      // created and the blur keeps sampling the content behind it.
      const horizontal = `linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${edgeFade}%, rgba(0,0,0,1) ${100 - edgeFade}%, rgba(0,0,0,0) 100%)`
      maskImage = `${vertical}, ${horizontal}`
      maskComposite = "intersect"
    }

    return (
      <div
        key={`blur-${i}`}
        className="absolute inset-0"
        style={{
          zIndex: i + 1,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          maskImage,
          WebkitMaskImage: maskImage,
          maskComposite,
          WebkitMaskComposite: maskComposite === "intersect" ? "source-in" : undefined,
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
      style={{
        height: position === "both" ? "100%" : height,
      }}
    >
      {layers}
    </div>
  )
}

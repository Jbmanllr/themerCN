"use client"

import { Sparkles } from "lucide-react"

interface SparklesIconProps {
  className?: string
}

/**
 * lucide's Sparkles as a decorative (`aria-hidden`) icon. The editor no longer
 * draws it (the AI chat's empty state uses lucide's Sparkles directly); it
 * stays exported from `components/index.ts`.
 */
export function SparklesIcon({ className }: SparklesIconProps) {
  return <Sparkles aria-hidden className={className} />
}

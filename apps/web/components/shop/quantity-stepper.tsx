"use client"

import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"
import { cn } from "@workspace/ui/lib/utils"

/**
 * − qty +. `of` names the thing counted in the buttons' labels ("Increase
 * quantity of Ethiopia Guji"). Decrease is disabled at `min`.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  of,
  className,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  of?: string
  className?: string
}) {
  const suffix = of ? ` of ${of}` : ""
  return (
    <ButtonGroup className={cn("rounded-full border", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Decrease quantity${suffix}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon aria-hidden />
      </Button>
      <output
        aria-label={`Quantity${suffix}`}
        aria-live="polite"
        className="flex w-8 items-center justify-center text-sm font-medium tabular-nums"
      >
        {value}
      </output>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Increase quantity${suffix}`}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon aria-hidden />
      </Button>
    </ButtonGroup>
  )
}

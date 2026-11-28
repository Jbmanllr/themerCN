"use client"

import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"

/**
 * − qty +. `of` names the thing counted in the buttons' labels ("Increase
 * quantity of Ethiopia Guji"). Decrease is disabled at 1.
 */
export function QuantityStepper({
  value,
  onChange,
  of,
}: {
  value: number
  onChange: (value: number) => void
  of?: string
}) {
  const suffix = of ? ` of ${of}` : ""
  return (
    <ButtonGroup className="rounded-full border">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Decrease quantity${suffix}`}
        disabled={value <= 1}
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

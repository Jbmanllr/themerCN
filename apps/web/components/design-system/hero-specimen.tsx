"use client"

import { useId } from "react"

import { Illustration } from "@/components/illustrations/illustration"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

/** A small product tile built from several components, for the index. */
export function HeroSpecimen() {
  const id = useId()
  return (
    <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:px-6">
      <div className="grid size-28 shrink-0 place-items-center rounded-3xl bg-muted">
        <Illustration seed="beans" className="size-20" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-heading text-xl">Ethiopia Guji</span>
          <Badge variant="secondary">New</Badge>
        </div>
        <ToggleGroup
          variant="outline"
          spacing={0}
          size="sm"
          defaultValue={["250g"]}
          aria-label="Bag size"
        >
          <ToggleGroupItem value="250g">250 g</ToggleGroupItem>
          <ToggleGroupItem value="1kg">1 kg</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id={`${id}-grind`} size="sm" defaultChecked />
          <Label htmlFor={`${id}-grind`}>Grind for filter</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm">Add to bag</Button>
          <Button size="sm" variant="outline">
            Brew guide
          </Button>
        </div>
      </div>
    </div>
  )
}

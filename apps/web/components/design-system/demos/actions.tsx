"use client"

import {
  BoldIcon,
  ItalicIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  UnderlineIcon,
} from "lucide-react"

import { State } from "@/components/design-system/specimen"
import { Button } from "@workspace/ui/components/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@workspace/ui/components/button-group"
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd"
import { Toggle } from "@workspace/ui/components/toggle"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { Spinner } from "@workspace/ui/components/spinner"

export function ButtonDemo() {
  return (
    <>
      <State label="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </State>
      <State label="Sizes">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Add to bag">
          <ShoppingBagIcon />
        </Button>
      </State>
      <State label="With icon, loading and disabled">
        <Button>
          <ShoppingBagIcon data-icon="inline-start" />
          Add to bag
        </Button>
        <Button variant="outline" disabled>
          <Spinner data-icon="inline-start" />
          Roasting
        </Button>
        <Button disabled>Sold out</Button>
      </State>
    </>
  )
}

export function ButtonGroupDemo() {
  return (
    <>
      <State label="Joined buttons">
        <ButtonGroup>
          <Button variant="outline">Whole bean</Button>
          <Button variant="outline">Filter</Button>
          <Button variant="outline">Espresso</Button>
        </ButtonGroup>
      </State>
      <State label="With text and separator">
        <ButtonGroup aria-label="Quantity">
          <Button variant="outline" size="icon" aria-label="One fewer">
            <MinusIcon />
          </Button>
          <ButtonGroupText>2 bags</ButtonGroupText>
          <Button variant="outline" size="icon" aria-label="One more">
            <PlusIcon />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button>Subscribe</Button>
          <ButtonGroupSeparator />
          <Button>Every 2 weeks</Button>
        </ButtonGroup>
      </State>
      <State label="Vertical">
        <ButtonGroup orientation="vertical">
          <Button variant="outline">Light roast</Button>
          <Button variant="outline">Medium roast</Button>
          <Button variant="outline">Dark roast</Button>
        </ButtonGroup>
      </State>
    </>
  )
}

export function ToggleDemo() {
  return (
    <>
      <State label="Off and on">
        <Toggle aria-label="Bold">
          <BoldIcon />
        </Toggle>
        <Toggle aria-label="Italic" defaultPressed>
          <ItalicIcon />
        </Toggle>
      </State>
      <State label="Outline, with text">
        <Toggle variant="outline">Decaf only</Toggle>
        <Toggle variant="outline" defaultPressed>
          In stock
        </Toggle>
      </State>
      <State label="Sizes and disabled">
        <Toggle size="sm" variant="outline">
          Small
        </Toggle>
        <Toggle size="lg" variant="outline">
          Large
        </Toggle>
        <Toggle variant="outline" disabled>
          Disabled
        </Toggle>
      </State>
    </>
  )
}

export function ToggleGroupDemo() {
  return (
    <>
      <State label="Many pressed">
        <ToggleGroup multiple defaultValue={["bold"]} aria-label="Text style">
          <ToggleGroupItem value="bold" aria-label="Bold">
            <BoldIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <ItalicIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <UnderlineIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </State>
      <State label="One pressed, outline, joined">
        <ToggleGroup
          variant="outline"
          spacing={0}
          defaultValue={["250g"]}
          aria-label="Bag size"
        >
          <ToggleGroupItem value="250g">250 g</ToggleGroupItem>
          <ToggleGroupItem value="500g">500 g</ToggleGroupItem>
          <ToggleGroupItem value="1kg">1 kg</ToggleGroupItem>
        </ToggleGroup>
      </State>
    </>
  )
}

export function KbdDemo() {
  return (
    <>
      <State label="Single keys">
        <Kbd>D</Kbd>
        <Kbd>Esc</Kbd>
        <Kbd>⌘</Kbd>
      </State>
      <State label="A chord, in a sentence">
        <p className="text-sm text-muted-foreground">
          Press{" "}
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>{" "}
          to search the shop, and <Kbd>Esc</Kbd> to close the search.
        </p>
      </State>
    </>
  )
}

"use client"

import {
  ChevronsUpDownIcon,
  CoffeeIcon,
  FileCodeIcon,
  PackageIcon,
  ShoppingBagIcon,
  TruckIcon,
} from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { Illustration } from "@/components/illustrations/illustration"
import { State } from "@/components/design-system/specimen"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@workspace/ui/components/code-block"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@workspace/ui/components/marker"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export function CardDemo() {
  return (
    <>
      <State label="Header, content, footer" className="grid">
        <Card>
          <CardHeader>
            <CardTitle>Ethiopia Guji</CardTitle>
            <CardDescription>Natural process, light roast</CardDescription>
            <CardAction>
              <Badge variant="secondary">New</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            Blueberry and jasmine up front, milk chocolate as it cools.
          </CardContent>
          <CardFooter className="justify-between">
            <span className="font-medium">£12.50</span>
            <Button size="sm">Add to bag</Button>
          </CardFooter>
        </Card>
      </State>
      <State label="Small" className="grid">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Next delivery</CardTitle>
            <CardDescription>Tuesday 20 October</CardDescription>
          </CardHeader>
        </Card>
      </State>
    </>
  )
}

export function BadgeDemo() {
  return (
    <>
      <State label="Variants">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="link">Link</Badge>
      </State>
      <State label="With an icon, as a count">
        <Badge>
          <TruckIcon data-icon="inline-start" />
          Ships Tuesday
        </Badge>
        <Badge variant="secondary" className="tabular-nums">
          12
        </Badge>
      </State>
    </>
  )
}

export function AvatarDemo() {
  return (
    <>
      <State label="Sizes">
        <Avatar size="sm">
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>GH</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>KJ</AvatarFallback>
        </Avatar>
      </State>
      <State label="With a badge, in a group">
        <Avatar>
          <AvatarFallback>AL</AvatarFallback>
          <AvatarBadge />
        </Avatar>
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>KJ</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+4</AvatarGroupCount>
        </AvatarGroup>
      </State>
    </>
  )
}

const orders = [
  {
    id: "NJ-1042",
    coffee: "Ethiopia Guji",
    status: "Shipped",
    total: "£25.00",
  },
  {
    id: "NJ-1038",
    coffee: "Colombia Huila",
    status: "Delivered",
    total: "£11.50",
  },
  { id: "NJ-1031", coffee: "House blend", status: "Delivered", total: "£9.00" },
]

export function TableDemo() {
  return (
    <State label="Header, rows, footer and caption" className="grid">
      <Table>
        <TableCaption>Your last three orders.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Coffee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono">{order.id}</TableCell>
              <TableCell>{order.coffee}</TableCell>
              <TableCell>{order.status}</TableCell>
              <TableCell className="text-right tabular-nums">
                {order.total}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right tabular-nums">£45.50</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </State>
  )
}

const brews = [
  { month: "May", filter: 42, espresso: 18 },
  { month: "Jun", filter: 38, espresso: 24 },
  { month: "Jul", filter: 51, espresso: 22 },
  { month: "Aug", filter: 47, espresso: 30 },
  { month: "Sep", filter: 55, espresso: 28 },
  { month: "Oct", filter: 61, espresso: 33 },
]

const brewConfig = {
  filter: { label: "Filter", color: "var(--chart-1)" },
  espresso: { label: "Espresso", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ChartDemo() {
  return (
    <>
      <State label="Bars, with a legend" className="grid">
        <ChartContainer config={brewConfig} className="aspect-video w-full">
          <BarChart data={brews} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="filter" fill="var(--color-filter)" radius={6} />
            <Bar dataKey="espresso" fill="var(--color-espresso)" radius={6} />
          </BarChart>
        </ChartContainer>
      </State>
      <State label="Stacked area" className="grid">
        <ChartContainer config={brewConfig} className="aspect-video w-full">
          <AreaChart data={brews} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="espresso"
              stackId="a"
              type="natural"
              fill="var(--color-espresso)"
              fillOpacity={0.4}
              stroke="var(--color-espresso)"
            />
            <Area
              dataKey="filter"
              stackId="a"
              type="natural"
              fill="var(--color-filter)"
              fillOpacity={0.4}
              stroke="var(--color-filter)"
            />
          </AreaChart>
        </ChartContainer>
      </State>
    </>
  )
}

const slides = [
  { seed: "beans", title: "Beans" },
  { seed: "grinder", title: "Grinder" },
  { seed: "dripper", title: "Dripper" },
  { seed: "cup", title: "Cup" },
] as const

export function CarouselDemo() {
  return (
    <State label="First slide, with arrows" className="grid px-12">
      <Carousel>
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.seed} className="basis-2/3">
              <div className="flex flex-col items-center gap-2 rounded-2xl border p-4">
                <Illustration seed={slide.seed} className="size-24" />
                <span className="text-sm font-medium">{slide.title}</span>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </State>
  )
}

export function ItemDemo() {
  return (
    <>
      <State label="Default, outline and muted" className="grid">
        <Item>
          <ItemMedia variant="icon">
            <PackageIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Order NJ-1042</ItemTitle>
            <ItemDescription>
              Shipped Tuesday, arriving Thursday.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button size="sm" variant="outline">
              Track
            </Button>
          </ItemActions>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Outline</ItemTitle>
            <ItemDescription>A bordered row.</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemTitle>Muted, small</ItemTitle>
          </ItemContent>
        </Item>
      </State>
      <State label="A group with separators" className="grid">
        <ItemGroup>
          {["Ethiopia Guji", "Colombia Huila"].map((name, index) => (
            <div key={name}>
              {index > 0 && <ItemSeparator />}
              <Item size="sm">
                <ItemMedia variant="icon">
                  <CoffeeIcon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{name}</ItemTitle>
                </ItemContent>
              </Item>
            </div>
          ))}
        </ItemGroup>
      </State>
    </>
  )
}

export function MarkerDemo() {
  return (
    <>
      <State label="Default" className="grid">
        <Marker>
          <MarkerIcon>
            <TruckIcon />
          </MarkerIcon>
          <MarkerContent>Shipped on Tuesday</MarkerContent>
        </Marker>
      </State>
      <State label="Separator and border" className="grid">
        <Marker variant="separator">
          <MarkerContent>Yesterday</MarkerContent>
        </Marker>
        <Marker variant="border">
          <MarkerContent>Earlier this week</MarkerContent>
        </Marker>
      </State>
    </>
  )
}

const recipe = `const dose = 15 // grams
const water = dose * 16
pour({ water, seconds: 45 })`

export function CodeBlockDemo() {
  return (
    <>
      <State label="Header, line numbers, copy" className="grid">
        <CodeBlock>
          <CodeBlockHeader>
            <CodeBlockTitle>
              <FileCodeIcon />
              recipe.ts
            </CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton value={recipe} />
            </CodeBlockActions>
          </CodeBlockHeader>
          <CodeBlockContent lineNumbers>{recipe}</CodeBlockContent>
        </CodeBlock>
      </State>
      <State label="Added, removed and highlighted lines" className="grid">
        <CodeBlock size="sm">
          <CodeBlockContent>
            <CodeBlockLine variant="removed">const ratio = 15</CodeBlockLine>
            <CodeBlockLine variant="added">const ratio = 16</CodeBlockLine>
            <CodeBlockLine variant="highlighted">
              pour(dose * ratio)
            </CodeBlockLine>
          </CodeBlockContent>
        </CodeBlock>
      </State>
      <State label="Destructive" className="grid">
        <CodeBlock variant="destructive" size="sm">
          <CodeBlockContent>Error: the kettle is empty</CodeBlockContent>
        </CodeBlock>
      </State>
    </>
  )
}

export function EmptyDemo() {
  return (
    <State label="Nothing yet, with an action" className="grid">
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBagIcon />
          </EmptyMedia>
          <EmptyTitle>Your bag is empty</EmptyTitle>
          <EmptyDescription>
            Pick a coffee and it will wait here until you check out.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm">Browse the shop</Button>
        </EmptyContent>
      </Empty>
    </State>
  )
}

export function AccordionDemo() {
  return (
    <State label="One section open" className="grid">
      <Accordion defaultValue={["ship"]}>
        <AccordionItem value="ship">
          <AccordionTrigger>When do you ship?</AccordionTrigger>
          <AccordionContent>
            Every Tuesday, two days after roasting.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="pause">
          <AccordionTrigger>Can I pause my subscription?</AccordionTrigger>
          <AccordionContent>
            Yes, for up to three months, from Settings.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="decaf" disabled>
          <AccordionTrigger>Do you sell decaf?</AccordionTrigger>
          <AccordionContent>Soon.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </State>
  )
}

export function CollapsibleDemo() {
  return (
    <>
      {[false, true].map((open) => (
        <State
          key={String(open)}
          label={open ? "Open" : "Closed"}
          className="grid"
        >
          <Collapsible defaultOpen={open} className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">3 coffees in your box</span>
              <CollapsibleTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Show coffees"
                  />
                }
              >
                <ChevronsUpDownIcon />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="grid gap-1 text-sm text-muted-foreground">
              <span>Ethiopia Guji</span>
              <span>Colombia Huila</span>
              <span>House blend</span>
            </CollapsibleContent>
          </Collapsible>
        </State>
      ))}
    </>
  )
}

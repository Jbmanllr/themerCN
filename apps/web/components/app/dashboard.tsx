// The /app dashboard's pieces. Server components drawn from lib/mock; the
// charts are plain SVG in Theme tokens so they follow the Themer and render
// the same on every load.
import Link from "next/link"

import { Illustration } from "@/components/illustrations/illustration"
import { formatDate, formatPrice } from "@/lib/format"
import type { Metric, Order, OrderStatus, Product } from "@/lib/mock"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
})

/** `0.081` → `+8.1%`, `-0.022` → `-2.2%`. */
export function formatDelta(delta: number): string {
  return percent.format(delta)
}

const weekFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

/** Labels for a weekly series whose last point is the week ending `end`. */
function weekLabels(count: number, end: string): string[] {
  const last = Date.parse(`${end}T00:00:00Z`)
  return Array.from({ length: count }, (_, index) =>
    weekFormat.format(new Date(last - (count - 1 - index) * 7 * 86_400_000))
  )
}

function Sparkline({ series }: { series: number[] }) {
  const min = Math.min(...series)
  const span = Math.max(...series) - min || 1
  const points = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * 100
      const y = 28 - ((value - min) / span) * 24
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden
      className="h-10 w-full overflow-visible"
    >
      <polyline
        points={points}
        className="fill-none stroke-primary"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function MetricCard({ metric }: { metric: Metric }) {
  const labelId = `metric-${metric.id}`
  const up = metric.delta >= 0
  return (
    <Card role="group" aria-labelledby={labelId} size="sm">
      <CardHeader>
        <CardDescription id={labelId}>{metric.label}</CardDescription>
        <CardTitle className="font-heading text-3xl tabular-nums">
          {metric.value}
        </CardTitle>
        <CardAction>
          <Badge variant={up ? "secondary" : "destructive"}>
            <span className="sr-only">{up ? "Up" : "Down"} on last week: </span>
            {formatDelta(metric.delta)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Sparkline series={metric.series} />
      </CardContent>
    </Card>
  )
}

/** Weekly revenue as bars; the latest week in the primary colour. */
export function RevenueChart({
  metric,
  weekEnding,
}: {
  metric: Metric
  weekEnding: string
}) {
  const labels = weekLabels(metric.series.length, weekEnding)
  const max = Math.ceil(Math.max(...metric.series) / 1000) * 1000
  const ticks = [0, max / 2, max]
  const width = 640
  const height = 220
  const left = 48
  const bottom = 28
  const plot = { w: width - left, h: height - bottom - 8 }
  const slot = plot.w / metric.series.length
  const y = (value: number) => 8 + plot.h - (value / max) * plot.h

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>
          <h3 className="font-heading text-xl">Revenue by week</h3>
        </CardTitle>
        <CardDescription>
          Eight weeks of beans, gear and subscriptions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Weekly revenue from ${labels[0]} to ${labels.at(-1)}: ${metric.series
            .map((value) => `$${value.toLocaleString("en-US")}`)
            .join(", ")}`}
          className="h-auto w-full text-xs"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeDasharray={tick === 0 ? undefined : "4 4"}
              />
              <text
                x={left - 8}
                y={y(tick)}
                dy="0.35em"
                textAnchor="end"
                className="fill-muted-foreground"
              >
                {tick === 0 ? "$0" : `$${tick / 1000}k`}
              </text>
            </g>
          ))}
          {metric.series.map((value, index) => {
            const latest = index === metric.series.length - 1
            const x = left + index * slot + slot * 0.2
            return (
              <g key={labels[index]}>
                <rect
                  x={x}
                  y={y(value)}
                  width={slot * 0.6}
                  height={y(0) - y(value)}
                  rx={6}
                  className={latest ? "fill-primary" : "fill-chart-2"}
                />
                <text
                  x={x + slot * 0.3}
                  y={height - 8}
                  textAnchor="middle"
                  className={
                    latest ? "fill-foreground" : "fill-muted-foreground"
                  }
                >
                  {labels[index]}
                </text>
              </g>
            )
          })}
        </svg>
      </CardContent>
    </Card>
  )
}

export function SubscriptionCard({
  plan,
  nextDelivery,
  coffees,
}: {
  plan: string
  nextDelivery: string
  coffees: Product[]
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardDescription>Your subscription</CardDescription>
        <CardTitle>
          <h3 className="font-heading text-2xl">{plan}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-3 pr-32">
        <p>
          Next box roasts on{" "}
          <span className="font-medium">{formatDate(nextDelivery)}</span>.
        </p>
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {coffees.map((coffee) => (
            <li key={coffee.slug}>
              <Link
                href={`/shop/p/${coffee.slug}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {coffee.name}
              </Link>
              , ground for filter
            </li>
          ))}
        </ul>
        <Illustration
          seed="beans"
          className="absolute right-4 bottom-0 size-28"
        />
      </CardContent>
      <CardFooter className="gap-2">
        <Button nativeButton={false} render={<Link href="/app/settings" />}>
          Change coffees
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/app/settings" />}
        >
          Skip a delivery
        </Button>
      </CardFooter>
    </Card>
  )
}

const statusLabel: Record<OrderStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  refunded: "Refunded",
}

const statusVariant: Record<
  OrderStatus,
  "secondary" | "outline" | "destructive"
> = {
  paid: "secondary",
  pending: "outline",
  refunded: "destructive",
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>
          <h3 id="latest-orders" className="font-heading text-xl">
            Latest orders
          </h3>
        </CardTitle>
        <CardDescription>
          Every bag that left the roastery this week.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table aria-labelledby="latest-orders">
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{order.customer}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[order.status]}>
                    {statusLabel[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(order.date)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    order.status === "refunded" &&
                      "text-muted-foreground line-through"
                  )}
                >
                  {formatPrice(order.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

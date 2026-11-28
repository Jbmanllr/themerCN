import type { Cents, ISODate } from "./mock/types"

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

/** `1800` → `$18.00`. */
export function formatPrice(cents: Cents): string {
  return usd.format(cents / 100)
}

/** A plan's price as its card shows it: `1200` → `$12`, `1250` → `$12.50`. */
export function formatPlanPrice(cents: Cents): string {
  return formatPrice(cents).replace(/\.00$/, "")
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

/** `2026-09-18` → `Sep 18, 2026`, the same on server and client. */
export function formatDate(date: ISODate): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`))
}

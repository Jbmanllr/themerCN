// Pricing plans, the signed-in account and the /app dashboard's data.
import type { Metric, Order, Plan } from "./types"

/**
 * The signed-in subscriber of the /app screens: the one record behind the
 * AppShell's account button, the dashboard and the settings form.
 * integrity.test.ts checks its plan and coffees exist.
 */
export const account = {
  name: "Ada Brennan",
  email: "ada@example.com",
  address: "14 Larkspur Lane\nPortland, OR 97214",
  /** A `plans` id. */
  planId: "night-shift",
  grind: "Filter",
  /** The coffees in the next box (product slugs). */
  coffees: ["ethiopia-guji", "night-owl-blend"],
} as const

export const plans: Plan[] = [
  {
    id: "sampler",
    name: "Sampler",
    monthly: 1400,
    yearly: 1200,
    description: "One 250 g bag a month, a different coffee each time.",
    features: ["1 bag every 4 weeks", "Roaster's notes", "Skip any month"],
  },
  {
    id: "night-shift",
    name: "Night Shift",
    monthly: 3200,
    yearly: 2800,
    description: "Two coffees every two weeks, matched to how you brew.",
    features: [
      "2 bags every 2 weeks",
      "Ground to your brewer",
      "Brew Assistant in the app",
      "Free shipping",
    ],
    highlighted: true,
  },
  {
    id: "cafe",
    name: "Café",
    monthly: 9600,
    yearly: 8400,
    description: "For the office, the studio, or a very serious household.",
    features: [
      "2 kg every 2 weeks",
      "Espresso and filter",
      "Equipment check-ins",
      "Invoicing",
    ],
  },
]

export const metrics: Metric[] = [
  {
    id: "revenue",
    label: "Revenue",
    value: "$4,210",
    delta: 0.081,
    series: [2980, 3120, 3340, 3290, 3610, 3880, 3895, 4210],
  },
  {
    id: "subscribers",
    label: "Active subscribers",
    value: "312",
    delta: 0.043,
    series: [268, 274, 281, 287, 293, 299, 299, 312],
  },
  {
    id: "orders",
    label: "Orders",
    value: "148",
    delta: -0.022,
    series: [139, 151, 160, 144, 157, 162, 151, 148],
  },
  {
    id: "rating",
    label: "Average rating",
    value: "4.8",
    delta: 0.004,
    series: [4.7, 4.7, 4.8, 4.7, 4.8, 4.8, 4.8, 4.8],
  },
]

export const orders: Order[] = [
  {
    id: "NJ-1048",
    customer: "Ada Brennan",
    email: "ada@example.com",
    status: "paid",
    total: 3200,
    date: "2026-10-12",
  },
  {
    id: "NJ-1047",
    customer: "Kenji Mori",
    email: "kenji@example.com",
    status: "paid",
    total: 10700,
    date: "2026-10-12",
  },
  {
    id: "NJ-1046",
    customer: "Lucía Ferrer",
    email: "lucia@example.com",
    status: "pending",
    total: 1800,
    date: "2026-10-11",
  },
  {
    id: "NJ-1045",
    customer: "Sam Whitlock",
    email: "sam@example.com",
    status: "paid",
    total: 6400,
    date: "2026-10-11",
  },
  {
    id: "NJ-1044",
    customer: "Priya Nair",
    email: "priya@example.com",
    status: "refunded",
    total: 2100,
    date: "2026-10-10",
  },
  {
    id: "NJ-1043",
    customer: "Jonas Becker",
    email: "jonas@example.com",
    status: "paid",
    total: 3900,
    date: "2026-10-09",
  },
  {
    id: "NJ-1042",
    customer: "Chloé Dubois",
    email: "chloe@example.com",
    status: "paid",
    total: 9600,
    date: "2026-10-09",
  },
  {
    id: "NJ-1041",
    customer: "Malik Hassan",
    email: "malik@example.com",
    status: "pending",
    total: 1600,
    date: "2026-10-08",
  },
]

/** The plan the signed-in account is on. */
export function getAccountPlan(): Plan | undefined {
  return plans.find((plan) => plan.id === account.planId)
}

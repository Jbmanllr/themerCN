// The Playground's mock data shapes (decided in Jbmanllr/themerCN#8). All data
// is fixed: no backend, no randomness, no clock, so screenshots are stable.

/** An in-repo illustration (components/illustrations) and its alt text. */
export type IllustrationSeed =
  "nightjar" | "kettle" | "beans" | "cup" | "grinder" | "dripper" | "moon"

export type ImageRef = {
  kind: "illustration" | "photo-placeholder"
  seed: IllustrationSeed
  alt: string
}

/** Money in cents (USD). Format with `formatPrice` from lib/format. */
export type Cents = number

/** An ISO 8601 date, `YYYY-MM-DD`. */
export type ISODate = string

export type CategorySlug = "beans" | "gear" | "subscriptions"

export type Category = {
  slug: CategorySlug
  name: string
  blurb: string
  image: ImageRef
}

export type ProductBadge = "new" | "sale" | "bestseller"

export type ProductOption = { name: string; values: string[] }

export type Product = {
  slug: string
  name: string
  category: CategorySlug
  price: Cents
  compareAt?: Cents
  rating: number
  reviewCount: number
  badges: ProductBadge[]
  options: ProductOption[]
  image: ImageRef
  description: string
  /** Tasting notes or specs, shown as a short list. */
  details: string[]
}

/** A cart line, held only in the client cart store (lib/stores/cart.ts). */
export type CartLine = {
  productSlug: string
  /** Chosen value per option name, e.g. `{ Grind: "Filter", Size: "250g" }`. */
  option: Record<string, string>
  qty: number
}

/** A block of rich content: blog post bodies and chat messages. */
export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "code"; code: string; lang?: string }
  | { type: "image"; image: ImageRef; caption?: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  /** A product card, as the Brew Assistant suggests one. */
  | { type: "product"; productSlug: string }

export type AuthorId = "mara" | "theo" | "ines"

export type Author = {
  id: AuthorId
  name: string
  role: string
  avatar: ImageRef
}

export type PostCategorySlug = "brewing" | "origins" | "gear"

export type PostCategory = {
  slug: PostCategorySlug
  name: string
  blurb: string
}

export type Post = {
  slug: string
  title: string
  excerpt: string
  category: PostCategorySlug
  author: AuthorId
  publishedAt: ISODate
  readingMinutes: number
  cover: ImageRef
  body: Block[]
}

export type Plan = {
  id: string
  name: string
  /** Price per month, in cents, billed monthly / billed yearly. */
  monthly: Cents
  yearly: Cents
  description: string
  features: string[]
  highlighted?: boolean
}

export type Metric = {
  id: string
  label: string
  /** Display value, already formatted (e.g. "$4,210" or "38"). */
  value: string
  /** Change against the previous period, as a fraction (0.081 = +8.1%). */
  delta: number
  /** One point per week, oldest first, for the sparkline and chart. */
  series: number[]
}

export type OrderStatus = "paid" | "pending" | "refunded"

export type Order = {
  id: string
  customer: string
  email: string
  status: OrderStatus
  total: Cents
  date: ISODate
}

export type ChatMessage = { role: "user" | "assistant"; content: Block[] }

export type ChatThread = {
  id: string
  title: string
  updatedAt: ISODate
  messages: ChatMessage[]
}

/**
 * A canned Brew Assistant answer: the first reply whose `match` tests the
 * user's message is streamed block by block, `delayMs` apart; the one with
 * `match: "fallback"` answers anything else.
 */
export type ScriptedReply = {
  match: RegExp | "fallback"
  reply: Block[]
  delayMs: number
}

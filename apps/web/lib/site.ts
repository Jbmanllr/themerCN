// Site-wide navigation and links, shared by the header, footer, AppShell and
// DocsShell. Add a route here when a screen ticket adds a page to a nav.

export const BRAND = {
  name: "Nightjar Coffee Co.",
  shortName: "Nightjar",
  tagline: "Good coffee, slowly.",
} as const

/** The themercn package README, where the Playground sends developers. */
export const README_URL =
  "https://github.com/Jbmanllr/themerCN/tree/main/packages/themer#readme"

export const REPO_URL = "https://github.com/Jbmanllr/themerCN"

export type NavLink = { href: string; label: string }

/** The site header's main nav. */
export const primaryNav: NavLink[] = [
  { href: "/shop", label: "Shop" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
]

/** The site footer's sitemap. */
export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Shop",
    links: [
      { href: "/shop/beans", label: "Beans" },
      { href: "/shop/gear", label: "Gear" },
      { href: "/shop/subscriptions", label: "Subscriptions" },
      { href: "/cart", label: "Cart" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { href: "/blog", label: "Journal" },
      { href: "/blog/category/brewing", label: "Brew guides" },
      { href: "/features", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
      { href: "/app", label: "Your account" },
    ],
  },
  {
    heading: "Playground",
    links: [
      { href: "/design-system", label: "Design system" },
      { href: "/design-system/tokens", label: "Tokens" },
      { href: README_URL, label: "Install themercn" },
      { href: REPO_URL, label: "Source on GitHub" },
    ],
  },
]

/** The AppShell sidebar. */
export const appNav: NavLink[] = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/chat", label: "Brew Assistant" },
  { href: "/app/settings", label: "Settings" },
]

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href)
}

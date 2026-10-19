// Site-wide navigation and links, shared by the header, footer, AppShell and
// DocsShell. Add a route here when a screen ticket adds a page to a nav.
// No client directive: Server Components (the AppShell) read it too.

import {
  LayoutDashboardIcon,
  MessageCircleIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

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

/** True when `pathname` is `href` or a page under it (`/` matches only itself). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export type AppNavEntry = NavLink & { icon: LucideIcon }

/**
 * The AppShell sidebar. The matched entry is the active one and names the
 * top bar, so a new app screen is added here only.
 */
export const appNav: AppNavEntry[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/app/chat", label: "Brew Assistant", icon: MessageCircleIcon },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon },
]

/** The `appNav` entry for `pathname`: the most specific one it is under. */
export function appNavEntryFor(pathname: string): AppNavEntry | undefined {
  return appNav
    .filter((entry) => isActivePath(pathname, entry.href))
    .reduce<AppNavEntry | undefined>(
      (best, entry) =>
        !best || entry.href.length > best.href.length ? entry : best,
      undefined
    )
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href)
}

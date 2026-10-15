import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { CartButton } from "@/components/site/cart-button"
import { NavLink } from "@/components/site/nav-link"
import { primaryNav } from "@/lib/site"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const navLinkClass =
  "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:text-foreground data-active:underline data-active:decoration-primary data-active:decoration-2 data-active:underline-offset-8"

/** The site header shared by the marketing, blog and shop route groups. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center">
            {primaryNav.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} className={navLinkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="/design-system"
          className="hidden rounded-full border border-dashed border-primary/40 px-3 py-1 text-xs text-primary outline-none hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 sm:inline-flex"
        >
          Design system
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Log in
          </Link>
          <CartButton />
        </div>
      </div>
      {/* Small screens: the same nav as a scrollable row. */}
      <nav aria-label="Main, compact" className="border-t md:hidden">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
          {primaryNav.map((link) => (
            <li key={link.href}>
              <NavLink
                href={link.href}
                className={cn(navLinkClass, "inline-block")}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
          <li className="sm:hidden">
            <NavLink
              href="/design-system"
              className={cn(navLinkClass, "inline-block")}
            >
              Design system
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  )
}

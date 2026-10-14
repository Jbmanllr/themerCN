"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps } from "react"

import { cn } from "@workspace/ui/lib/utils"

/** True when `pathname` is `href` or a page under it (`/` matches only itself). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** A nav link that marks itself `aria-current="page"` on its section. */
export function NavLink({
  href,
  exact = false,
  className,
  ...props
}: ComponentProps<typeof Link> & { href: string; exact?: boolean }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : isActivePath(pathname, href)

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={cn(className)}
      {...props}
    />
  )
}

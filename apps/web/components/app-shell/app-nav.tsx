"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps } from "react"

import { appNavEntryFor } from "@/lib/site"
import { SidebarMenuButton } from "@workspace/ui/components/sidebar"

// The AppShell's only client code: the parts that read the pathname.

/**
 * A sidebar link marked active on its screen. An `appNav` section is active
 * when it is the matched entry; an `exact` link only on its own page.
 */
export function AppNavButton({
  href,
  exact = false,
  ...props
}: Omit<ComponentProps<typeof SidebarMenuButton>, "isActive" | "render"> & {
  href: string
  exact?: boolean
}) {
  const pathname = usePathname()
  const active = exact
    ? pathname === href
    : appNavEntryFor(pathname)?.href === href

  return (
    <SidebarMenuButton
      isActive={active}
      render={<Link href={href} />}
      {...props}
    />
  )
}

/** The top bar's title: the label of the matched `appNav` entry. */
export function AppPageTitle(props: ComponentProps<"h1">) {
  const pathname = usePathname()
  return <h1 {...props}>{appNavEntryFor(pathname)?.label}</h1>
}

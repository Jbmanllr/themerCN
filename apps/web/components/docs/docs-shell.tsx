import Link from "next/link"
import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { NavLink } from "@/components/site/nav-link"
import { componentGroups, uiComponents } from "@/lib/design-system"
import { README_URL } from "@/lib/site"
import { cn } from "@workspace/ui/lib/utils"

const itemClass =
  "block rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:bg-muted data-active:font-medium data-active:text-foreground"

function DocsNav() {
  return (
    <nav aria-label="Design system" className="flex flex-col gap-6 text-sm">
      <ul className="flex flex-col gap-0.5">
        <li>
          <NavLink href="/design-system" exact className={itemClass}>
            Overview
          </NavLink>
        </li>
        <li>
          <NavLink href="/design-system/tokens" className={itemClass}>
            Tokens
          </NavLink>
        </li>
        <li>
          <a href={README_URL} className={itemClass}>
            Install themercn
          </a>
        </li>
      </ul>
      {componentGroups.map((group) => (
        <div key={group}>
          <h2 className="mb-1 px-2 text-xs font-medium text-muted-foreground">
            {group}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {uiComponents
              .filter((component) => component.group === group)
              .map((component) => (
                <li key={component.slug}>
                  <NavLink
                    href={`/design-system/${component.slug}`}
                    className={itemClass}
                  >
                    {component.name}
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/**
 * The `/design-system` layout: a top bar and a left nav listing every
 * packages/ui component (lib/design-system.ts), docs-site style.
 */
export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <span className="text-muted-foreground" aria-hidden>
            /
          </span>
          <Link href="/design-system" className="text-sm font-medium">
            Design system
          </Link>
          <a
            href={README_URL}
            className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Install themercn
          </a>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        <details className="border-b px-4 py-3 md:hidden">
          <summary className="cursor-pointer text-sm font-medium">
            Components
          </summary>
          <div className="pt-4">
            <DocsNav />
          </div>
        </details>
        <aside
          className={cn(
            "hidden w-60 shrink-0 border-r md:block",
            "sticky top-14 h-[calc(100svh-3.5rem)] overflow-y-auto px-4 py-6"
          )}
        >
          <DocsNav />
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

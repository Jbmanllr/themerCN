import type { ReactNode } from "react"

/** The h1 and lead of a design-system page. */
export function PageHeader({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <header className="max-w-2xl">
      <h1 className="font-heading text-4xl text-balance sm:text-5xl">
        {title}
      </h1>
      {children && (
        <div className="mt-4 text-lg text-pretty text-muted-foreground">
          {children}
        </div>
      )}
    </header>
  )
}

/**
 * Says which half follows the Themer: the page's own mode is live, the other
 * half keeps Nightjar's colours until you switch modes.
 */
export function ModeNote() {
  return (
    <p className="max-w-2xl text-sm text-muted-foreground">
      The half that matches the page&apos;s mode shows your Theme edits as you
      make them. The other half keeps Nightjar&apos;s colours until you switch
      mode with the Themer&apos;s mode toggle; radius, fonts, spacing, tracking
      and shadows follow your edits in both.
    </p>
  )
}

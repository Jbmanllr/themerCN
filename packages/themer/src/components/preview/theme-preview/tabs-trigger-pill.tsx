// The pill-shaped trigger of the preview tab bar: the stock `TabsTrigger` with
// a call-site `className` (`@workspace/ui` itself stays stock shadcn).
import { TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"

const TabsTriggerPill = ({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsTrigger>) => {
  return (
    <TabsTrigger
      className={cn(
        // The `dark:` classes restate the plain ones: tailwind-merge replaces a
        // class only with the same modifier, so without them the stock trigger's
        // own `dark:data-active:*` and `dark:hover:*` classes would win in dark.
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ring-offset-background transition-all hover:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:hover:text-muted-foreground/70 data-active:bg-secondary data-active:text-secondary-foreground dark:data-active:border-transparent dark:data-active:bg-secondary dark:data-active:text-secondary-foreground",
        className
      )}
      {...props}
    >
      {children}
    </TabsTrigger>
  )
}

export default TabsTriggerPill

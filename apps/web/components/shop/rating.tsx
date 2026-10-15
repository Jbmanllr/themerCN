import { StarIcon } from "lucide-react"

import type { Product } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

/** A product's average rating and review count. */
export function Rating({
  product,
  className,
}: {
  product: Pick<Product, "rating" | "reviewCount">
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground",
        className
      )}
    >
      <StarIcon aria-hidden className="size-3.5 fill-primary stroke-primary" />
      <span className="font-medium text-foreground tabular-nums">
        {product.rating.toFixed(1)}
      </span>
      <span className="tabular-nums">
        ({product.reviewCount}
        <span className="sr-only"> reviews</span>)
      </span>
    </span>
  )
}

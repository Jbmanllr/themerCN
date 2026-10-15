import { formatPrice } from "@/lib/format"
import type { Product } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

/** A product's price, with the struck-through price it replaces on sale. */
export function Price({
  product,
  className,
  id,
}: {
  product: Pick<Product, "price" | "compareAt">
  className?: string
  id?: string
}) {
  return (
    <span id={id} className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="tabular-nums">{formatPrice(product.price)}</span>
      {product.compareAt ? (
        <s className="text-[0.8em] text-muted-foreground tabular-nums">
          <span className="sr-only">was </span>
          {formatPrice(product.compareAt)}
        </s>
      ) : null}
    </span>
  )
}

import type { ProductBadge } from "@/lib/mock/types"
import { Badge } from "@workspace/ui/components/badge"

const labels: Record<ProductBadge, string> = {
  new: "New",
  sale: "On sale",
  bestseller: "Bestseller",
}

const variants = {
  new: "secondary",
  sale: "destructive",
  bestseller: "default",
} as const

export function ProductBadges({ badges }: { badges: ProductBadge[] }) {
  if (badges.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <Badge key={badge} variant={variants[badge]}>
          {labels[badge]}
        </Badge>
      ))}
    </span>
  )
}

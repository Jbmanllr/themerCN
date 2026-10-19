"use client"

import { ShoppingBagIcon } from "lucide-react"
import Link from "next/link"

import { useCartCount } from "@/lib/stores/cart"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

/** The header's cart link with the live item count. */
export function CartButton() {
  const count = useCartCount()

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
    >
      <ShoppingBagIcon aria-hidden />
      <span className="tabular-nums">{count}</span>
    </Link>
  )
}

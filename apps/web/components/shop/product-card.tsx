import Link from "next/link"
import { useId } from "react"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { Price } from "@/components/shop/price"
import { ProductBadges } from "@/components/shop/product-badges"
import { Rating } from "@/components/shop/rating"
import type { Product } from "@/lib/mock/types"

/**
 * A product in a grid. The product's name is the link, described by its price
 * and blurb, and stretched over the whole card; the illustration is decorative
 * here. The name alone keeps the link's accessible name equal to its text.
 */
export function ProductCard({ product }: { product: Product }) {
  const id = useId()
  return (
    <div className="group relative flex flex-col gap-3 rounded-3xl has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50">
      <div className="relative rounded-3xl border bg-card p-6 transition-colors group-hover:border-primary/50">
        <ImageRefIllustration
          image={{ ...product.image, alt: "" }}
          className="mx-auto aspect-square max-w-48 transition-transform duration-300 group-hover:-rotate-3 motion-reduce:transition-none"
        />
        <div className="absolute top-3 left-3">
          <ProductBadges badges={product.badges} />
        </div>
      </div>
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-heading text-lg leading-snug decoration-primary underline-offset-4 group-hover:underline">
            <Link
              href={`/shop/p/${product.slug}`}
              aria-describedby={`${id}-price ${id}-about`}
              className="outline-none after:absolute after:inset-0"
            >
              {product.name}
            </Link>
          </h3>
          <Price
            id={`${id}-price`}
            product={product}
            className="shrink-0 font-medium"
          />
        </div>
        <p
          id={`${id}-about`}
          className="line-clamp-2 text-sm text-muted-foreground"
        >
          {product.description}
        </p>
        <Rating product={product} className="mt-1" />
      </div>
    </div>
  )
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.slug}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

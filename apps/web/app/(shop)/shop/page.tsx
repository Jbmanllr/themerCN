import Link from "next/link"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { CategoryNav } from "@/components/shop/category-nav"
import { ProductGrid } from "@/components/shop/product-card"
import { categories, getProductsInCategory } from "@/lib/mock"

export const metadata = { title: "Shop" }

/** /shop: every category as a shelf of its products. */
export default function ShopPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 md:py-16">
      <header className="flex flex-col gap-6">
        <h1 className="max-w-2xl font-heading text-4xl leading-tight text-balance sm:text-5xl">
          Beans, gear and a standing order
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Everything we sell, we use. Beans are roasted on Tuesdays and shipped
          on Wednesdays, so they arrive rested and ready.
        </p>
        <CategoryNav />
      </header>

      {categories.map((category) => (
        <section
          key={category.slug}
          aria-labelledby={`shelf-${category.slug}`}
          className="flex flex-col gap-8 border-t pt-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <ImageRefIllustration
                image={{ ...category.image, alt: "" }}
                className="size-14 shrink-0"
              />
              <div>
                <h2
                  id={`shelf-${category.slug}`}
                  className="font-heading text-2xl"
                >
                  {category.name}
                </h2>
                <p className="text-muted-foreground">{category.blurb}</p>
              </div>
            </div>
            <Link
              href={`/shop/${category.slug}`}
              className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              All {category.name.toLowerCase()}
            </Link>
          </div>
          <ProductGrid products={getProductsInCategory(category.slug)} />
        </section>
      ))}
    </div>
  )
}

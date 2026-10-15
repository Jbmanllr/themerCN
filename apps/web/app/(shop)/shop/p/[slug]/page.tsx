import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { AddToCart } from "@/components/shop/add-to-cart"
import { Price } from "@/components/shop/price"
import { ProductBadges } from "@/components/shop/product-badges"
import { ProductGrid } from "@/components/shop/product-card"
import { Rating } from "@/components/shop/rating"
import {
  getCategory,
  getProduct,
  getProductsInCategory,
  products,
} from "@/lib/mock"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

export const dynamicParams = false

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/p/[slug]">): Promise<Metadata> {
  const product = getProduct((await params).slug)
  return { title: product?.name, description: product?.description }
}

/** /shop/p/[slug]: one product, its details and the buy box. */
export default async function ProductPage({
  params,
}: PageProps<"/shop/p/[slug]">) {
  const product = getProduct((await params).slug)
  if (!product) notFound()
  const category = getCategory(product.category)!
  const related = getProductsInCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 py-10 sm:px-6 md:py-14">
      <div className="flex flex-col gap-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/shop" />}>
                Shop
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/shop/${category.slug}`} />}>
                {category.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-16">
          <div className="rounded-[2.5rem] border bg-card p-8 sm:p-12 md:sticky md:top-24">
            <ImageRefIllustration
              image={product.image}
              className="mx-auto aspect-square max-w-sm"
            />
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <ProductBadges badges={product.badges} />
              <h1 className="font-heading text-4xl leading-tight sm:text-5xl">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <Price product={product} className="text-2xl font-medium" />
                <Rating product={product} />
              </div>
              <p className="max-w-prose text-lg text-muted-foreground">
                {product.description}
              </p>
            </div>

            <AddToCart product={product} />

            {/* The bag label: what you would read on the back of the pouch. */}
            <section
              aria-labelledby="product-details"
              className="rounded-3xl border-2 border-dashed border-primary/30 p-6"
            >
              <h2
                id="product-details"
                className="font-heading text-lg text-primary"
              >
                {product.category === "beans"
                  ? "On the bag"
                  : product.category === "gear"
                    ? "In the box"
                    : "How it works"}
              </h2>
              <ul className="mt-3 divide-y divide-dashed divide-border">
                {product.details.map((detail) => (
                  <li key={detail} className="py-2 text-sm">
                    {detail}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related" className="flex flex-col gap-8">
          <h2 id="related" className="font-heading text-2xl">
            More {category.name.toLowerCase()}
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  )
}

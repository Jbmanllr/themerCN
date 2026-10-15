import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { CategoryNav } from "@/components/shop/category-nav"
import { ProductGrid } from "@/components/shop/product-card"
import { categories, getCategory, getProductsInCategory } from "@/lib/mock"
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
  return categories.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]">): Promise<Metadata> {
  const category = getCategory((await params).category)
  return { title: category?.name }
}

/** /shop/[category]: one category's products. */
export default async function CategoryPage({
  params,
}: PageProps<"/shop/[category]">) {
  const category = getCategory((await params).category)
  if (!category) notFound()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 md:py-16">
      <header className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/shop" />}>
                  Shop
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="font-heading text-4xl sm:text-5xl">{category.name}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {category.blurb}
          </p>
          <CategoryNav />
        </div>
        <ImageRefIllustration
          image={category.image}
          className="hidden size-48 md:block"
        />
      </header>
      <ProductGrid products={getProductsInCategory(category.slug)} />
    </div>
  )
}

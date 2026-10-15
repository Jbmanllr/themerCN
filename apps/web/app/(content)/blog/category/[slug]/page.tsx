import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CategoryNav } from "@/components/blog/category-nav"
import { PostCard } from "@/components/blog/post-card"
import { PageIntro } from "@/components/marketing/page-intro"
import { getPostCategory, getPostsInCategory, postCategories } from "@/lib/mock"

// Every category is prerendered; any other slug is the 404.
export const dynamicParams = false

export function generateStaticParams() {
  return postCategories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/category/[slug]">): Promise<Metadata> {
  const { slug } = await params
  return { title: getPostCategory(slug)?.name }
}

export default async function JournalCategoryPage({
  params,
}: PageProps<"/blog/category/[slug]">) {
  const { slug } = await params
  const category = getPostCategory(slug)
  if (!category) notFound()

  return (
    <>
      <PageIntro
        title={category.name}
        lede={category.blurb}
        className="md:grid-cols-1"
      >
        <CategoryNav />
      </PageIntro>
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-14 px-4 pt-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {getPostsInCategory(category.slug).map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </>
  )
}

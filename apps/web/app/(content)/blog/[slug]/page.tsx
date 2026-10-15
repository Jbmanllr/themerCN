import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Blocks } from "@/components/blocks/blocks"
import { PostByline } from "@/components/blog/post-byline"
import { PostCard } from "@/components/blog/post-card"
import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { getPost, getPostCategory, posts } from "@/lib/mock"

// Every post is prerendered; any other slug is the 404.
export const dynamicParams = false

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  return { title: post?.title, description: post?.excerpt }
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()
  const category = getPostCategory(post.category)
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <>
      <article
        aria-labelledby="post-title"
        className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 md:pt-16"
      >
        <header className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col items-start gap-5">
            {category ? (
              <Link
                href={`/blog/category/${category.slug}`}
                className="rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {category.name}
              </Link>
            ) : null}
            <h1
              id="post-title"
              className="font-heading text-4xl leading-[1.08] text-balance sm:text-5xl"
            >
              {post.title}
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              {post.excerpt}
            </p>
            <PostByline post={post} showRole />
          </div>
          <div className="flex aspect-square items-center justify-center rounded-3xl bg-secondary p-10 md:p-12">
            <ImageRefIllustration image={post.cover} />
          </div>
        </header>
        <Blocks
          blocks={post.body}
          className="mt-14 max-w-[65ch] text-lg leading-relaxed"
        />
      </article>

      <section aria-labelledby="more-heading" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="more-heading" className="font-heading text-3xl">
            More from the journal
          </h2>
          <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((other) => (
              <PostCard key={other.slug} post={other} headingLevel={3} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

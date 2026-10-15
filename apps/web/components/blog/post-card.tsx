import Link from "next/link"

import { PostByline } from "@/components/blog/post-byline"
import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { getPostCategory } from "@/lib/mock"
import type { Post } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A post in a list. The title is the link; `featured` lays it out wide with a
 * larger cover. `headingLevel` keeps the outline right where the card sits.
 */
export function PostCard({
  post,
  featured = false,
  headingLevel = 2,
}: {
  post: Post
  featured?: boolean
  headingLevel?: 2 | 3
}) {
  const Heading = `h${headingLevel}` as const
  const category = getPostCategory(post.category)
  return (
    <article
      className={cn(
        "relative flex flex-col gap-5",
        featured && "md:grid md:grid-cols-[1fr_1.1fr] md:items-center md:gap-10"
      )}
    >
      <div
        className={cn(
          "flex aspect-[4/3] items-center justify-center rounded-3xl bg-secondary",
          featured ? "p-10" : "p-8"
        )}
      >
        <ImageRefIllustration
          image={{ ...post.cover, alt: "" }}
          className={featured ? "max-w-72" : "max-w-44"}
        />
      </div>
      <div className="flex flex-col items-start gap-3">
        {category ? (
          <p className="text-sm font-medium text-primary">{category.name}</p>
        ) : null}
        <Heading
          className={cn(
            "font-heading leading-tight text-balance",
            featured ? "text-3xl sm:text-4xl" : "text-2xl"
          )}
        >
          <Link
            href={`/blog/${post.slug}`}
            className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-3xl hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {post.title}
          </Link>
        </Heading>
        <p className={cn("text-muted-foreground", featured && "text-lg")}>
          {post.excerpt}
        </p>
        <PostByline post={post} className="mt-1" />
      </div>
    </article>
  )
}

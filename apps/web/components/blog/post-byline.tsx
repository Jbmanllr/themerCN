import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { formatDate } from "@/lib/format"
import { getAuthor } from "@/lib/mock"
import type { Post } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

/** Who wrote a post, when, and how long it takes to read. */
export function PostByline({
  post,
  showRole = false,
  className,
}: {
  post: Post
  showRole?: boolean
  className?: string
}) {
  const author = getAuthor(post.author)
  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <span className="size-9 shrink-0">
        <ImageRefIllustration image={{ ...author.avatar, alt: "" }} />
      </span>
      <div className="flex flex-col">
        <span className="font-medium text-foreground">
          {author.name}
          {showRole ? (
            <span className="font-normal text-muted-foreground">
              , {author.role.toLowerCase()}
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
          , {post.readingMinutes} min read
        </span>
      </div>
    </div>
  )
}

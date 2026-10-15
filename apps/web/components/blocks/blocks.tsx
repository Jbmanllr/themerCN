// The one renderer for `Block` content (lib/mock/types.ts), shared by journal
// post bodies and Brew Assistant messages. No hooks, so it works in server and
// client components. Typography comes from the parent: wrap it in a container
// that sets the text size and colour. `size="sm"` is the compact chat rhythm.

import Link from "next/link"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { formatPrice } from "@/lib/format"
import { getProduct } from "@/lib/mock"
import type { Block } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

type Size = "sm" | "md"

/** A product suggestion inside content, linking to its shop page. */
function ProductBlock({ slug, size }: { slug: string; size: Size }) {
  const product = getProduct(slug)
  if (!product) return null
  return (
    <Link
      href={`/shop/p/${product.slug}`}
      className={cn(
        "group flex items-center rounded-2xl border bg-card text-card-foreground transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50",
        size === "sm" ? "max-w-sm gap-3 p-2 pr-4" : "gap-4 p-3 pr-5"
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-xl bg-muted/40 p-1",
          size === "sm" ? "size-14" : "size-16"
        )}
      >
        <ImageRefIllustration image={{ ...product.image, alt: "" }} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold group-hover:underline">
          {product.name}
        </span>
        <span className="text-sm text-muted-foreground">
          {formatPrice(product.price)}
        </span>
      </span>
    </Link>
  )
}

/** One block of content. */
export function BlockView({
  block,
  size = "md",
}: {
  block: Block
  size?: Size
}) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>
    case "h2":
      return (
        <h2
          className={cn(
            "font-heading leading-tight",
            size === "sm" ? "text-[1.25em]" : "pt-2 text-[1.6em]"
          )}
        >
          {block.text}
        </h2>
      )
    case "quote":
      return (
        <figure className="border-l-4 border-accent pl-5">
          <blockquote className="font-heading text-[1.25em] leading-snug">
            {block.text}
          </blockquote>
          {block.cite ? (
            <figcaption className="mt-2 text-[0.875em] text-muted-foreground">
              {block.cite}
            </figcaption>
          ) : null}
        </figure>
      )
    case "code":
      return (
        <pre
          data-lang={block.lang}
          className={cn(
            "overflow-x-auto bg-muted font-mono text-foreground",
            size === "sm"
              ? "rounded-xl px-4 py-3 text-[0.8125rem] leading-6"
              : "rounded-2xl px-5 py-4 text-[0.875em]"
          )}
        >
          <code>{block.code}</code>
        </pre>
      )
    case "image":
      return (
        <figure
          className={cn("flex flex-col", size === "sm" ? "gap-2" : "gap-3")}
        >
          <div
            className={cn(
              "aspect-square w-full",
              size === "sm" ? "max-w-48" : "mx-auto max-w-xs"
            )}
          >
            <ImageRefIllustration image={block.image} />
          </div>
          {block.caption ? (
            <figcaption
              className={cn(
                "text-[0.875em] text-muted-foreground",
                size === "md" && "text-center"
              )}
            >
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      )
    case "list": {
      const List = block.ordered ? "ol" : "ul"
      return (
        <List
          className={cn(
            "flex flex-col gap-1.5 marker:text-primary",
            size === "sm" ? "pl-5" : "pl-6",
            block.ordered ? "list-decimal" : "list-disc"
          )}
        >
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </List>
      )
    }
    case "product":
      return <ProductBlock slug={block.productSlug} size={size} />
  }
}

/** A sequence of blocks, spaced as running text (`md`) or as chat (`sm`). */
export function Blocks({
  blocks,
  size = "md",
  className,
}: {
  blocks: Block[]
  size?: Size
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        size === "sm" ? "gap-3 text-sm leading-relaxed" : "gap-5",
        className
      )}
    >
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} size={size} />
      ))}
    </div>
  )
}

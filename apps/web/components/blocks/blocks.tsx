// The one renderer for `Block` content (lib/mock/types.ts), shared by journal
// post bodies and Brew Assistant messages. Typography comes from the parent:
// wrap it in a container that sets the text size and colour.

import Link from "next/link"

import { ImageRefIllustration } from "@/components/illustrations/illustration"
import { formatPrice } from "@/lib/format"
import { getProduct } from "@/lib/mock"
import type { Block } from "@/lib/mock/types"
import { cn } from "@workspace/ui/lib/utils"

/** A product suggestion inside content, linking to its shop page. */
function ProductBlock({ slug }: { slug: string }) {
  const product = getProduct(slug)
  if (!product) return null
  return (
    <Link
      href={`/shop/p/${product.slug}`}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-3 pr-5 text-card-foreground transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="size-16 shrink-0 rounded-xl bg-muted/40 p-1">
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
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>
    case "h2":
      return (
        <h2 className="pt-2 font-heading text-[1.6em] leading-tight">
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
          className="overflow-x-auto rounded-2xl bg-muted px-5 py-4 font-mono text-[0.875em] text-foreground"
        >
          <code>{block.code}</code>
        </pre>
      )
    case "image":
      return (
        <figure className="flex flex-col gap-3">
          <div className="mx-auto aspect-square w-full max-w-xs">
            <ImageRefIllustration image={block.image} />
          </div>
          {block.caption ? (
            <figcaption className="text-center text-[0.875em] text-muted-foreground">
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
            "flex flex-col gap-1.5 pl-6 marker:text-primary",
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
      return <ProductBlock slug={block.productSlug} />
  }
}

/** A sequence of blocks, spaced as running text. */
export function Blocks({
  blocks,
  className,
}: {
  blocks: Block[]
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  )
}

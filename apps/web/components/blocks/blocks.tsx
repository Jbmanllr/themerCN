// Renders the shared `Block` content (lib/mock/types.ts): blog post bodies
// and Brew Assistant messages. No hooks, so it works in server and client
// components. `size="sm"` is the compact chat rhythm.
import Link from "next/link"

import { Illustration } from "@/components/illustrations/illustration"
import { formatPrice } from "@/lib/format"
import { getProduct } from "@/lib/mock"
import type { Block } from "@/lib/mock"
import { cn } from "@workspace/ui/lib/utils"

type Size = "sm" | "md"

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
        size === "sm" ? "gap-3 text-sm leading-relaxed" : "gap-5 leading-7",
        className
      )}
    >
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} size={size} />
      ))}
    </div>
  )
}

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
            "font-heading",
            size === "sm" ? "text-lg" : "mt-4 text-2xl"
          )}
        >
          {block.text}
        </h2>
      )
    case "quote":
      return (
        <figure className="border-l-4 border-accent pl-4">
          <blockquote className="font-heading text-lg">{block.text}</blockquote>
          {block.cite && (
            <figcaption className="mt-2 text-sm text-muted-foreground">
              {block.cite}
            </figcaption>
          )}
        </figure>
      )
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl bg-muted px-4 py-3 font-mono text-[0.8125rem] leading-6">
          <code>{block.code}</code>
        </pre>
      )
    case "image":
      return (
        <figure className="flex flex-col gap-2">
          <Illustration
            seed={block.image.seed}
            alt={block.image.alt}
            className="aspect-[3/2] w-full rounded-2xl bg-muted/60"
          />
          {block.caption && (
            <figcaption className="text-sm text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      )
    case "list": {
      const List = block.ordered ? "ol" : "ul"
      return (
        <List
          className={cn(
            "flex flex-col gap-1 pl-5",
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

function ProductBlock({ slug }: { slug: string }) {
  const product = getProduct(slug)
  if (!product) return null
  return (
    <Link
      href={`/shop/p/${product.slug}`}
      className="group/product flex max-w-sm items-center gap-3 rounded-2xl border bg-card p-2 pr-4 text-card-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Illustration
        seed={product.image.seed}
        className="size-14 shrink-0 rounded-xl bg-muted"
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{product.name}</span>
        <span className="text-sm text-muted-foreground">
          {formatPrice(product.price)}
        </span>
      </span>
    </Link>
  )
}

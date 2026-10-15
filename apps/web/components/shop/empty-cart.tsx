import Link from "next/link"

import { Illustration } from "@/components/illustrations/illustration"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@workspace/ui/components/empty"

/** The cart and checkout when nothing is in the cart. */
export function EmptyCart() {
  return (
    <Empty className="mx-auto max-w-xl py-16">
      <EmptyHeader>
        <EmptyMedia>
          <Illustration seed="cup" className="size-32" />
        </EmptyMedia>
        <h1 className="font-heading text-3xl">Your cart is empty</h1>
        <EmptyDescription>
          The cart lives in this tab only, so a reload empties it. Pick a coffee
          or a tool and it will wait here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/shop" className={buttonVariants()}>
          Browse the shop
        </Link>
      </EmptyContent>
    </Empty>
  )
}

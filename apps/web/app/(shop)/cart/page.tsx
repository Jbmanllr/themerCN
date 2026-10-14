import { CartView } from "@/components/shop/cart-view"

export const metadata = { title: "Cart" }

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <CartView />
    </div>
  )
}

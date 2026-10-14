import { CheckoutView } from "@/components/shop/checkout-view"

export const metadata = { title: "Checkout" }

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <CheckoutView />
    </div>
  )
}

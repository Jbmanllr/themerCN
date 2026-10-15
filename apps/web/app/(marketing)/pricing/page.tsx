import { Faq } from "@/components/marketing/faq"
import { PageIntro } from "@/components/marketing/page-intro"
import { PlanGrid } from "@/components/marketing/plan-grid"
import { plans } from "@/lib/mock"

export const metadata = { title: "Pricing" }

const questions = [
  {
    question: "Can I skip a delivery?",
    answer:
      "Yes. Skip from your account up to the Sunday before roast day. Skipped bags cost nothing.",
  },
  {
    question: "What if I do not like a coffee?",
    answer:
      "Tell the Brew Assistant what you tasted. If a different recipe does not fix it, we send something else next time and credit the bag.",
  },
  {
    question: "Do you ship outside the US?",
    answer:
      "Not yet. We would rather get one country right than four countries late.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Any time. The new plan starts with your next roast, and yearly plans are prorated.",
  },
]

export default function PricingPage() {
  return (
    <>
      <PageIntro
        title="Pick a pace"
        lede="Three plans, all roasted to order and ground the way you brew. Skip, pause or switch whenever you like."
        seed="beans"
      />
      <section
        aria-label="Plans"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      >
        <PlanGrid plans={plans} />
      </section>
      <Faq
        heading="Questions people ask before subscribing"
        entries={questions}
      />
    </>
  )
}

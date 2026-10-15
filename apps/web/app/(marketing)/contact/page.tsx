import { ContactForm } from "@/components/marketing/contact-form"
import { PageIntro } from "@/components/marketing/page-intro"

export const metadata = { title: "Contact" }

export default function ContactPage() {
  return (
    <>
      <PageIntro
        title="Write to the roastery"
        lede="Questions about an order, a subscription or a coffee that tastes wrong. A person on the roasting team reads every message."
        seed="kettle"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 sm:px-6 md:grid-cols-[2fr_1fr]">
        <ContactForm />
        <aside
          aria-label="Other ways to reach us"
          className="flex flex-col gap-6"
        >
          <div>
            <h2 className="font-semibold">The roastery</h2>
            <address className="mt-2 text-muted-foreground not-italic">
              14 Larkspur Yard
              <br />
              Portland, OR 97214
            </address>
          </div>
          <div>
            <h2 className="font-semibold">Tasting room</h2>
            <p className="mt-2 text-muted-foreground">
              Saturdays, 9 to 1. We pour whatever came off the roaster that
              week.
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Wholesale</h2>
            <p className="mt-2 text-muted-foreground">
              We roast for a handful of cafés and offices. Pick Wholesale as the
              topic and tell us how much you brew in a week.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}

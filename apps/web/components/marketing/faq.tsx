import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"

export type FaqEntry = { question: string; answer: string }

/** Questions and answers as an accordion, under an `<h2>`. */
export function Faq({
  heading,
  entries,
}: {
  heading: string
  entries: FaqEntry[]
}) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_2fr]"
    >
      <h2 id="faq-heading" className="font-heading text-3xl text-balance">
        {heading}
      </h2>
      <Accordion>
        {entries.map((entry) => (
          <AccordionItem key={entry.question} value={entry.question}>
            <AccordionTrigger>{entry.question}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{entry.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

import Link from "next/link"

import { HeroSpecimen } from "@/components/design-system/hero-specimen"
import { ModeNote, PageHeader } from "@/components/design-system/page-header"
import { SpecimenSplit } from "@/components/design-system/specimen"
import { componentGroups, uiComponents } from "@/lib/design-system"
import { README_URL } from "@/lib/site"

export const metadata = { title: "Design system" }

export default function Page() {
  return (
    <div className="flex flex-col gap-12">
      <PageHeader title="Design system">
        <p>
          Every component Nightjar is built from, in light and dark side by
          side. Open the Themer and change a token: every specimen here follows
          it.
        </p>
      </PageHeader>

      <div className="flex flex-col gap-4">
        <SpecimenSplit>
          <HeroSpecimen />
        </SpecimenSplit>
        <ModeNote />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <Link
          href="/design-system/tokens"
          className="font-medium underline underline-offset-4"
        >
          Tokens
        </Link>
        <span className="text-muted-foreground">
          Every colour, radius, font, tracking, shadow and spacing value.
        </span>
        <a
          href={README_URL}
          className="font-medium underline underline-offset-4 sm:ml-auto"
        >
          Install themercn in your app
        </a>
      </div>

      <div className="flex flex-col gap-10">
        {componentGroups.map((group) => {
          const members = uiComponents.filter((c) => c.group === group)
          return (
            <section key={group} aria-labelledby={`group-${group}`}>
              <h2
                id={`group-${group}`}
                className="flex items-baseline gap-3 border-b pb-2 font-heading text-2xl"
              >
                {group}
                <span className="font-sans text-sm text-muted-foreground tabular-nums">
                  {members.length}
                </span>
              </h2>
              <ul className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((component) => (
                  <li
                    key={component.slug}
                    className="relative flex flex-col gap-0.5 border-b border-dashed py-3"
                  >
                    {/* The link covers the row; its name is the component's. */}
                    <Link
                      href={`/design-system/${component.slug}`}
                      aria-describedby={`desc-${component.slug}`}
                      className="font-medium underline-offset-4 outline-none after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                    >
                      {component.name}
                    </Link>
                    <p
                      id={`desc-${component.slug}`}
                      className="text-sm text-muted-foreground"
                    >
                      {component.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

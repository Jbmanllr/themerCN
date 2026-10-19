import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { demos } from "@/components/design-system/demos"
import { ModeNote, PageHeader } from "@/components/design-system/page-header"
import { SpecimenSplit } from "@/components/design-system/specimen"
import { getUiComponent, uiComponents } from "@/lib/design-system"

// Only the listed components have pages; anything else is the 404.
export const dynamicParams = false

export function generateStaticParams() {
  return uiComponents.map((component) => ({ component: component.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/design-system/[component]">): Promise<Metadata> {
  const component = getUiComponent((await params).component)
  return { title: component?.name }
}

export default async function Page({
  params,
}: PageProps<"/design-system/[component]">) {
  const component = getUiComponent((await params).component)
  if (!component) notFound()

  const Demo = demos[component.slug]
  const index = uiComponents.indexOf(component)
  const previous = uiComponents[index - 1]
  const next = uiComponents[index + 1]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={component.name}>
        <p>{component.description}</p>
        <p className="mt-3 text-sm">
          <code className="font-mono">
            @workspace/ui/components/{component.slug}
          </code>
          <span className="text-muted-foreground"> in {component.group}</span>
        </p>
      </PageHeader>

      <div className="flex flex-col gap-4">
        <SpecimenSplit>
          <Demo />
        </SpecimenSplit>
        <ModeNote />
      </div>

      <nav
        aria-label="Previous and next component"
        className="flex justify-between gap-4 border-t pt-6 text-sm"
      >
        {previous ? (
          <Link
            href={`/design-system/${previous.slug}`}
            className="flex flex-col gap-0.5 hover:underline"
          >
            <span className="text-muted-foreground">Previous</span>
            <span className="font-medium">{previous.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/design-system/${next.slug}`}
            className="flex flex-col items-end gap-0.5 hover:underline"
          >
            <span className="text-muted-foreground">Next</span>
            <span className="font-medium">{next.name}</span>
          </Link>
        )}
      </nav>
    </div>
  )
}

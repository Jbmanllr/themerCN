// Every packages/ui component, as the design-system DocsShell lists them.
// `slug` is the file name in packages/ui/src/components and the
// /design-system/[component] segment. design-system.test.ts keeps this list
// in step with the directory.

export type ComponentGroup =
  | "Actions"
  | "Forms"
  | "Overlays"
  | "Navigation"
  | "Display"
  | "Layout"
  | "Feedback"
  | "Chat"

export type UiComponent = { slug: string; name: string; group: ComponentGroup }

const entries: [slug: string, group: ComponentGroup, name?: string][] = [
  ["button", "Actions"],
  ["button-group", "Actions"],
  ["toggle", "Actions"],
  ["toggle-group", "Actions"],
  ["kbd", "Actions"],

  ["input", "Forms"],
  ["input-group", "Forms"],
  ["input-otp", "Forms", "Input OTP"],
  ["textarea", "Forms"],
  ["label", "Forms"],
  ["field", "Forms"],
  ["checkbox", "Forms"],
  ["radio-group", "Forms"],
  ["switch", "Forms"],
  ["slider", "Forms"],
  ["select", "Forms"],
  ["native-select", "Forms"],
  ["combobox", "Forms"],
  ["calendar", "Forms"],
  ["questionnaire", "Forms"],

  ["dialog", "Overlays"],
  ["alert-dialog", "Overlays"],
  ["sheet", "Overlays"],
  ["drawer", "Overlays"],
  ["popover", "Overlays"],
  ["hover-card", "Overlays"],
  ["tooltip", "Overlays"],
  ["dropdown-menu", "Overlays"],
  ["context-menu", "Overlays"],
  ["command", "Overlays"],

  ["navigation-menu", "Navigation"],
  ["menubar", "Navigation"],
  ["breadcrumb", "Navigation"],
  ["pagination", "Navigation"],
  ["tabs", "Navigation"],
  ["sidebar", "Navigation"],

  ["card", "Display"],
  ["badge", "Display"],
  ["avatar", "Display"],
  ["table", "Display"],
  ["chart", "Display"],
  ["carousel", "Display"],
  ["item", "Display"],
  ["marker", "Display"],
  ["code-block", "Display"],
  ["empty", "Display"],
  ["accordion", "Display"],
  ["collapsible", "Display"],

  ["aspect-ratio", "Layout"],
  ["separator", "Layout"],
  ["scroll-area", "Layout"],
  ["resizable", "Layout"],
  ["direction", "Layout"],

  ["alert", "Feedback"],
  ["toast", "Feedback"],
  ["progress", "Feedback"],
  ["skeleton", "Feedback"],
  ["spinner", "Feedback"],

  ["message", "Chat"],
  ["message-scroller", "Chat"],
  ["bubble", "Chat"],
  ["attachment", "Chat"],
  ["trace", "Chat"],
]

const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((word, i) => (i === 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ")

export const uiComponents: UiComponent[] = entries.map(
  ([slug, group, name]) => ({
    slug,
    group,
    name: name ?? titleCase(slug),
  })
)

export const componentGroups: ComponentGroup[] = [
  "Actions",
  "Forms",
  "Overlays",
  "Navigation",
  "Display",
  "Layout",
  "Feedback",
  "Chat",
]

export function getUiComponent(slug: string): UiComponent | undefined {
  return uiComponents.find((component) => component.slug === slug)
}

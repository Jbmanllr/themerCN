// Every packages/ui component, as the design-system DocsShell lists them.
// `slug` is the file name in packages/ui/src/components and the
// /design-system/[component] segment. design-system.test.ts keeps this list
// in step with the directory, and the demo registry
// (components/design-system/demos) must have a specimen for every slug.

export type ComponentGroup =
  | "Actions"
  | "Forms"
  | "Overlays"
  | "Navigation"
  | "Display"
  | "Layout"
  | "Feedback"
  | "Chat"

type Entry = readonly [
  slug: string,
  group: ComponentGroup,
  description: string,
  name?: string,
]

const entries = [
  ["button", "Actions", "The thing you press: six variants and eight sizes."],
  ["button-group", "Actions", "Related buttons joined into one control."],
  ["toggle", "Actions", "A button that stays pressed until pressed again."],
  ["toggle-group", "Actions", "A row of toggles, one or many pressed."],
  ["kbd", "Actions", "A key, or a chord of keys, to press."],
  ["input", "Forms", "A single line of text."],
  ["input-group", "Forms", "An input with addons, text and buttons inside."],
  ["input-otp", "Forms", "One box per digit of a one-time code.", "Input OTP"],
  ["textarea", "Forms", "Several lines of text."],
  ["label", "Forms", "The name of a form control."],
  ["field", "Forms", "A label, control, description and error together."],
  ["checkbox", "Forms", "On or off, on its own or in a list."],
  ["radio-group", "Forms", "Exactly one choice from a short list."],
  ["switch", "Forms", "A setting that applies as soon as it flips."],
  ["slider", "Forms", "A value, or a range, along a track."],
  ["select", "Forms", "One choice from a list in a popup."],
  ["native-select", "Forms", "The browser's own select, styled."],
  ["combobox", "Forms", "A select you can type into to filter."],
  ["calendar", "Forms", "A month grid to pick a day or a range."],
  ["questionnaire", "Forms", "A form asked one question at a time."],

  ["dialog", "Overlays", "A window over the page that waits for you."],
  ["alert-dialog", "Overlays", "A dialog that asks before something final."],
  ["sheet", "Overlays", "A panel that slides in from an edge."],
  ["drawer", "Overlays", "A panel you can swipe away."],
  ["popover", "Overlays", "Rich content anchored to a trigger."],
  ["hover-card", "Overlays", "A preview shown while hovering a link."],
  ["tooltip", "Overlays", "A short label on hover or focus."],
  ["dropdown-menu", "Overlays", "Actions in a menu under a button."],
  ["context-menu", "Overlays", "Actions on right-click."],
  ["command", "Overlays", "A searchable list of commands."],

  ["navigation-menu", "Navigation", "Site navigation with flyout panels."],
  ["menubar", "Navigation", "An application menu bar."],
  ["breadcrumb", "Navigation", "Where this page sits in the site."],
  ["pagination", "Navigation", "Moves between pages of results."],
  ["tabs", "Navigation", "Switches between views in place."],
  ["sidebar", "Navigation", "An app's side navigation."],

  ["card", "Display", "A titled container for one subject."],
  ["badge", "Display", "A short status or count."],
  ["avatar", "Display", "A person, as a photo or initials."],
  ["table", "Display", "Rows and columns of data."],
  ["chart", "Display", "Recharts, coloured by the chart tokens."],
  ["carousel", "Display", "Slides you scroll through one at a time."],
  ["item", "Display", "A row with media, text and actions."],
  ["marker", "Display", "A labelled point in a list or timeline."],
  ["code-block", "Display", "Code, with lines that can be marked."],
  ["empty", "Display", "What to show when there is nothing yet."],
  ["accordion", "Display", "Sections that open one at a time."],
  ["collapsible", "Display", "One section that shows and hides."],

  ["aspect-ratio", "Layout", "Keeps media at a fixed shape."],
  ["separator", "Layout", "A line between groups of content."],
  ["scroll-area", "Layout", "A scrolling region with themed scrollbars."],
  ["resizable", "Layout", "Panels you resize by dragging a handle."],
  ["direction", "Layout", "Sets left-to-right or right-to-left."],

  ["alert", "Feedback", "A message that stays on the page."],
  ["toast", "Feedback", "A message that comes and goes."],
  ["progress", "Feedback", "How far along a task is."],
  ["skeleton", "Feedback", "The shape of content still loading."],
  ["spinner", "Feedback", "Work in progress, length unknown."],

  ["message", "Chat", "One turn in a conversation."],
  ["message-scroller", "Chat", "A conversation that keeps to the latest."],
  ["bubble", "Chat", "The speech bubble around a message."],
  ["attachment", "Chat", "A file sent with a message."],
  ["trace", "Chat", "The steps an assistant took."],
] as const satisfies readonly Entry[]

/** A packages/ui component file name, e.g. `"button"`. */
export type UiComponentSlug = (typeof entries)[number][0]

export type UiComponent = {
  slug: UiComponentSlug
  name: string
  group: ComponentGroup
  description: string
}

const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((word, i) => (i === 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ")

export const uiComponents: UiComponent[] = entries.map(
  ([slug, group, description, name]: Entry) => ({
    slug: slug as UiComponentSlug,
    group,
    description,
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

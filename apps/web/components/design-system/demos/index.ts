// The specimen for every packages/ui component, by slug. `satisfies` makes a
// slug listed in lib/design-system.ts without a demo a type error, so a new
// component fails the build until it has a page (and design-system.test.ts
// fails until it is listed).

import type { ComponentType } from "react"

import type { UiComponentSlug } from "@/lib/design-system"

import * as actions from "./actions"
import * as chat from "./chat"
import * as display from "./display"
import * as feedback from "./feedback"
import * as forms from "./forms"
import * as layout from "./layout"
import * as navigation from "./navigation"
import * as overlays from "./overlays"

export const demos = {
  button: actions.ButtonDemo,
  "button-group": actions.ButtonGroupDemo,
  toggle: actions.ToggleDemo,
  "toggle-group": actions.ToggleGroupDemo,
  kbd: actions.KbdDemo,

  input: forms.InputDemo,
  "input-group": forms.InputGroupDemo,
  "input-otp": forms.InputOtpDemo,
  textarea: forms.TextareaDemo,
  label: forms.LabelDemo,
  field: forms.FieldDemo,
  checkbox: forms.CheckboxDemo,
  "radio-group": forms.RadioGroupDemo,
  switch: forms.SwitchDemo,
  slider: forms.SliderDemo,
  select: forms.SelectDemo,
  "native-select": forms.NativeSelectDemo,
  combobox: forms.ComboboxDemo,
  calendar: forms.CalendarDemo,
  questionnaire: forms.QuestionnaireDemo,

  dialog: overlays.DialogDemo,
  "alert-dialog": overlays.AlertDialogDemo,
  sheet: overlays.SheetDemo,
  drawer: overlays.DrawerDemo,
  popover: overlays.PopoverDemo,
  "hover-card": overlays.HoverCardDemo,
  tooltip: overlays.TooltipDemo,
  "dropdown-menu": overlays.DropdownMenuDemo,
  "context-menu": overlays.ContextMenuDemo,
  command: overlays.CommandDemo,

  "navigation-menu": navigation.NavigationMenuDemo,
  menubar: navigation.MenubarDemo,
  breadcrumb: navigation.BreadcrumbDemo,
  pagination: navigation.PaginationDemo,
  tabs: navigation.TabsDemo,
  sidebar: navigation.SidebarDemo,

  card: display.CardDemo,
  badge: display.BadgeDemo,
  avatar: display.AvatarDemo,
  table: display.TableDemo,
  chart: display.ChartDemo,
  carousel: display.CarouselDemo,
  item: display.ItemDemo,
  marker: display.MarkerDemo,
  "code-block": display.CodeBlockDemo,
  empty: display.EmptyDemo,
  accordion: display.AccordionDemo,
  collapsible: display.CollapsibleDemo,

  "aspect-ratio": layout.AspectRatioDemo,
  separator: layout.SeparatorDemo,
  "scroll-area": layout.ScrollAreaDemo,
  resizable: layout.ResizableDemo,
  direction: layout.DirectionDemo,

  alert: feedback.AlertDemo,
  toast: feedback.ToastDemo,
  progress: feedback.ProgressDemo,
  skeleton: feedback.SkeletonDemo,
  spinner: feedback.SpinnerDemo,

  message: chat.MessageDemo,
  "message-scroller": chat.MessageScrollerDemo,
  bubble: chat.BubbleDemo,
  attachment: chat.AttachmentDemo,
  trace: chat.TraceDemo,
} satisfies Record<UiComponentSlug, ComponentType>

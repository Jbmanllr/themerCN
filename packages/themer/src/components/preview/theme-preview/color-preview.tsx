// The Color Palette preview tab: one swatch per colour token the theme sets, in
// the same groups as the Colors panel (`getColorListGroups`, host extra-colour
// groups included), each with an Edit button (jumps to that colour's control)
// and a Copy button. Every button is named after its colour so a screen reader
// can tell them apart; keep the `Edit <label>` / `Copy <label>` names.
import { ActionButton } from "../../ui/action-button"
import { CopyButton } from "../../ui/copy-button"
import { useColorFocusTrigger } from "../../../hooks/use-color-focus"
import type { ThemeMode, ThemeStyles } from "../../../types"
import { getColorListGroups } from "../../../utils/color-groups"
import { Copy, SquarePen } from "lucide-react"

interface ColorPreviewProps {
  styles: ThemeStyles
  currentMode: ThemeMode
}

function ColorPreviewItem({
  label,
  color,
  name,
}: {
  label: string
  color: string
  name: string
}) {
  const { focusColor } = useColorFocusTrigger()

  return (
    <div className="group/color-preview relative flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted/60">
      <div
        className="size-14 shrink-0 rounded-md border @max-3xl:size-12"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 space-y-1 overflow-hidden">
        <p className="line-clamp-2 text-sm leading-tight font-medium @max-3xl:text-xs">
          {label}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {color}
        </p>
      </div>

      <div className="hidden flex-col opacity-0 transition-opacity group-focus-within/color-preview:opacity-100 group-hover/color-preview:opacity-100 md:flex">
        <ActionButton
          label={`Edit ${label}`}
          size="icon-sm"
          className="[&>svg]:size-3.5"
          onClick={() => focusColor(name)}
        >
          <SquarePen />
        </ActionButton>
        <CopyButton
          textToCopy={color}
          variant="ghost"
          size="icon-sm"
          className="[&>svg]:size-3.5"
          aria-label={`Copy ${label}`}
        >
          <Copy />
        </CopyButton>
      </div>
    </div>
  )
}

const ColorPreview = ({ styles, currentMode }: ColorPreviewProps) => {
  if (!styles || !styles[currentMode]) {
    return null
  }

  const modeStyles = styles[currentMode]

  return (
    <div className="@container grid grid-cols-1 gap-4 md:gap-8">
      {getColorListGroups().map((group) => {
        // An unset host extra shows the host's CSS value, which this tab
        // does not read, so only colours with a theme value are listed.
        const colors = group.colors.flatMap(({ key, label }) => {
          const value = modeStyles[key]
          return value ? [{ key, label, value }] : []
        })
        if (colors.length === 0) return null

        return (
          <div key={group.title} className="space-y-4 @max-3xl:space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {group.title}
            </h3>
            <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
              {colors.map(({ key, label, value }) => (
                <ColorPreviewItem
                  key={key}
                  name={key}
                  label={label}
                  color={value}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ColorPreview

import { DocsShell } from "@/components/docs/docs-shell"
import { renderModeScopeCss } from "@/components/design-system/mode-scope"
import { nightjarPreset } from "@/lib/brand/nightjar"

// The light/dark specimen halves re-declare Nightjar's colours for the mode
// the page is not in (components/design-system/mode-scope.ts).
const modeScopeCss = renderModeScopeCss(nightjarPreset.styles)

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsShell>
      <style href="design-system-mode-scope" precedence="default">
        {modeScopeCss}
      </style>
      {children}
    </DocsShell>
  )
}

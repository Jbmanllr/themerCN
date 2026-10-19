"use client"

// Theme Code dialog: the registry install command (only for an unmodified
// tweakcn catalogue theme, the only themes tweakcn's registry serves) and the
// generated index.css / tailwind.config.ts / layout.tsx.
//
// The action bar mounts this only while it is open, so the three exports are
// generated for an open dialog only. Copy feedback is useCopyFeedback
// (hooks/use-copy-feedback.ts), one per copy button. Code colours use theme
// token roles (muted, chart-*) rather than a fixed palette, so the block
// follows the host theme.

import * as React from "react"
import { Check, Copy } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { useShallow } from "zustand/react/shallow"
import { isTweakcnPreset } from "../../config/presets"
import { useEditorStore } from "../../stores/editor-store"
import { usePreferencesStore } from "../../stores/preferences-store"
import { selectHasUnsavedChanges } from "../../selectors"
import {
  generateLayoutCode,
  generateTailwindConfigCode,
  generateThemeCode,
} from "../../utils/theme-generator"
import { getExtraColorKeys } from "../../config/extra-colors"
import { useCopyFeedback } from "../../hooks/use-copy-feedback"
import type { ColorFormat, PackageManager, TailwindVersion } from "../../types"

interface CodePanelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CodeTab = "index.css" | "tailwind.config.ts" | "layout.tsx"

const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const
const CODE_TOKEN_REGEX =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|--[A-Za-z0-9-]+|@[A-Za-z-]+|\b(?:children|className|colors|const|darkMode|default|description|export|extend|from|function|import|interface|module|return|subsets|theme|title|type|variable)\b|\b\d+(?:\.\d+)?(?:%|px|rem|em)?\b)/g

const THEME_CODE_DIALOG_CONTENT_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  width: "min(calc(100vw - 2rem), 92rem)",
  height: "min(90dvh, 64rem)",
  maxWidth: "92rem",
  maxHeight: "90dvh",
  padding: 0,
  overflow: "hidden",
} satisfies React.CSSProperties

function getRegistryCommand(
  packageManager: PackageManager,
  id: string
): string {
  const url = `https://tweakcn.com/r/themes/${id}.json`

  switch (packageManager) {
    case "pnpm":
      return `pnpm dlx shadcn@latest add ${url}`
    case "npm":
      return `npx shadcn@latest add ${url}`
    case "yarn":
      return `yarn dlx shadcn@latest add ${url}`
    case "bun":
      return `bunx shadcn@latest add ${url}`
  }
}

function getActiveCode(
  activeTab: CodeTab,
  code: string,
  configCode: string,
  layoutCode: string
) {
  if (activeTab === "layout.tsx") return layoutCode
  if (activeTab === "tailwind.config.ts") return configCode
  return code
}

export function CodePanelDialog({ open, onOpenChange }: CodePanelDialogProps) {
  const themeState = useEditorStore((state) => state.themeState)
  const hasUnsavedChanges = useEditorStore(selectHasUnsavedChanges)
  const {
    colorFormat,
    tailwindVersion,
    packageManager,
    setColorFormat,
    setTailwindVersion,
    setPackageManager,
    getAvailableColorFormats,
  } = usePreferencesStore(
    useShallow((state) => ({
      colorFormat: state.colorFormat,
      tailwindVersion: state.tailwindVersion,
      packageManager: state.packageManager,
      setColorFormat: state.setColorFormat,
      setTailwindVersion: state.setTailwindVersion,
      setPackageManager: state.setPackageManager,
      getAvailableColorFormats: state.getAvailableColorFormats,
    }))
  )

  const [copied, copyCode] = useCopyFeedback()
  const [activeTab, setActiveTab] = React.useState<CodeTab>("index.css")

  const code = React.useMemo(
    () =>
      generateThemeCode(
        themeState,
        colorFormat,
        tailwindVersion,
        getExtraColorKeys()
      ),
    [themeState, colorFormat, tailwindVersion]
  )
  const configCode = React.useMemo(
    () =>
      generateTailwindConfigCode(
        themeState,
        colorFormat,
        "3",
        getExtraColorKeys()
      ),
    [themeState, colorFormat]
  )
  const layoutCode = React.useMemo(
    () => generateLayoutCode(themeState),
    [themeState]
  )
  const colorFormats = getAvailableColorFormats()

  // tweakcn's registry serves its own catalogue only, and the published JSON
  // is the preset as shipped: an edited theme would install something else.
  const preset = themeState.preset
  const registryCommand =
    preset && isTweakcnPreset(preset) && !hasUnsavedChanges
      ? getRegistryCommand(packageManager, preset)
      : null
  const visibleActiveTab =
    tailwindVersion === "3" || activeTab !== "tailwind.config.ts"
      ? activeTab
      : "index.css"
  const activeCode = getActiveCode(
    visibleActiveTab,
    code,
    configCode,
    layoutCode
  )

  const handleTailwindVersionChange = React.useCallback(
    (value: TailwindVersion) => {
      setTailwindVersion(value)

      if (value === "4" && colorFormat === "hsl") {
        setColorFormat("oklch")
      }

      if (value === "4" && activeTab === "tailwind.config.ts") {
        setActiveTab("index.css")
      }
    },
    [activeTab, colorFormat, setColorFormat, setTailwindVersion]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-lg bg-background text-foreground"
        data-testid="themer-theme-code-dialog"
        style={THEME_CODE_DIALOG_CONTENT_STYLE}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-semibold tracking-normal">
            Theme Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
          <RegistryCommandPanel
            registryCommand={registryCommand}
            packageManager={packageManager}
            onPackageManagerChange={setPackageManager}
          />

          <div className="mb-4 flex flex-none items-center gap-2">
            <Select
              value={tailwindVersion}
              onValueChange={(value) =>
                handleTailwindVersionChange(value as TailwindVersion)
              }
            >
              <SelectTrigger
                className="h-11 min-w-36 border-none bg-muted/50 px-4 text-base shadow-none"
                data-testid="themer-code-tailwind-select"
              >
                <SelectValue>
                  {tailwindVersion === "4" ? "Tailwind v4" : "Tailwind v3"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Tailwind v3</SelectItem>
                <SelectItem value="4">Tailwind v4</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={colorFormat}
              onValueChange={(value) => setColorFormat(value as ColorFormat)}
            >
              <SelectTrigger
                className="h-11 min-w-24 border-none bg-muted/50 px-4 text-base shadow-none"
                data-testid="themer-code-format-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs
            className="min-h-0 flex-1 overflow-hidden rounded-lg border"
            onValueChange={(value) => setActiveTab(value as CodeTab)}
            value={visibleActiveTab}
          >
            <div className="flex flex-none items-center justify-between gap-3 border-b bg-muted/50 px-4 py-3">
              <TabsList className="h-8 bg-transparent p-0">
                <TabsTrigger
                  className="h-7 px-4 text-base font-medium"
                  value="index.css"
                >
                  index.css
                </TabsTrigger>
                {tailwindVersion === "3" ? (
                  <TabsTrigger
                    className="h-7 px-4 text-base font-medium"
                    value="tailwind.config.ts"
                  >
                    tailwind.config.ts
                  </TabsTrigger>
                ) : null}
                <TabsTrigger
                  className="h-7 px-4 text-base font-medium"
                  value="layout.tsx"
                >
                  layout.tsx (Next.js)
                </TabsTrigger>
              </TabsList>

              <Button
                aria-label={copied ? "Code copied" : "Copy code"}
                onClick={() => copyCode(activeCode)}
                size="sm"
                variant="outline"
              >
                {copied ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <Copy data-icon="inline-start" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>

            <CodeTabPanel code={code} language="css" value="index.css" />

            {tailwindVersion === "3" ? (
              <CodeTabPanel
                code={configCode}
                language="typescript"
                value="tailwind.config.ts"
              />
            ) : null}

            <CodeTabPanel code={layoutCode} language="tsx" value="layout.tsx" />
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The registry install box: the package-manager tabs and, for an unedited
 * tweakcn theme, the install command with its own copy button.
 */
function RegistryCommandPanel({
  registryCommand,
  packageManager,
  onPackageManagerChange,
}: {
  registryCommand: string | null
  packageManager: PackageManager
  onPackageManagerChange: (packageManager: PackageManager) => void
}) {
  const [copied, copy] = useCopyFeedback()

  return (
    <div className="mb-4 flex-none overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 border-b px-2 py-1">
        <Tabs
          aria-label="Package manager"
          value={packageManager}
          onValueChange={(value) =>
            onPackageManagerChange(value as PackageManager)
          }
        >
          <TabsList variant="line">
            {PACKAGE_MANAGERS.map((item) => (
              <TabsTrigger
                data-testid={`themer-code-package-${item}`}
                key={item}
                value={item}
              >
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {registryCommand ? (
          <Button
            aria-label={
              copied ? "Registry command copied" : "Copy registry command"
            }
            className="ms-auto"
            onClick={() => copy(registryCommand)}
            size="icon"
            variant="ghost"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        ) : null}
      </div>
      <div className="flex h-12 items-center overflow-x-auto bg-muted/50 px-4 text-sm text-muted-foreground">
        {registryCommand ? (
          <code className="font-mono whitespace-nowrap">{registryCommand}</code>
        ) : (
          <span>
            The registry command is available for tweakcn themes without edits.
            Copy the code below instead.
          </span>
        )}
      </div>
    </div>
  )
}

function CodeTabPanel({
  code,
  language,
  value,
}: {
  code: string
  language: "css" | "typescript" | "tsx"
  value: CodeTab
}) {
  return (
    <TabsContent
      className="m-0 min-h-0 overflow-hidden"
      data-testid={`themer-code-tab-${value}`}
      value={value}
    >
      <div className="h-full min-h-0 overflow-auto bg-muted/40">
        <CodeBlock code={code} language={language} />
      </div>
    </TabsContent>
  )
}

function CodeBlock({
  code,
  language,
}: {
  code: string
  language: "css" | "typescript" | "tsx"
}) {
  return (
    <pre
      className="m-0 min-h-full p-6 font-mono text-sm leading-7 whitespace-pre text-foreground"
      data-language={language}
    >
      <code>{renderHighlightedCode(code)}</code>
    </pre>
  )
}

function renderHighlightedCode(code: string) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  for (const match of code.matchAll(CODE_TOKEN_REGEX)) {
    const token = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      parts.push(code.slice(lastIndex, index))
    }

    parts.push(
      <span className={getTokenClassName(token)} key={`${index}-${token}`}>
        {token}
      </span>
    )
    lastIndex = index + token.length
  }

  if (lastIndex < code.length) {
    parts.push(code.slice(lastIndex))
  }

  return parts
}

// Token roles, not raw colours: comments recede, the rest take chart hues
// (chart-4 is skipped: it is a highlight colour with little contrast on a
// light background in several themes).
function getTokenClassName(token: string) {
  if (token.startsWith("//") || token.startsWith("/*"))
    return "text-muted-foreground"
  if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
    return "text-chart-2"
  }
  if (token.startsWith("--")) return "text-chart-1"
  if (token.startsWith("@")) return "text-chart-3"
  if (/^\d/.test(token)) return "text-chart-5"
  return "text-primary"
}

import type { ReactNode } from "react"

import { isColourToken } from "@/components/design-system/mode-scope"
import { ModeNote, PageHeader } from "@/components/design-system/page-header"
import type { Mode } from "@/components/design-system/specimen"
import { TokenValue } from "@/components/design-system/token-value"
import { nightjarPreset } from "@/lib/brand/nightjar"
import { cn } from "@workspace/ui/lib/utils"

export const metadata = { title: "Tokens" }

type Row = {
  /** What the first column names: a variable or a utility. */
  token: string
  /** How it derives from a variable, when it is not one itself. */
  note?: string
  render: (mode: Mode) => ReactNode
}

const MODES: Mode[] = ["light", "dark"]
const SAMPLE = "Good coffee, slowly."

function TokenTable({ title, rows }: { title: string; rows: Row[] }) {
  const id = `tokens-${title.toLowerCase()}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="font-heading text-2xl">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-3xl border">
        <table aria-labelledby={id} className="w-full min-w-xl text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="w-1/4 px-4 py-3 font-normal">
                Token
              </th>
              {MODES.map((mode) => (
                <th
                  key={mode}
                  scope="col"
                  data-mode={mode}
                  className="bg-background px-4 py-3 font-normal text-muted-foreground"
                >
                  {mode === "light" ? "Light" : "Dark"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.token}>
                <th
                  scope="row"
                  className="border-t px-4 py-3 text-left align-top font-normal"
                >
                  <code className="font-mono text-xs font-medium">
                    {row.token}
                  </code>
                  {row.note && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {row.note}
                    </span>
                  )}
                </th>
                {MODES.map((mode) => (
                  <td
                    key={mode}
                    data-mode={mode}
                    className="w-3/8 border-t bg-background px-4 py-3 align-top text-foreground"
                  >
                    {row.render(mode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const colourRows: Row[] = Object.keys(nightjarPreset.styles.light)
  .filter(isColourToken)
  .map((key) => ({
    token: `--${key}`,
    render: () => (
      <div className="flex items-center gap-3">
        <span
          data-swatch=""
          className="size-8 shrink-0 rounded-lg ring-1 ring-foreground/10"
          style={{ background: `var(--${key})` }}
        />
        <TokenValue name={`--${key}`} />
      </div>
    ),
  }))

const radiusScale = [
  ["rounded-sm", "--radius × 0.6", "rounded-sm"],
  ["rounded-md", "--radius × 0.8", "rounded-md"],
  ["rounded-lg", "--radius", "rounded-lg"],
  ["rounded-xl", "--radius × 1.4", "rounded-xl"],
  ["rounded-2xl", "--radius × 1.8", "rounded-2xl"],
  ["rounded-3xl", "--radius × 2.2", "rounded-3xl"],
  ["rounded-4xl", "--radius × 2.6", "rounded-4xl"],
] as const

const radiusRows: Row[] = [
  { token: "--radius", render: () => <TokenValue name="--radius" /> },
  ...radiusScale.map(([token, note, className]) => ({
    token,
    note,
    render: () => (
      <div
        className={cn(
          "h-10 w-20 rounded-none border-2 border-primary bg-primary/10",
          className
        )}
      />
    ),
  })),
]

const fontRows: Row[] = (
  [
    ["--font-sans", "font-sans"],
    ["--font-heading", "font-heading"],
    ["--font-serif", "font-serif"],
    ["--font-mono", "font-mono"],
  ] as const
).map(([token, className]) => ({
  token,
  note: className,
  render: () => (
    <div className="flex flex-col gap-1">
      <span className={cn("text-xl", className)}>{SAMPLE}</span>
      <TokenValue name={token} />
    </div>
  ),
}))

const trackingRows: Row[] = [
  {
    token: "--letter-spacing",
    note: "the body text's tracking",
    render: () => (
      <div className="flex flex-col gap-1">
        <span style={{ letterSpacing: "var(--letter-spacing)" }}>{SAMPLE}</span>
        <TokenValue name="--letter-spacing" />
      </div>
    ),
  },
  ...(
    [
      ["tracking-tighter", "--tracking-tighter"],
      ["tracking-tight", "--tracking-tight"],
      ["tracking-normal", "--tracking-normal"],
      ["tracking-wide", "--tracking-wide"],
      ["tracking-wider", "--tracking-wider"],
      ["tracking-widest", "--tracking-widest"],
    ] as const
  ).map(([className, variable]) => ({
    token: variable,
    note: className,
    render: () => (
      <div className="flex flex-col gap-1">
        <span className={className}>{SAMPLE}</span>
        <TokenValue name={variable} />
      </div>
    ),
  })),
]

const shadowRows: Row[] = (
  [
    ["--shadow-2xs", "shadow-2xs"],
    ["--shadow-xs", "shadow-xs"],
    ["--shadow-sm", "shadow-sm"],
    ["--shadow-md", "shadow-md"],
    ["--shadow-lg", "shadow-lg"],
    ["--shadow-xl", "shadow-xl"],
    ["--shadow-2xl", "shadow-2xl"],
  ] as const
).map(([token, className]) => ({
  token,
  note: className,
  render: () => (
    <div className={cn("h-12 w-24 rounded-xl bg-card", className)} />
  ),
}))

const spacingScale = [
  ["1", "w-1"],
  ["2", "w-2"],
  ["4", "w-4"],
  ["6", "w-6"],
  ["8", "w-8"],
  ["12", "w-12"],
  ["16", "w-16"],
  ["24", "w-24"],
] as const

const spacingRows: Row[] = [
  { token: "--spacing", render: () => <TokenValue name="--spacing" /> },
  ...spacingScale.map(([step, className]) => ({
    token: className,
    note: `--spacing × ${step}`,
    render: () => (
      <div className={cn("h-3 rounded-full bg-primary", className)} />
    ),
  })),
]

export default function Page() {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <PageHeader title="Tokens">
          <p>
            Every value the Theme sets, read live from the page in light and
            dark. Edit one in the Themer and its row changes.
          </p>
        </PageHeader>
        <ModeNote />
      </div>
      <TokenTable title="Colours" rows={colourRows} />
      <TokenTable title="Radius" rows={radiusRows} />
      <TokenTable title="Fonts" rows={fontRows} />
      <TokenTable title="Tracking" rows={trackingRows} />
      <TokenTable title="Shadows" rows={shadowRows} />
      <TokenTable title="Spacing" rows={spacingRows} />
    </div>
  )
}

// PROTOTYPE (wayfinder ticket #11). Host page + probe table + variant switcher.
import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Badge } from "@workspace/ui/components/badge"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

export const VARIANTS = [
  { key: "none", name: "No isolation (naive precompiled CSS)" },
  { key: "prefix", name: "prefix(tm), Preflight in @scope" },
  { key: "scoped", name: "[data-themer] @scope, popups in <body>" },
  { key: "scoped-container", name: "[data-themer] @scope + portal container" },
] as const
export type Variant = (typeof VARIANTS)[number]["key"]
export type Frame = "main" | "themer" | "host"

type PanelModule = typeof import("@workspace/themer-spike/gen/plain/panel")
const loadPanel = (v: Variant): Promise<PanelModule> =>
  v === "prefix" ? import("@workspace/themer-spike/gen/tm/panel") : import("@workspace/themer-spike/gen/plain/panel")

function HostPreviewSample({ probe }: { probe: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" data-probe={`${probe}.button`}>
        Host button
      </Button>
      <p className="text-sm text-muted-foreground" data-probe={`${probe}.text`}>
        Host text-sm
      </p>
    </div>
  )
}

export function App({ variant, frame, open }: { variant: Variant; frame: Frame; open: boolean }) {
  const [Panel, setPanel] = React.useState<PanelModule["ThemerPanel"] | null>(null)
  React.useEffect(() => {
    if (frame !== "host") loadPanel(variant).then((m) => setPanel(() => m.ThemerPanel), (e) => console.error("panel load failed", e))
  }, [variant, frame])

  const themer =
    Panel &&
    createPortal(
      <Panel
        openPopups={open}
        containPortals={variant === "scoped-container"}
        hostPreview={frame === "main" ? <HostPreviewSample probe="themer.hostpreview" /> : undefined}
      />,
      document.body
    )

  if (frame === "themer") return themer
  return (
    <div className="flex min-h-svh flex-col gap-6 p-6 pr-[420px]">
      <header className="flex flex-col gap-1">
        <h2 data-probe="host.h2" className="text-2xl font-medium">
          Host app
        </h2>
        <p className="text-sm text-muted-foreground" data-probe="host.text">
          Its own Tailwind build with a private type scale (text-sm is 1.05rem here) and legacy unlayered CSS:
          uppercase buttons, crimson h2 and .border, 18px inputs, italic labels, dashed outlines on menus.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <Card data-probe="host.card" className="w-72">
          <CardHeader>
            <CardTitle>Host card</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="host-input" data-probe="host.label">
              Email
            </Label>
            <Input id="host-input" placeholder="you@example.com" data-probe="host.input" />
            <Button data-probe="host.button">Subscribe</Button>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-2">
          <Popover open={open || undefined} modal={false}>
            <PopoverTrigger render={<Button variant="outline" />}>Host popover</PopoverTrigger>
            <PopoverContent side="bottom" align="start" data-probe="host.popover">
              <p className="text-sm">The Host app&apos;s own popup, also portalled to body.</p>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
          <p className="text-xs text-muted-foreground">How the Host renders its Preview tab content on its own pages</p>
          <HostPreviewSample probe="host.sample" />
        </div>
      </div>

      {themer}
      {frame === "main" ? (
        <>
          <ThemeControls />
          <ProbeTable variant={variant} open={open} />
          <Switcher variant={variant} open={open} />
        </>
      ) : null}
    </div>
  )
}

/* ---------- Theme edits: what the Themer writes onto <html> ---------- */

function ThemeSlider({ id, label, value, min, max, step, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex w-56 flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  )
}

function ThemeControls() {
  const [hue, setHue] = React.useState(45)
  const [radius, setRadius] = React.useState(0.75)
  const [spacing, setSpacing] = React.useState(0.25)
  const [dark, setDark] = React.useState(false)
  React.useEffect(() => {
    const s = document.documentElement.style
    s.setProperty("--primary", `oklch(${dark ? 0.72 : 0.58} 0.16 ${hue})`)
    s.setProperty("--ring", `oklch(${dark ? 0.72 : 0.58} 0.16 ${hue})`)
    s.setProperty("--radius", `${radius}rem`)
    s.setProperty("--spacing", `${spacing}rem`)
    document.documentElement.classList.toggle("dark", dark)
  }, [hue, radius, spacing, dark])
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Edit the Theme</CardTitle>
        <CardDescription>
          What the Themer writes onto &lt;html&gt;. The Themer UI must follow every change; the probes compare at defaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-6">
        <ThemeSlider id="hue" label="Primary hue" value={hue} min={0} max={360} step={1} onChange={setHue} />
        <ThemeSlider id="radius" label="--radius (rem)" value={radius} min={0} max={1.5} step={0.05} onChange={setRadius} />
        <ThemeSlider id="spacing" label="--spacing (rem)" value={spacing} min={0.15} max={0.35} step={0.01} onChange={setSpacing} />
        <div className="flex items-center gap-2">
          <Switch id="dark" checked={dark} onCheckedChange={setDark} />
          <Label htmlFor="dark">Dark</Label>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------- Probe table: computed styles vs clean reference frames ---------- */

const PROPS = [
  "font-size", "font-weight", "font-family", "font-style", "line-height", "letter-spacing", "text-transform",
  "padding-top", "padding-left", "height", "border-top-width", "border-top-color", "border-top-left-radius",
  "background-color", "color", "outline-style", "box-shadow", "z-index", "position",
] as const

// probe id in the main page -> [reference frame, probe id there]
function referenceFor(id: string): ["themer" | "host", string] {
  if (id.startsWith("themer.hostpreview.")) return ["host", id.replace("themer.hostpreview.", "host.sample.")]
  if (id.startsWith("themer.")) return ["themer", id]
  return ["host", id]
}

type Row = { id: string; prop: string; actual: string; expected: string }

function readProbes(doc: Document) {
  const out = new Map<string, CSSStyleDeclaration>()
  doc.querySelectorAll<HTMLElement>("[data-probe]").forEach((el) => out.set(el.dataset.probe!, doc.defaultView!.getComputedStyle(el)))
  return out
}

function ProbeTable({ variant, open }: { variant: Variant; open: boolean }) {
  const themerRef = React.useRef<HTMLIFrameElement>(null)
  const hostRef = React.useRef<HTMLIFrameElement>(null)
  const [rows, setRows] = React.useState<Row[] | null>(null)
  const [missing, setMissing] = React.useState<string[]>([])
  const [onlyDiffs, setOnlyDiffs] = React.useState(true)

  const run = React.useCallback(() => {
    const frames = { themer: themerRef.current?.contentDocument, host: hostRef.current?.contentDocument }
    if (!frames.themer || !frames.host) return
    const actual = readProbes(document)
    const refs = { themer: readProbes(frames.themer), host: readProbes(frames.host) }
    const next: Row[] = []
    const miss: string[] = []
    for (const [id, cs] of actual) {
      const [frame, refId] = referenceFor(id)
      const ref = refs[frame].get(refId)
      if (!ref) { miss.push(id); continue }
      for (const prop of PROPS) next.push({ id, prop, actual: cs.getPropertyValue(prop), expected: ref.getPropertyValue(prop) })
    }
    setRows(next)
    setMissing(miss)
  }, [])

  // Measure once the lazily loaded panel exists here and in the Themer frame.
  React.useEffect(() => {
    const ready = () => {
      const t = themerRef.current?.contentDocument
      const h = hostRef.current?.contentDocument
      const n = (d?: Document | null) => d?.querySelectorAll('[data-probe^="themer."]:not([data-probe^="themer.hostpreview."])').length ?? 0
      return n(document) > 0 && n(document) === n(t) && (h?.querySelectorAll("[data-probe]").length ?? 0) > 0
    }
    let timer = 0
    const poll = () => {
      if (ready()) timer = window.setTimeout(run, 500)
      else timer = window.setTimeout(poll, 250)
    }
    poll()
    return () => clearTimeout(timer)
  }, [run])

  // The `scoped` variant's own clean frame is broken too (its popups sit outside
  // the scope), so the Themer's intended look comes from scoped-container there.
  const themerRefVariant = variant === "scoped" ? "scoped-container" : variant
  const qs = (frame: string, v: string) => `?variant=${v}&frame=${frame}${open ? "&open=1" : ""}`
  const diffs = rows?.filter((r) => r.actual !== r.expected) ?? []
  const count = (pick: (id: string) => boolean) => diffs.filter((r) => pick(r.id)).length
  const groups = [
    { label: "Themer UI (leak in)", n: count((id) => id.startsWith("themer.") && !id.startsWith("themer.hostpreview.")) },
    { label: "Host Preview tab inside the Themer", n: count((id) => id.startsWith("themer.hostpreview.")) },
    { label: "Host app (leak out)", n: count((id) => id.startsWith("host.")) },
  ]
  const shown = onlyDiffs ? diffs : rows ?? []

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Probe diff vs clean frames</CardTitle>
        <CardDescription>
          Each probe&apos;s computed style in this page, against the same element rendered alone (Themer without the Host app&apos;s CSS, or the Host app without the Themer&apos;s).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {rows ? (
            groups.map((g) => (
              <Badge key={g.label} variant={g.n ? "destructive" : "secondary"} data-summary={g.label}>
                {g.label}: {g.n}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">measuring…</Badge>
          )}
          {missing.length ? <Badge variant="outline">no reference: {missing.join(", ")}</Badge> : null}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="only-diffs" checked={onlyDiffs} onCheckedChange={setOnlyDiffs} />
              <Label htmlFor="only-diffs">Only differences</Label>
            </div>
            <Button size="sm" variant="outline" onClick={run}>Re-run</Button>
          </div>
        </div>
        {!open ? (
          <p className="text-sm text-muted-foreground">Popups are closed. Use “Open popups” in the bar to probe them.</p>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Probe</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>In the Host page</TableHead>
              <TableHead>Clean reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.id + r.prop} className={r.actual !== r.expected ? "bg-destructive/5" : undefined}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-mono text-xs">{r.prop}</TableCell>
                <TableCell className="max-w-72 font-mono text-xs whitespace-normal break-all">{r.actual}</TableCell>
                <TableCell className="max-w-72 font-mono text-xs whitespace-normal break-all">{r.expected}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {/* Clean references, same viewport size, offscreen. */}
      <iframe ref={themerRef} title="themer reference" src={qs("themer", themerRefVariant)} className="fixed top-0 -left-[10000px]" style={{ width: innerWidth, height: innerHeight }} />
      <iframe ref={hostRef} title="host reference" src={qs("host", variant)} className="fixed top-0 -left-[10000px]" style={{ width: innerWidth, height: innerHeight }} />
    </Card>
  )
}

/* ---------- Floating variant switcher (prototype chrome) ---------- */

function Switcher({ variant, open }: { variant: Variant; open: boolean }) {
  const i = VARIANTS.findIndex((v) => v.key === variant)
  const go = React.useCallback(
    (key: string, nextOpen = open) => {
      const p = new URLSearchParams(location.search)
      p.set("variant", key)
      if (nextOpen) p.set("open", "1")
      else p.delete("open")
      location.search = p.toString() // full reload: each variant needs a clean stylesheet set
    },
    [open]
  )
  const prev = VARIANTS[(i - 1 + VARIANTS.length) % VARIANTS.length].key
  const next = VARIANTS[(i + 1) % VARIANTS.length].key
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return
      if (e.key === "ArrowLeft") go(prev)
      if (e.key === "ArrowRight") go(next)
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [go, prev, next])
  if (import.meta.env.PROD) return null
  return createPortal(
    <div className="dark fixed bottom-4 left-1/2 z-[2147483647] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background p-1.5 text-foreground shadow-2xl">
      <Button size="icon-sm" variant="ghost" aria-label="Previous variant" onClick={() => go(prev)}>
        <ChevronLeftIcon />
      </Button>
      <Badge variant="secondary" className="font-mono">{variant}</Badge>
      <span className="min-w-72 text-center text-sm">{VARIANTS[i].name}</span>
      <Button size="icon-sm" variant="ghost" aria-label="Next variant" onClick={() => go(next)}>
        <ChevronRightIcon />
      </Button>
      <Button size="sm" variant="secondary" onClick={() => go(variant, !open)}>
        {open ? "Close popups" : "Open popups"}
      </Button>
    </div>,
    document.body
  )
}

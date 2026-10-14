// PROTOTYPE (wayfinder ticket #11): Themer CSS isolation, prefix vs root scope.
// ?variant=none|prefix|scoped|scoped-container  ?open=1 keeps popups open
// ?frame=themer|host renders a clean reference frame (used by the probe table).
import { createRoot } from "react-dom/client"

import themeCss from "./theme.css?raw"
import hostCss from "./host.css?inline"
import noneCss from "@workspace/themer-spike/dist/none.css?raw"
import prefixCss from "@workspace/themer-spike/dist/prefix.css?raw"
import scopedCss from "@workspace/themer-spike/dist/scoped.css?raw"
import { App, type Frame, type Variant, VARIANTS } from "./App"

const params = new URLSearchParams(location.search)
const variant = (VARIANTS.find((v) => v.key === params.get("variant"))?.key ?? "prefix") as Variant
const frame = (params.get("frame") ?? "main") as Frame
const open = params.get("open") === "1"

const themerCss = { none: noneCss, prefix: prefixCss, scoped: scopedCss, "scoped-container": scopedCss }[variant]
// Today's z-index lift for popups portalled to <body> (packages/themer host/themer.css).
const liftCss = `body:has([data-themer-overlay]) > [data-base-ui-portal],
body:has([data-themer-overlay]) > [data-base-ui-portal] > * { z-index: 10060; }`

function addStyle(id: string, css: string) {
  const el = document.createElement("style")
  el.dataset.sheet = id
  el.textContent = css
  document.head.append(el)
}

// Order matters: the Theme, then the Host app's CSS, then the Themer's (a library
// loaded by the Host, so it comes last, as a dev-only chunk would).
addStyle("theme", themeCss)
if (frame !== "themer") addStyle("host", hostCss)
if (frame !== "host") addStyle(`themer:${variant}`, themerCss + "\n" + liftCss)

createRoot(document.getElementById("root")!).render(<App variant={variant} frame={frame} open={open} />)

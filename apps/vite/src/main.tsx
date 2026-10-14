import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createThemerLoader } from "themercn/loader"

import "@workspace/ui/globals.css"

import { App } from "./app"

// Mirrors the README's Vite recipe. The condition is static, so a build
// with VITE_THEMER unset drops the import and ships no Themer code; the same
// condition gates the head script in vite.config.ts.
const ThemerLoader = createThemerLoader(
  import.meta.env.VITE_THEMER === "1" ? () => import("themercn") : null
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <ThemerLoader />
  </StrictMode>
)

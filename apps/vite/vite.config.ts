/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { getThemerHeadScript } from "themercn/head-script"
import { defineConfig, loadEnv, type Plugin } from "vite"

// Mirrors the README's Vite recipe: inline the Themer's head script in
// index.html so a saved Theme is applied before first paint. Same condition
// as the loader in src/main.tsx.
function themerHeadScript(): Plugin {
  return {
    name: "themer-head-script",
    transformIndexHtml: () => [
      {
        tag: "script",
        children: getThemerHeadScript(),
        injectTo: "head-prepend",
      },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const themer = env.VITE_THEMER === "1"

  return {
    plugins: [react(), tailwindcss(), themer && themerHeadScript()],
    test: { include: ["src/**/*.test.{ts,tsx}"] },
  }
})

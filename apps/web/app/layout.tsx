import type { Metadata } from "next"
import { Hanken_Grotesk, JetBrains_Mono, Young_Serif } from "next/font/google"
import { ThemerHeadScript } from "themercn/next"

import "./globals.css"
import { PlaygroundThemer } from "@/components/themer/playground-themer"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"

// The variables the Nightjar Preset's font stacks name (lib/brand/nightjar.ts).
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
})
const heading = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
})
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Nightjar Coffee Co.",
    template: "%s | Nightjar Coffee Co.",
  },
  description:
    "Small-batch coffee, brew guides and a subscription that remembers how you like it. The themercn Playground.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        sans.variable,
        heading.variable,
        mono.variable
      )}
    >
      <head>
        {/* Restores the saved Theme before first paint (README, Next quick
            start). Without a saved Theme, app/nightjar.css is the first paint. */}
        <ThemerHeadScript />
      </head>
      <body>
        <ThemeProvider>
          {children}
          {/* A sibling of the page, never around it. */}
          <PlaygroundThemer />
        </ThemeProvider>
      </body>
    </html>
  )
}

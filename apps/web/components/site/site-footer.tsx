import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { Illustration } from "@/components/illustrations/illustration"
import { BRAND, README_URL, footerNav, isExternal } from "@/lib/site"

/** The sitemap footer shared by the marketing, blog and shop route groups. */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            {BRAND.tagline} Roasted in small batches, written about at length.
          </p>
          <Illustration seed="nightjar" className="size-24" />
        </div>
        <nav
          aria-label="Sitemap"
          className="grid grid-cols-2 gap-8 sm:grid-cols-4"
        >
          {footerNav.map((group) => (
            <div key={group.heading}>
              <h2 className="mb-3 text-sm font-semibold">{group.heading}</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {isExternal(link.href) ? (
                      <a
                        href={link.href}
                        className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          Nightjar Coffee Co. is fictional. This site is the Playground for{" "}
          <a
            href={README_URL}
            className="font-medium text-foreground underline underline-offset-4"
          >
            themercn
          </a>
          , a live editor for shadcn Themes: press the button in the corner to
          restyle every page.
        </p>
      </div>
    </footer>
  )
}

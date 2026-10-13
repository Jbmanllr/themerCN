import Script from "next/script";
import { generateThemeScript } from "../utils/theme-script";

/**
 * Inline script that runs before hydration to apply persisted theme variables without a flash.
 * Use `next/script` here instead of a raw `<script>` element so App Router can execute it safely.
 * The script body is generateThemeScript (utils/theme-script.ts).
 *
 * Banter's hosts do not mount it: they run the same body from
 * host/head-script.tsx, a raw <script> that runs while the HTML is parsed
 * (docs/API.md "ThemeScript").
 */
export function ThemeScript() {
  return (
    <Script
      id="workspace-theme-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: generateThemeScript() }}
    />
  );
}

import { useCallback } from "react"
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query"
import type { PaginatedFontsResponse } from "../types/fonts"
import { fontSearchQuery } from "./use-font-search"

/**
 * The "Custom font" badge's lookup: true once the font catalog has answered
 * and names no family equal to `family`, ignoring case. One cached
 * useFontSearch query per family (limit 50, 24 h stale time); `null` asks
 * nothing and answers false.
 *
 * The match is decided once per response: react-query re-runs `select` only
 * when the cached pages or the family change, so a re-render of the caller
 * (opening the picker, typing in its search) lower-cases nothing.
 */
export function useCatalogLacksFamily(
  endpoint: string | undefined,
  family: string | null
): boolean {
  const namesFamily = useCallback(
    (data: InfiniteData<PaginatedFontsResponse>) => {
      const wanted = family?.toLowerCase()
      return data.pages.some((page) =>
        page.fonts.some((font) => font.family.toLowerCase() === wanted)
      )
    },
    [family]
  )
  const lookup = useInfiniteQuery({
    ...fontSearchQuery({
      endpoint,
      query: family ?? "",
      limit: 50,
      enabled: family !== null,
    }),
    select: namesFamily,
  })
  return lookup.isSuccess && !lookup.data
}

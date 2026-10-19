import { useInfiniteQuery } from "@tanstack/react-query"
import type { FilterFontCategory, PaginatedFontsResponse } from "../types/fonts"
import {
  FALLBACK_FONTS,
  filterAndPaginateFonts,
} from "../utils/font-catalog-data"

type UseFontSearchParams = {
  endpoint?: string
  query: string
  category?: FilterFontCategory
  limit?: number
  enabled?: boolean
}

/**
 * Searches the font catalog for the font picker. With an `endpoint` (the
 * Host's `fontCatalogEndpoint`) it pages through
 * `GET ?q=&category=&limit=&offset=` → `{ fonts, total, offset, limit, hasMore }`;
 * the Host's route owns API keys and gating. Without one it searches the
 * bundled list (FALLBACK_FONTS) in the browser, with the same paging.
 */
export function useFontSearch({
  endpoint,
  query,
  category = "all",
  limit = 20,
  enabled = true,
}: UseFontSearchParams) {
  return useInfiniteQuery({
    queryKey: ["themer-fonts", endpoint, query, category, limit],
    queryFn: async ({ pageParam }) => {
      if (!endpoint) {
        return filterAndPaginateFonts(FALLBACK_FONTS, {
          query,
          category,
          limit,
          offset: pageParam,
        })
      }

      const searchParams = new URLSearchParams({
        q: query,
        limit: String(limit),
        offset: String(pageParam),
      })

      if (category !== "all") {
        searchParams.set("category", category)
      }

      const response = await fetch(`${endpoint}?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch Google Fonts.")
      }

      return response.json() as Promise<PaginatedFontsResponse>
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    staleTime: 1000 * 60 * 60 * 24,
    enabled,
  })
}

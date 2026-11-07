import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query"
import type { FilterFontCategory, PaginatedFontsResponse } from "../types/fonts"
import {
  FALLBACK_CATALOG,
  filterAndPaginateFonts,
} from "../utils/font-catalog-data"

type UseFontSearchParams = {
  endpoint?: string
  query: string
  category?: FilterFontCategory
  limit?: number
  enabled?: boolean
}

/** The endpoint answered, but not with a page: carries the HTTP status. */
class FontCatalogResponseError extends Error {
  constructor(readonly status: number) {
    super(`The font catalog endpoint answered ${status}.`)
    this.name = "FontCatalogResponseError"
  }
}

/** The fetch itself failed: no answer reached the browser. */
class FontCatalogNetworkError extends Error {
  constructor(cause: unknown) {
    super("The font catalog endpoint could not be reached.", { cause })
    this.name = "FontCatalogNetworkError"
  }
}

/**
 * One retry, and only for a failure a second try can fix: a network error
 * or a 5xx. A 4xx (a disabled route's 404 included) is final. Overrides the
 * Themer's query client default.
 */
function retryCatalogFailure(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false
  if (error instanceof FontCatalogNetworkError) return true
  return error instanceof FontCatalogResponseError && error.status >= 500
}

/**
 * The font catalog query behind useFontSearch, for a caller that derives its
 * own answer from the same cached pages (the badge lookup,
 * use-catalog-lacks-family.ts).
 */
export function fontSearchQuery({
  endpoint,
  query,
  category = "all",
  limit = 20,
  enabled = true,
}: UseFontSearchParams) {
  return infiniteQueryOptions({
    queryKey: ["themer-fonts", endpoint, query, category, limit],
    queryFn: async ({ pageParam }): Promise<PaginatedFontsResponse> => {
      if (!endpoint) {
        return filterAndPaginateFonts(FALLBACK_CATALOG, {
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

      let response: Response
      try {
        response = await fetch(`${endpoint}?${searchParams.toString()}`)
      } catch (error) {
        throw new FontCatalogNetworkError(error)
      }
      if (!response.ok) {
        throw new FontCatalogResponseError(response.status)
      }

      return response.json() as Promise<PaginatedFontsResponse>
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    staleTime: 1000 * 60 * 60 * 24,
    retry: retryCatalogFailure,
    enabled,
  })
}

/**
 * Searches the font catalog for the font picker. With an `endpoint` (the
 * Host's `fontCatalogEndpoint`) it pages through
 * `GET ?q=&category=&limit=&offset=` → `{ fonts, total, offset, limit, hasMore }`;
 * the Host's route owns API keys and gating. Without one it searches the
 * bundled list (FALLBACK_CATALOG, prepared once per module load) in the
 * browser, with the same paging.
 * A failed request is retried once for a network error or a 5xx answer, never
 * for a 4xx.
 */
export function useFontSearch(params: UseFontSearchParams) {
  return useInfiniteQuery(fontSearchQuery(params))
}

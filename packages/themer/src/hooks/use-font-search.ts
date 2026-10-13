import { useInfiniteQuery } from "@tanstack/react-query";
import type {
  FilterFontCategory,
  PaginatedFontsResponse,
} from "../types/fonts";
import { DEFAULT_FONT_CATALOG_ENDPOINT } from "../utils/font-loader";

type UseFontSearchParams = {
  endpoint?: string;
  query: string;
  category?: FilterFontCategory;
  limit?: number;
  enabled?: boolean;
};

/**
 * Searches the host-owned font catalog for the dev font picker.
 *
 * The host endpoint owns API-key access, production gating, and fallback behavior; the package only
 * consumes the paginated response contract.
 */
export function useFontSearch({
  endpoint = DEFAULT_FONT_CATALOG_ENDPOINT,
  query,
  category = "all",
  limit = 20,
  enabled = true,
}: UseFontSearchParams) {
  return useInfiniteQuery({
    queryKey: ["themer-fonts", endpoint, query, category, limit],
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams({
        q: query,
        limit: String(limit),
        offset: String(pageParam),
      });

      if (category !== "all") {
        searchParams.set("category", category);
      }

      const response = await fetch(`${endpoint}?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Google Fonts.");
      }

      return response.json() as Promise<PaginatedFontsResponse>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    staleTime: 1000 * 60 * 60 * 24,
    enabled,
  });
}

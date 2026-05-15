import { useMemo } from "react";
import { Filters } from "@/component/Navbar";

type ItemState = "include" | "exclude";

function applyAdvFilter(dict: Record<string, ItemState>, val: string | string[]) {
  const inc = Object.entries(dict).filter(([, v]) => v === "include").map(([k]) => k);
  const exc = Object.entries(dict).filter(([, v]) => v === "exclude").map(([k]) => k);
  const isArr = Array.isArray(val);
  if (inc.length) {
    if (isArr) { if (!inc.every(i => (val as string[]).includes(i))) return false; }
    else { if (!inc.includes(val as string)) return false; }
  }
  if (exc.length) {
    if (isArr) { if (exc.some(e => (val as string[]).includes(e))) return false; }
    else { if (exc.includes(val as string)) return false; }
  }
  return true;
}

interface UseLibraryFilterOptions {
  stories: any[];
  search: string;
  sortBy: string;
  advFilters: Filters;
  vaultUnlocked: boolean;
  hiddenListIds: Set<string>;
}

export function useLibraryFilter({
  stories, search, sortBy, advFilters, vaultUnlocked, hiddenListIds,
}: UseLibraryFilterOptions) {
  const filtered = useMemo(() => {
    let result = stories.filter((s: any) => {
      const q = search.toLowerCase();
      const matchSearch = s.title.toLowerCase().includes(q) || s.author?.toLowerCase().includes(q);
      const matchStatus = Object.keys(advFilters.status).length === 0 || applyAdvFilter(advFilters.status, s.status ?? "");
      const matchTag = Object.keys(advFilters.tags).length === 0 || applyAdvFilter(advFilters.tags, s.tags ?? []);
      const matchRating = advFilters.rating === 0 || s.rating === advFilters.rating;
      return matchSearch && matchStatus && matchTag && matchRating;
    });

    if (Object.keys(advFilters.country).length) result = result.filter((s: any) => applyAdvFilter(advFilters.country, (s.originCountry || "").toUpperCase()));
    if (Object.keys(advFilters.demographic).length) result = result.filter((s: any) => applyAdvFilter(advFilters.demographic, s.demographic ?? ""));
    if (Object.keys(advFilters.genres).length) result = result.filter((s: any) => applyAdvFilter(advFilters.genres, s.genres ?? []));

    if (vaultUnlocked) {
      result = result.filter((s: any) => {
        const lists: string[] = s.lists || [];
        return s.hidden === true || lists.some((lid: string) => hiddenListIds.has(lid));
      });
    } else {
      result = result.filter((s: any) => {
        const lists: string[] = s.lists || [];
        return !s.hidden && !lists.some((lid: string) => hiddenListIds.has(lid));
      });
    }

    if (sortBy === "recent") result.sort((a: any, b: any) => new Date(b.chapterUpdatedAt).getTime() - new Date(a.chapterUpdatedAt).getTime());
    else if (sortBy === "added") result.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else if (sortBy === "rating") result.sort((a: any, b: any) => b.rating - a.rating);
    else if (sortBy === "title") result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    else if (sortBy === "unread") result.sort((a: any, b: any) => new Date(a.chapterUpdatedAt || 0).getTime() - new Date(b.chapterUpdatedAt || 0).getTime());

    return result;
  }, [stories, search, sortBy, advFilters, vaultUnlocked, hiddenListIds]);

  const advFilterCount =
    Object.keys(advFilters.status).length + Object.keys(advFilters.country).length +
    Object.keys(advFilters.genres).length + Object.keys(advFilters.tags).length +
    (advFilters.rating > 0 ? 1 : 0);

  return { filtered, advFilterCount };
}
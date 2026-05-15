import { useMemo } from "react";
import { ReadingList } from "@/lib/types";

export type VaultListsMap = Record<string, { list: ReadingList; stories: any[] }>;

export function useHiddenStories(stories: any[], listVersion: number) {
  const hiddenListIds = useMemo(() => {
    void listVersion;
    const savedLists: any[] = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    return new Set(savedLists.filter(l => l.isHidden).map(l => l.id));
  }, [stories, listVersion]);

  const hiddenStoriesMap = useMemo<VaultListsMap>(() => {
    const map: VaultListsMap = {};
    const savedLists: any[] = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    savedLists
      .filter(l => hiddenListIds.has(l.id))
      .forEach(l => { map[l.id] = { list: l as ReadingList, stories: [] }; });
    stories.forEach((s: any) => {
      const lists: string[] = s.lists || [];
      lists.forEach((lid: string) => {
        if (!map[lid]) return;
        map[lid].stories.push(s);
      });
    });
    return map;
  }, [stories, hiddenListIds]);

  const hiddenStoriesCount = useMemo(() => {
    return stories.filter((s: any) => {
      const lists: string[] = s.lists || [];
      return s.hidden === true || lists.some((lid: string) => hiddenListIds.has(lid));
    }).length;
  }, [stories, hiddenListIds]);

  const hiddenStoriesArray = useMemo(() => {
    const map = new Map();
    Object.values(hiddenStoriesMap)
      .flatMap(v => v.stories)
      .forEach((s: any) => map.set(s.id, s));
    stories
      .filter((s: any) => s.hidden)
      .forEach((s: any) => map.set(s.id, s));
    return Array.from(map.values());
  }, [hiddenStoriesMap, stories]);

  return { hiddenListIds, hiddenStoriesMap, hiddenStoriesCount, hiddenStoriesArray };
}
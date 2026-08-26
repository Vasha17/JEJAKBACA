import { useState, useEffect } from "react";
import { lsGet, lsSet } from "../utils/helpers";
import { StoryStatus } from "@/lib/types";

export type HistoryEntry = {
  id: string;
  type: "rating" | "status" | "note" | "chapter" | "title" | "author" | "genre" | "cover" | "header" | "bookmark";
  label: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
};

const hKey        = (sid: string) => `story_history_${sid}`;
const loadHistory = (sid: string): HistoryEntry[] => lsGet<HistoryEntry[]>(hKey(sid), []);
const saveHistory = (sid: string, e: HistoryEntry[]) => lsSet(hKey(sid), e);

export const pushHistory = (sid: string, entry: Omit<HistoryEntry, "id" | "createdAt">) => {
  const entries = loadHistory(sid);
  entries.unshift({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  saveHistory(sid, entries.slice(0, 50));
};

export function useStoryHistory(storyId: string, updateStory: (id: string, data: any) => void) {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (storyId) setHistoryEntries(loadHistory(storyId));
  }, [storyId]);

  const handleOpenHistory = () => {
    setHistoryEntries(loadHistory(storyId));
  };

  const handleUndoHistory = (entry: HistoryEntry, story: any) => {
    if (entry.type === "rating")  updateStory(storyId, { rating: Number(entry.oldValue) || 0 });
    if (entry.type === "status")  updateStory(storyId, { status: entry.oldValue as StoryStatus });
    if (entry.type === "chapter") updateStory(storyId, { currentChapter: Number(entry.oldValue) || 1, chapterUpdatedAt: new Date().toISOString() });
    if (entry.type === "title")   updateStory(storyId, { title: entry.oldValue });
    if (entry.type === "author")  updateStory(storyId, { author: entry.oldValue });
    if (entry.type === "cover")   updateStory(storyId, { coverUrl: entry.oldValue });
    if (entry.type === "header")  updateStory(storyId, { headerUrl: entry.oldValue });
    if (entry.type === "genre")   updateStory(storyId, { genres: entry.oldValue ? entry.oldValue.split(", ") : [] });
    // bookmark: gak direvert, cuma dihapus dari list history
    const updated = historyEntries.filter(e => e.id !== entry.id);
    saveHistory(storyId, updated);
    setHistoryEntries(updated);
  };

  const clearHistory = () => {
    saveHistory(storyId, []);
    setHistoryEntries([]);
  };

  return { historyEntries, handleOpenHistory, handleUndoHistory, clearHistory, loadHistory, saveHistory };
}
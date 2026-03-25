import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Story, createStory, saveGlobalTag } from "./types";
import { dexieAPI } from "./DexieDB";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SyncStats {
  lastSync: string | null;
  pendingCount: number;
  status: "idle" | "syncing" | "error" | "success";
}

interface StoryContextValue {
  stories: Story[];
  syncStats: SyncStats;
  isSynced: boolean;

  // CRUD
  getStory: (id: string) => Story | undefined;
  addStory: (partial: Partial<Story> & Pick<Story, "title">) => Promise<Story>;
  addStoryWithMeta: (story: Story) => Promise<Story>;
  updateStory: (id: string, updates: Partial<Story>) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;

  // Bookmarks
  addBookmark: (storyId: string, chapter: number, note?: string) => Promise<void>;
  removeBookmark: (storyId: string, bookmarkId: string) => Promise<void>;

  // Sources
  addSource: (
    storyId: string,
    source: { name: string; url: string; currentChapter: number; language: string }
  ) => Promise<void>;
  removeSource: (storyId: string, sourceId: string) => Promise<void>;
  updateSourceChapter: (storyId: string, sourceId: string, chapter: number) => Promise<void>;

  // Notes
  addNote: (storyId: string, text: string) => Promise<void>;
  removeNote: (storyId: string, noteId: string) => Promise<void>;

  // Media
  addMedia: (
    storyId: string,
    media: { type: "link" | "image"; url: string; label: string }
  ) => Promise<void>;
  removeMedia: (storyId: string, mediaId: string) => Promise<void>;

  // Tags
  addTagToStory: (storyId: string, tag: string) => Promise<void>;
  removeTagFromStory: (storyId: string, tag: string) => Promise<void>;

  // Lists
  addListToStory: (storyId: string, listId: string) => Promise<void>;
  removeListFromStory: (storyId: string, listId: string) => Promise<void>;

  // Sync
  triggerSync: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const StoryContext = createContext<StoryContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    lastSync: null,
    pendingCount: 0,
    status: "idle",
  });
  const isSynced = syncStats.status === "success" || syncStats.pendingCount === 0;
  const mountedRef = useRef(true);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const all = await dexieAPI.getAll();
        if (mountedRef.current) setStories(all);
      } catch (e) {
        console.error("StoryContext: failed to load stories", e);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Sync pending count on mount ───────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const unsynced = await dexieAPI.getUnsynced();
        if (mountedRef.current) {
          setSyncStats((prev) => ({ ...prev, pendingCount: unsynced.length }));
        }
      } catch {
        // ignore in fallback mode
      }
    })();
  }, []);

  // ── Core optimistic update helper ─────────────────────────────────────────────

  const applyUpdate = useCallback(async (id: string, updates: Partial<Story>) => {
    const now = new Date().toISOString();
    setStories((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: now } : s
      )
    );
    await dexieAPI.update(id, { ...updates, updatedAt: now });
    setSyncStats((prev) => ({
      ...prev,
      pendingCount: prev.pendingCount + 1,
      status: "idle",
    }));
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const getStory = useCallback(
    (id: string) => stories.find((s) => s.id === id),
    [stories]
  );

  const addStory = useCallback(
    async (partial: Partial<Story> & Pick<Story, "title">) => {
      const story = createStory(partial);
      await dexieAPI.add(story);
      setStories((prev) => [story, ...prev]);
      setSyncStats((prev) => ({ ...prev, pendingCount: prev.pendingCount + 1 }));
      return story;
    },
    []
  );

  const addStoryWithMeta = useCallback(async (story: Story) => {
    await dexieAPI.add(story);
    setStories((prev) => {
      if (prev.some((s) => s.id === story.id)) {
        return prev.map((s) => (s.id === story.id ? story : s));
      }
      return [story, ...prev];
    });
    setSyncStats((prev) => ({ ...prev, pendingCount: prev.pendingCount + 1 }));
    return story;
  }, []);

  const updateStory = useCallback(
    async (id: string, updates: Partial<Story>) => {
      await applyUpdate(id, updates);
    },
    [applyUpdate]
  );

  const deleteStory = useCallback(async (id: string) => {
    await dexieAPI.delete(id);
    setStories((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Bookmarks ─────────────────────────────────────────────────────────────────

  const addBookmark = useCallback(
    async (storyId: string, chapter: number, note = "") => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      const now = new Date().toISOString();
      const bookmark = {
        id: crypto.randomUUID(),
        chapter,
        note,
        createdAt: now,
        updatedAt: now,
      };
      await applyUpdate(storyId, {
        bookmarks: [...(story.bookmarks || []), bookmark],
      });
    },
    [stories, applyUpdate]
  );

  const removeBookmark = useCallback(
    async (storyId: string, bookmarkId: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      await applyUpdate(storyId, {
        bookmarks: (story.bookmarks || []).filter((b) => b.id !== bookmarkId),
      });
    },
    [stories, applyUpdate]
  );

  // ── Sources ───────────────────────────────────────────────────────────────────

  const addSource = useCallback(
    async (
      storyId: string,
      source: { name: string; url: string; currentChapter: number; language: string }
    ) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      const now = new Date().toISOString();
      const newSource = {
        id: crypto.randomUUID(),
        lastOpenedAt: now,
        updatedAt: now,
        ...source,
      };
      await applyUpdate(storyId, {
        sources: [...(story.sources || []), newSource],
      });
    },
    [stories, applyUpdate]
  );

  const removeSource = useCallback(
    async (storyId: string, sourceId: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      await applyUpdate(storyId, {
        sources: (story.sources || []).filter((s) => s.id !== sourceId),
      });
    },
    [stories, applyUpdate]
  );

  const updateSourceChapter = useCallback(
    async (storyId: string, sourceId: string, chapter: number) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      const now = new Date().toISOString();
      const sources = (story.sources || []).map((s) =>
        s.id === sourceId ? { ...s, currentChapter: chapter, updatedAt: now } : s
      );
      await applyUpdate(storyId, { sources });
    },
    [stories, applyUpdate]
  );

  // ── Notes ─────────────────────────────────────────────────────────────────────

  const addNote = useCallback(
    async (storyId: string, text: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      const now = new Date().toISOString();
      const note = {
        id: crypto.randomUUID(),
        text,
        createdAt: now,
        updatedAt: now,
      };
      await applyUpdate(storyId, {
        notes: [...(story.notes || []), note],
      });
    },
    [stories, applyUpdate]
  );

  const removeNote = useCallback(
    async (storyId: string, noteId: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      await applyUpdate(storyId, {
        notes: (story.notes || []).filter((n) => n.id !== noteId),
      });
    },
    [stories, applyUpdate]
  );

  // ── Media ─────────────────────────────────────────────────────────────────────

  const addMedia = useCallback(
    async (
      storyId: string,
      item: { type: "link" | "image"; url: string; label: string }
    ) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      const mediaItem = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...item,
      };
      await applyUpdate(storyId, {
        media: [...(story.media || []), mediaItem],
      });
    },
    [stories, applyUpdate]
  );

  const removeMedia = useCallback(
    async (storyId: string, mediaId: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      await applyUpdate(storyId, {
        media: (story.media || []).filter((m) => m.id !== mediaId),
      });
    },
    [stories, applyUpdate]
  );

  // ── Tags ──────────────────────────────────────────────────────────────────────

  const addTagToStory = useCallback(
    async (storyId: string, tag: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      const tags = Array.from(new Set([...(story.tags || []), tag]));
      await applyUpdate(storyId, { tags });
      try { saveGlobalTag(tag); } catch {}
    },
    [stories, applyUpdate]
  );

  const removeTagFromStory = useCallback(
    async (storyId: string, tag: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      await applyUpdate(storyId, {
        tags: (story.tags || []).filter((t) => t !== tag),
      });
    },
    [stories, applyUpdate]
  );

  // ── Lists ─────────────────────────────────────────────────────────────────────

  const addListToStory = useCallback(
    async (storyId: string, listId: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      const lists = Array.from(new Set([...(story.lists || []), listId]));
      await applyUpdate(storyId, { lists });
    },
    [stories, applyUpdate]
  );

  const removeListFromStory = useCallback(
    async (storyId: string, listId: string) => {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;
      await applyUpdate(storyId, {
        lists: (story.lists || []).filter((l) => l !== listId),
      });
    },
    [stories, applyUpdate]
  );

  // ── Sync ──────────────────────────────────────────────────────────────────────

  const triggerSync = useCallback(async () => {
    setSyncStats((prev) => ({ ...prev, status: "syncing" }));
    try {
      let userId: string | null = null;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
      } catch {}

      if (userId) {
        await dexieAPI.sync(userId);
        const [all, unsynced] = await Promise.all([
          dexieAPI.getAll(),
          dexieAPI.getUnsynced(),
        ]);
        if (mountedRef.current) {
          setStories(all);
          setSyncStats({
            lastSync: new Date().toISOString(),
            pendingCount: unsynced.length,
            status: "success",
          });
        }
      } else {
        if (mountedRef.current) {
          setSyncStats((prev) => ({ ...prev, status: "idle" }));
        }
      }
    } catch (e) {
      console.error("triggerSync failed:", e);
      if (mountedRef.current) {
        setSyncStats((prev) => ({ ...prev, status: "error" }));
      }
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <StoryContext.Provider
      value={{
        stories,
        syncStats,
        isSynced,
        addStoryWithMeta,
        addStory,
        updateStory,
        deleteStory,
        getStory,
        addBookmark,
        removeBookmark,
        addSource,
        removeSource,
        updateSourceChapter,
        addNote,
        removeNote,
        addMedia,
        removeMedia,
        addTagToStory,
        removeTagFromStory,
        addListToStory,
        removeListFromStory,
        triggerSync,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useStories() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error("useStories must be used within StoryProvider");
  return ctx;
}
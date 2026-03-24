import { createContext, useContext, useCallback, ReactNode, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Story, createStory, Bookmark, ReadingSource, StoryNote, MediaItem, saveGlobalTag } from "./types";
import { dexieAPI, migrateFromLocalStorage } from "./DexieDB";
import { useRealtimeSync } from "./SupabaseSync";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface SyncStats {
  local: number;
  cloud: number;
  conflicts: number;
}

interface StoryContextValue {
  stories: Story[];
  syncStats: SyncStats;
  isSynced: boolean;
  addStory: (data: Partial<Story> & Pick<Story, "title">) => Story;
  addStoryWithMeta: (metaData: any) => Promise<Story>; 
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  getStory: (id: string) => Story | undefined;
  addBookmark: (storyId: string, chapter: number, note: string) => void;
  removeBookmark: (storyId: string, bookmarkId: string) => void;
  addSource: (storyId: string, source: Omit<ReadingSource, "id" | "updatedAt" | "lastOpenedAt">) => void;
  removeSource: (storyId: string, sourceId: string) => void;
  updateSourceChapter: (storyId: string, sourceId: string, chapter: number) => void;
  addNote: (storyId: string, text: string) => void;
  removeNote: (storyId: string, noteId: string) => void;
  addMedia: (storyId: string, media: Omit<MediaItem, "id" | "createdAt">) => void;
  removeMedia: (storyId: string, mediaId: string) => void;
  addTagToStory: (storyId: string, tag: string) => void;
  removeTagFromStory: (storyId: string, tag: string) => void;
  addListToStory: (storyId: string, list: string) => void;
  removeListFromStory: (storyId: string, list: string) => void;
  triggerSync: () => Promise<void>;
}

const StoryContext = createContext<StoryContextValue | null>(null);

export function StoryProvider({ children }: { children: ReactNode }) {
  // Migrate on mount
  useEffect(() => {
    migrateFromLocalStorage();
  }, []);

  // Live stories from Dexie
  const stories = useLiveQuery(() => dexieAPI.getAll(), []) ?? [];

  // Auth State
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useRealtimeSync(session?.user?.id ?? undefined);

  // --- FUNGSI TAMBAHAN ---
const addStoryWithMeta = async (metaData: any) => {
  const newStory = createStory({
    title: metaData.title || "Untitled Story",
    author: metaData.author || "Unknown",
    altTitle: metaData.altTitle || "",
    genres: Array.isArray(metaData.genre)
      ? metaData.genre
      : metaData.genre ? [metaData.genre] : [],
    originCountry: metaData.country || "",   
    tags: Array.isArray(metaData.tags) ? metaData.tags : [],
    demographic: metaData.demographic || "",
    coverUrl: metaData.cover || "",
    synopsis: metaData.description || "",
    whereToRead: metaData.whereToRead || "",
  });

  dexieAPI.add(newStory);
  return newStory;
};

  // --- SYNC STATS LOGIC ---
  const syncStats: SyncStats = {
    local: stories.filter(s => {
      if (!s.cloudUpdatedAt) return true;
      return new Date(s.updatedAt) > new Date(s.cloudUpdatedAt); 
    }).length,

    cloud: stories.filter(s => {
      return s.cloudUpdatedAt && new Date(s.updatedAt).getTime() === new Date(s.cloudUpdatedAt).getTime();
    }).length,

    conflicts: 0 
  };
  
  const isSynced = syncStats.local === 0 && syncStats.conflicts === 0;

  const triggerSync = useCallback(async () => {
    if (!session?.user?.id) {
      console.warn("User not logged in, skipping sync.");
      return;
    }
    try {
      console.log('Sync triggered for user:', session.user.id);
      if ((dexieAPI as any).sync) {
        await (dexieAPI as any).sync(session.user.id);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, [session]);

  const addStory = useCallback((data: Partial<Story> & Pick<Story, "title">) => {
    const story = createStory(data);
    dexieAPI.add(story); 
    return story;
  }, []);

  const updateStory = useCallback(async (id: string, updates: Partial<Story>) => {
    await dexieAPI.update(id, updates);
  }, []);

  const deleteStory = useCallback(async (id: string) => {
    await dexieAPI.delete(id);
  }, []);

  const getStory = useCallback((id: string) => {
    if (Array.isArray(stories)) {
      return stories.find(s => s.id === id);
    }
    return undefined;
  }, [stories]);

  const addBookmark = useCallback(async (storyId: string, chapter: number, note: string) => {
    const now = new Date().toISOString();
    const bookmark: Bookmark = { id: crypto.randomUUID(), chapter, note, createdAt: now, updatedAt: now };
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        bookmarks: [...(story.bookmarks || []), bookmark] 
      });
    }
  }, []);

  const removeBookmark = useCallback(async (storyId: string, bookmarkId: string) => {
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        bookmarks: story.bookmarks.filter(b => b.id !== bookmarkId) 
      });
    }
  }, []);

  const addSource = useCallback(async (storyId: string, source: Omit<ReadingSource, "id" | "updatedAt" | "lastOpenedAt">) => {
    const now = new Date().toISOString();
    const newSource: ReadingSource = { ...source, id: crypto.randomUUID(), lastOpenedAt: now, updatedAt: now };
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        sources: [...(story.sources || []), newSource] 
      });
    }
  }, []);

  const removeSource = useCallback(async (storyId: string, sourceId: string) => {
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        sources: story.sources.filter(src => src.id !== sourceId) 
      });
    }
  }, []);

  const updateSourceChapter = useCallback(async (storyId: string, sourceId: string, chapter: number) => {
    const now = new Date().toISOString();
    const story = await dexieAPI.get(storyId);
    if (story) {
      const updatedSources = story.sources.map(src => 
        src.id === sourceId 
          ? { ...src, currentChapter: chapter, updatedAt: now }
          : src
      );
      await dexieAPI.update(storyId, { sources: updatedSources });
    }
  }, []);

  const addNote = useCallback(async (storyId: string, text: string) => {
    const now = new Date().toISOString();
    const note: StoryNote = { id: crypto.randomUUID(), text, createdAt: now, updatedAt: now };
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        notes: [...(story.notes || []), note] 
      });
    }
  }, []);

  const removeNote = useCallback(async (storyId: string, noteId: string) => {
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        notes: story.notes.filter(n => n.id !== noteId) 
      });
    }
  }, []);

  const addMedia = useCallback(async (storyId: string, media: Omit<MediaItem, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const item: MediaItem = { ...media, id: crypto.randomUUID(), createdAt: now };
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        media: [...(story.media || []), item] 
      });
    }
  }, []);

  const removeMedia = useCallback(async (storyId: string, mediaId: string) => {
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        media: (story.media || []).filter(m => m.id !== mediaId) 
      });
    }
  }, []);

  const addTagToStory = useCallback(async (storyId: string, tag: string) => {
    saveGlobalTag(tag);
    const story = await dexieAPI.get(storyId);
    if (story && !story.tags.includes(tag)) {
      await dexieAPI.update(storyId, { 
        tags: [...story.tags, tag] 
      });
    }
  }, []);

  const removeTagFromStory = useCallback(async (storyId: string, tag: string) => {
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        tags: story.tags.filter(t => t !== tag) 
      });
    }
  }, []);

  const addListToStory = useCallback(async (storyId: string, list: string) => {
    const story = await dexieAPI.get(storyId);
    if (story && !story.lists.includes(list)) {
      await dexieAPI.update(storyId, { 
        lists: [...story.lists, list] 
      });
    }
  }, []);

  const removeListFromStory = useCallback(async (storyId: string, list: string) => {
    const story = await dexieAPI.get(storyId);
    if (story) {
      await dexieAPI.update(storyId, { 
        lists: story.lists.filter(l => l !== list) 
      });
    }
  }, []);

  return (
    <StoryContext.Provider value={{
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
      triggerSync
    }}>
      {children}
    </StoryContext.Provider>
  );
}

export function useStories() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error("useStories must be used within StoryProvider");
  return ctx;
}
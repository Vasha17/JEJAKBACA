export type StoryStatus = "reading" | "completed" | "on-hold" | "dropped" | "plan-to-read" | "re-reading" | "hiatus";

export interface Bookmark {
  id: string;
  chapter: number;
  note: string;
  createdAt: string;
  updatedAt: string;
  isHidden?: boolean;
}

export interface ReadingSource {
  id: string;
  name: string;
  url: string;
  currentChapter: number;
  language: string; // e.g. "EN", "ID", "KR"
  lastOpenedAt: string;
  updatedAt: string;
}

export interface StoryNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  type: "link" | "image";
  url: string;
  label: string;
  createdAt: string;
}

// === Story Relationships ===
export type RelationType = "prequel" | "sequel" | "spin-off" | "side-story" | "adaptation" | "related";
export interface StoryRelation {
  id: string;
  targetStoryId: string;
  relationType: RelationType;
}

// === Version History ===
export interface HistoryEntry {
  id: string;
  field: string; // "rating" | "notes" | "status" etc.
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export interface Story {
  orderIndex?: number;
  totalChapters?: any;
  type?: any;
  id: string;
  title: string;
  altTitle: string;
  author: string;
  status: StoryStatus;
  rating: number; // 1-10
  whereToRead?: string;  
  tags: string[];
  currentChapter: number;
  chapterUpdatedAt: string;
  updatedAt: string;
  cloudUpdatedAt?: string;
  synopsis: string;
  notes: StoryNote[];
  bookmarks: Bookmark[];
  sources: ReadingSource[];
  media: MediaItem[];
  coverUrl: string;
  headerUrl: string;
  createdAt: string;
  lists: string[];
  originCountry?: string; 
  relations: StoryRelation[];
  history: HistoryEntry[];
  genres?: string[];
  hidden?: boolean; 
  demographic?: string;  
}


export const DEFAULT_LISTS: string[] = [];

// Global tags persist across stories
const GLOBAL_TAGS_KEY = "jejakbaca_global_tags";

export function getGlobalTags(): string[] {
  try {
    const data = localStorage.getItem(GLOBAL_TAGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveGlobalTag(tag: string) {
  const tags = getGlobalTags();
  if (!tags.includes(tag)) {
    tags.push(tag);
    localStorage.setItem(GLOBAL_TAGS_KEY, JSON.stringify(tags));
  }
}

// Remove a single global tag (case-insensitive)
export function removeGlobalTag(tag: string) {
  try {
    const existing = getGlobalTags();
    const norm = (t: string) => t.trim().toUpperCase();
    const filtered = existing.filter(t => norm(t) !== norm(tag));
    localStorage.setItem(GLOBAL_TAGS_KEY, JSON.stringify(filtered));
  } catch {
    // noop
  }
}

// Remove multiple global tags at once (case-insensitive)
export function removeGlobalTags(tagsToRemove: string[]) {
  try {
    const removeSet = new Set(tagsToRemove.map(t => t.trim().toUpperCase()));
    const filtered = getGlobalTags().filter(t => !removeSet.has(t.trim().toUpperCase()));
    localStorage.setItem(GLOBAL_TAGS_KEY, JSON.stringify(filtered));
  } catch {
    // noop
  }
}

// Global custom lists
const CUSTOM_LISTS_KEY = "jejakbaca_custom_lists";

export function getCustomLists(): string[] {
  try {
    const data = localStorage.getItem(CUSTOM_LISTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCustomList(list: string) {
  const lists = getCustomLists();
  if (!lists.includes(list)) {
    lists.push(list);
    localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(lists));
  }
}

export function createStory(partial: Partial<Story> & Pick<Story, "title">): Story {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    altTitle: "",
    author: "",
    status: "reading",
    rating: 0,
    tags: [],
    currentChapter: 1,
    chapterUpdatedAt: now,
    updatedAt: now, 
    synopsis: "",
    notes: [],
    bookmarks: [],
    sources: [],
    media: [],
    coverUrl: "",
    headerUrl: "",
    createdAt: now,
    lists: [],
    relations: [],
    history: [],
    originCountry: "",
    hidden: false,
    ...partial, 
  };
}

export interface ReadingList {
  stories: any[];
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  color?: string;
  visibility: "public" | "private";
  isHidden?: boolean;
  userId: string;
  storyIds: string[];
  count: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// === Helper to convert blob URL to data URL ===
export function blobToDataUrl(blobUrl: string): Promise<string> {
  return fetch(blobUrl)
    .then(r => r.blob())
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
}
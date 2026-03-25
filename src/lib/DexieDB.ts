import Dexie, { Table } from 'dexie';
import type { Story } from './types';

export enum SyncStatus {
  LOCAL    = 'local',
  SYNCED   = 'synced',
  CONFLICT = 'conflict',
  SYNCING  = 'syncing'
}

export interface DexieStory extends Story {
  sync_status: SyncStatus;
  last_sync?: string;
  version: number;
  updated_at: string;
}

export class JejakBacaDB extends Dexie {
  stories!: Table<DexieStory>;

  constructor() {
    super('JejakBacaDB');
    this.version(2).stores({
      stories: 'id, title*, status, rating, updated_at, sync_status, version'
    });
  }
}

// ── Lazy Initialization ────────────────────────────────
let dbInstance: JejakBacaDB | null = null;
let isInitializing = false;
let initPromise: Promise<JejakBacaDB | null> | null = null;

// Fallback mode jika IndexedDB diblokir (Incognito)
let isFallbackMode = false;
let memoryStories: Story[] = [];

async function getDB(): Promise<JejakBacaDB | null> {
  // Jika sudah ada instance, kembalikan
  if (dbInstance) return dbInstance;
  
  // Jika sedang proses inisialisasi, tunggu promise yang sama
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isInitializing) return dbInstance; 
    isInitializing = true;

    try {      
      if (!window.indexedDB) {
        throw new Error("IndexedDB not supported");
      }

      const db = new JejakBacaDB();
      await db.open(); 
      dbInstance = db;
      console.log("✅ Dexie Connected");
      
      // Jika sukses, coba migrasi dari localStorage
      await migrateFromLocalStorageInternal(db);
      
      return db;
    } catch (error) {
      console.warn("⚠️ IndexedDB blocked or failed. Switching to Memory Mode.", error);
      isFallbackMode = true;
      
      // Load data awal dari localStorage jika ada, sebagai cadangan
      try {
        const stored = localStorage.getItem('jejakbaca_stories_fallback');
        if (stored) memoryStories = JSON.parse(stored);
      } catch (e) {}
      
      return null; // Return null karena DB tidak tersedia
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

// ── Helper: Story → DexieStory ─────────────────────────────────────────────
function toDexie(story: Story, status: SyncStatus = SyncStatus.LOCAL): DexieStory {
  return {
    ...story,
    sync_status: status,
    version: 1,
    updated_at: story.updatedAt ?? new Date().toISOString(),
  };
}

// ── Helper: DexieStory → Story (buang field sync) ─────────────────────────
function toStory(record: DexieStory): Story {  
  const { sync_status, last_sync, version, updated_at, ...story } = record;
  return story;
}

// ── API Wrapper (Menghandle kedua mode: DB & Memory) ─────────────────────
export const dexieAPI = {
  getAll: async (): Promise<Story[]> => {
    if (isFallbackMode) return [...memoryStories];
    const db = await getDB();
    if (!db) return [...memoryStories];
    return await db.stories.orderBy('updated_at').reverse().toArray().then(recs => recs.map(toStory));
  },

  get: async (id: string): Promise<Story | undefined> => {
    if (isFallbackMode) return memoryStories.find(s => s.id === id);
    const db = await getDB();
    if (!db) return memoryStories.find(s => s.id === id);
    const record = await db.stories.get(id);
    return record ? toStory(record) : undefined;
  },

  add: async (story: Story): Promise<Story> => {
    if (isFallbackMode) {
      memoryStories.push(story);
      persistFallback();
      return story;
    }
    const db = await getDB();
    if (!db) {
      memoryStories.push(story);
      persistFallback();
      return story;
    }
    const dexieStory = toDexie(story);
    await db.stories.add(dexieStory);
    return story;
  },

  update: async (id: string, updates: Partial<Story>): Promise<void> => {
    if (isFallbackMode) {
      const idx = memoryStories.findIndex(s => s.id === id);
      if (idx !== -1) {
        memoryStories[idx] = { ...memoryStories[idx], ...updates, updatedAt: new Date().toISOString() };
        persistFallback();
      }
      return;
    }
    const db = await getDB();
    if (!db) {
      // Fallback update jika DB tiba-tiba mati
      const idx = memoryStories.findIndex(s => s.id === id);
      if (idx !== -1) {
        memoryStories[idx] = { ...memoryStories[idx], ...updates, updatedAt: new Date().toISOString() };
        persistFallback();
      }
      return;
    }
    await db.stories.where('id').equals(id).modify(item => {
      Object.assign(item, updates);
      item.updated_at  = new Date().toISOString();
      item.updatedAt   = item.updated_at; 
      item.sync_status = SyncStatus.LOCAL;
      item.version     = (item.version ?? 0) + 1;
    });
  },

  delete: async (id: string): Promise<void> => {
    if (isFallbackMode) {
      memoryStories = memoryStories.filter(s => s.id !== id);
      persistFallback();
      return;
    }
    const db = await getDB();
    if (!db) return;
    await db.stories.delete(id);
  },

  // Fungsi sync hanya jalan jika DB nyala
  setSynced: async (ids: string[], version: number): Promise<void> => {
    const db = await getDB();
    if (!db) return;
    if (ids.length === 0) return;
    await db.stories
      .where('id').anyOf(ids)
      .modify({
        sync_status: SyncStatus.SYNCED,
        last_sync: new Date().toISOString(),
        version,
      });
  },

  getUnsynced: async (): Promise<DexieStory[]> => {
    const db = await getDB();
    if (!db) return [];
    return db.stories
      .where('sync_status').equals(SyncStatus.LOCAL)
      .or('sync_status').equals(SyncStatus.CONFLICT)
      .toArray();
  },

  clearConflicts: async (): Promise<void> => {
    const db = await getDB();
    if (!db) return;
    await db.stories
      .where('sync_status').equals(SyncStatus.CONFLICT)
      .modify({ sync_status: SyncStatus.LOCAL });
  },

  upsertFromCloud: async (story: Story, version: number): Promise<void> => {
    const db = await getDB();
    if (!db) return;
    const existing = await db.stories.get(story.id);
    await db.stories.put({
      ...toDexie(story, SyncStatus.SYNCED),
      version,
      last_sync: new Date().toISOString(),
      sync_status: existing?.sync_status === SyncStatus.LOCAL
        ? SyncStatus.CONFLICT
        : SyncStatus.SYNCED,
    });
  },

  sync: async (userId: string): Promise<void> => {
    const { syncAPI } = await import('./SupabaseSync');
    await syncAPI.sync(userId);
  },
};

// ── Helper Internal untuk Persist ke localStorage (Fallback Mode) ────────
function persistFallback() {
  try {
    localStorage.setItem('jejakbaca_stories_fallback', JSON.stringify(memoryStories));
  } catch (e) {}
}

// ── Migrate dari localStorage ──────────────────────────────────────────────
async function migrateFromLocalStorageInternal(db: JejakBacaDB): Promise<void> {
  const existing = await db.stories.count();
  if (existing > 0) return;

  try {
    const { loadStories } = await import('./storage'); 
    const stories = loadStories();
    if (stories.length === 0) return;

    const dexieStories: DexieStory[] = stories.map(s => ({
      ...s,
      id:          s.id || crypto.randomUUID(),
      createdAt:   s.createdAt || new Date().toISOString(),
      updated_at:  s.updatedAt || new Date().toISOString(),
      sync_status: SyncStatus.LOCAL,
      version:     1,
    }));

    await db.stories.bulkAdd(dexieStories);
    console.log(`Migrated ${dexieStories.length} stories from localStorage`);
  } catch (e) {
    console.error("Migration failed:", e);
  }
}

export const migrateFromLocalStorage = async () => {
  const db = await getDB();
  if (db) await migrateFromLocalStorageInternal(db);
};

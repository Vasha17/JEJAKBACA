import Dexie, { Table } from 'dexie';
import type { Story } from './types';

export enum SyncStatus {
  LOCAL    = 'local',
  SYNCED   = 'synced',
  CONFLICT = 'conflict',
  SYNCING  = 'syncing',
  DELETED  = 'deleted', 
}

export interface DexieStory extends Story {
  data: any;
  sync_status: SyncStatus;
  last_sync?: string;
  version: number;
  updated_at: string;
}

interface PendingDelete {
  id: string;
  deleted_at: string;
}

export class JejakBacaDB extends Dexie {
  stories!: Table<DexieStory>;
  pending_deletes!: Table<PendingDelete>; // NEW

  constructor() {
    super('JejakBacaDB');
    this.version(2).stores({
      stories: 'id, title*, status, rating, updated_at, sync_status, version'
    });    
    this.version(3).stores({
      stories: 'id, title*, status, rating, updated_at, sync_status, version',
      pending_deletes: 'id, deleted_at'
    });
  }
}

export const db = new JejakBacaDB();

// ── Lazy Initialization ────────────────────────────────────────────────────
let initPromise: Promise<JejakBacaDB | null> | null = null;
let isFallbackMode = false;
let memoryStories: Story[] = [];

async function getDB(): Promise<JejakBacaDB | null> {  
  if (db.isOpen()) return db;
  
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (!window.indexedDB) throw new Error("IndexedDB not supported");
        await db.open();
        console.log("✅ Dexie Connected");
        await migrateFromLocalStorageInternal(db);
        return db;
      } catch (error) {
        console.warn("⚠️ IndexedDB blocked. Switching to Memory Mode.", error);
        isFallbackMode = true;
        initPromise = null;
        try {
          const stored = localStorage.getItem('jejakbaca_stories_fallback');
          if (stored) memoryStories = JSON.parse(stored);
        } catch (e) {}
        return null;
      }
    })();
  }

  return initPromise;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function toDexie(story: Story, status: SyncStatus = SyncStatus.LOCAL): DexieStory {
  return {
    ...story,
    sync_status: status,
    version: 1,
    updated_at: story.updatedAt ?? new Date().toISOString(),
    data: undefined,
    last_sync: undefined,
  };
}

function toStory(record: DexieStory): Story {
  const { sync_status, last_sync, version, updated_at, data, ...story } = record;
  return story;
}

// ── API ────────────────────────────────────────────────────────────────────
export const dexieAPI = {
  getAll: async (): Promise<Story[]> => {
    if (isFallbackMode) return [...memoryStories];
    const dbConn = await getDB();
    if (!dbConn) return [...memoryStories];
    return dbConn.stories.orderBy('updated_at').reverse().toArray().then(recs => recs.map(toStory));
  },

  get: async (id: string): Promise<Story | undefined> => {
    if (isFallbackMode) return memoryStories.find(s => s.id === id);
    const dbConn = await getDB();
    if (!dbConn) return memoryStories.find(s => s.id === id);
    const record = await dbConn.stories.get(id);
    return record ? toStory(record) : undefined;
  },

  add: async (story: Story): Promise<Story> => {
    if (isFallbackMode) {
      memoryStories.push(story);
      persistFallback();
      return story;
    }
    const dbConn = await getDB();
    if (!dbConn) { memoryStories.push(story); persistFallback(); return story; }
    const dexieStory = toDexie(story);
    await dbConn.stories.add(dexieStory);
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
    const dbConn = await getDB();
    if (!dbConn) {
      const idx = memoryStories.findIndex(s => s.id === id);
      if (idx !== -1) {
        memoryStories[idx] = { ...memoryStories[idx], ...updates, updatedAt: new Date().toISOString() };
        persistFallback();
      }
      return;
    }
    await dbConn.stories.where('id').equals(id).modify(item => {
      Object.assign(item, updates);
      const now = new Date().toISOString();
      item.updated_at  = now;
      item.updatedAt   = now;
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
    const dbConn = await getDB();
    if (!dbConn) return;
    await dbConn.stories.delete(id);    
    try {
      await dbConn.pending_deletes.put({ id, deleted_at: new Date().toISOString() });
    } catch (e) {
      console.warn('pending_deletes put failed:', e);
    }
  },
  
  deleteStory: async (id: string): Promise<void> => {
    if (isFallbackMode) {
      memoryStories = memoryStories.filter(s => s.id !== id);
      persistFallback();
      return;
    }
    const dbConn = await getDB();
    if (!dbConn) return;    
    await dbConn.stories.delete(id);
  },

  // Ambil semua ID stories lokal (untuk diff dengan cloud)
  getAllIds: async (): Promise<string[]> => {
    if (isFallbackMode) return memoryStories.map(s => s.id);
    const dbConn = await getDB();
    if (!dbConn) return memoryStories.map(s => s.id);
    const all = await dbConn.stories.toCollection().primaryKeys();
    return all as string[];
  },

  // Ambil semua ID yang pending delete (belum di-push ke cloud)
  getPendingDeletes: async (): Promise<string[]> => {
    const dbConn = await getDB();
    if (!dbConn) return [];
    try {
      const records = await dbConn.pending_deletes.toArray();
      return records.map(r => r.id);
    } catch (e) {
      return [];
    }
  },

  // Hapus entry dari pending_deletes setelah berhasil di-push ke cloud
  clearPendingDelete: async (id: string): Promise<void> => {
    const dbConn = await getDB();
    if (!dbConn) return;
    try {
      await dbConn.pending_deletes.delete(id);
    } catch (e) {
      console.warn('clearPendingDelete failed:', e);
    }
  },

  setSynced: async (ids: string[], version: number): Promise<void> => {
    const dbConn = await getDB();
    if (!dbConn || ids.length === 0) return;
    await dbConn.stories
      .where('id').anyOf(ids)
      .modify({ sync_status: SyncStatus.SYNCED, last_sync: new Date().toISOString(), version });
  },

  getUnsynced: async (): Promise<DexieStory[]> => {
    const dbConn = await getDB();
    if (!dbConn) return [];
    return dbConn.stories
      .where('sync_status').equals(SyncStatus.LOCAL)
      .or('sync_status').equals(SyncStatus.CONFLICT)
      .toArray();
  },

  getPendingCount: async (): Promise<number> => {
    const dbConn = await getDB();
    if (!dbConn) return 0;
    return dbConn.stories
      .where('sync_status').equals(SyncStatus.LOCAL)
      .or('sync_status').equals(SyncStatus.CONFLICT)
      .count();
  },

  clearConflicts: async (): Promise<void> => {
    const dbConn = await getDB();
    if (!dbConn) return;
    await dbConn.stories
      .where('sync_status').equals(SyncStatus.CONFLICT)
      .modify({ sync_status: SyncStatus.LOCAL });
  },

  upsertFromCloud: async (story: Story, cloudVersion: number): Promise<void> => {
    const dbConn = await getDB();
    if (!dbConn) return;

    const existing = await dbConn.stories.get(story.id);

    if (!existing) {
      await dbConn.stories.put({
        ...toDexie(story, SyncStatus.SYNCED),
        version: cloudVersion,
        last_sync: new Date().toISOString(),
      });
      return;
    }

    if (existing.sync_status === SyncStatus.LOCAL) {
      await dbConn.stories.where('id').equals(story.id).modify(item => {        
        item.sync_status = SyncStatus.CONFLICT;
        item.data = story; 
      });
      console.warn(`⚠️ Conflict detected for story "${story.title}" — local version preserved`);
      return;
    }
    
    if (existing.sync_status === SyncStatus.CONFLICT) {
      console.warn(`⚠️ Story "${story.title}" masih conflict, skip cloud update`);
      return;
    }
    
    await dbConn.stories.put({
      ...toDexie(story, SyncStatus.SYNCED),
      version: cloudVersion,
      last_sync: new Date().toISOString(),
    });
  },

  getConflictCloudVersion: async (id: string): Promise<Story | null> => {
    const dbConn = await getDB();
    if (!dbConn) return null;
    const record = await dbConn.stories.get(id);
    if (!record || record.sync_status !== SyncStatus.CONFLICT) return null;
    return record.data as Story ?? null;
  },

  resolveConflict: async (id: string, resolution: 'local' | 'cloud'): Promise<void> => {
    const dbConn = await getDB();
    if (!dbConn) return;
    const record = await dbConn.stories.get(id);
    if (!record || record.sync_status !== SyncStatus.CONFLICT) return;

    if (resolution === 'local') {
      await dbConn.stories.where('id').equals(id).modify(item => {
        item.sync_status = SyncStatus.LOCAL;
        item.data = undefined;
      });
    } else {
      const cloudStory = record.data as Story;
      if (!cloudStory) return;
      await dbConn.stories.put({
        ...toDexie(cloudStory, SyncStatus.SYNCED),
        version: record.version,
        last_sync: new Date().toISOString(),
        data: undefined,
      });
    }
  },

  sync: async (userId: string): Promise<void> => {
    const { syncAPI } = await import('./SupabaseSync');
    await syncAPI.sync(userId);
  },
};

function persistFallback() {
  try { localStorage.setItem('jejakbaca_stories_fallback', JSON.stringify(memoryStories)); } catch (e) {}
}

async function migrateFromLocalStorageInternal(db: JejakBacaDB): Promise<void> {
  const existing = await db.stories.count();
  if (existing > 0) return; 
  try {
    const { loadStories } = await import('./storage');
    const stories = loadStories();
    if (stories.length === 0) return;
    const dexieStories: DexieStory[] = stories.map(s => ({
      ...s,
      id: s.id || crypto.randomUUID(),
      createdAt: s.createdAt || new Date().toISOString(),
      updated_at: s.updatedAt || new Date().toISOString(),
      data: undefined,
      sync_status: SyncStatus.LOCAL,
      version: 1,
    }));
    await db.stories.bulkAdd(dexieStories);
    console.log(`✅ Migrated ${dexieStories.length} stories from localStorage`);
  } catch (e) { console.error("❌ Migration failed:", e); }
}

export const migrateFromLocalStorage = async () => {
  const dbConn = await getDB();
  if (dbConn) await migrateFromLocalStorageInternal(dbConn);
};
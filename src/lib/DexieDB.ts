import Dexie, { Table } from 'dexie';
import type { Story } from './types';

export enum SyncStatus {
  LOCAL    = 'local',
  SYNCED   = 'synced',
  CONFLICT = 'conflict',
  SYNCING  = 'syncing'
}

// Field Story disimpan flat, ditambah metadata sync
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

export const db = new JejakBacaDB();

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
  // Destructure & buang field Dexie-specific
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sync_status, last_sync, version, updated_at, ...story } = record;
  return story;
}

// ── API ────────────────────────────────────────────────────────────────────
export const dexieAPI = {
  getAll: async (): Promise<Story[]> => {
    const records = await db.stories.orderBy('updated_at').reverse().toArray();
    return records.map(toStory);
  },

  get: async (id: string): Promise<Story | undefined> => {
    const record = await db.stories.get(id);
    return record ? toStory(record) : undefined;
  },

  add: async (story: Story): Promise<Story> => {
    const dexieStory = toDexie(story);
    await db.stories.add(dexieStory);
    return story;
  },

  update: async (id: string, updates: Partial<Story>): Promise<void> => {
    await db.stories.where('id').equals(id).modify(item => {
      Object.assign(item, updates);
      item.updated_at  = new Date().toISOString();
      item.updatedAt   = item.updated_at; // keep Story field in sync
      item.sync_status = SyncStatus.LOCAL;
      item.version     = (item.version ?? 0) + 1;
    });
  },

  delete: async (id: string): Promise<void> => {
    await db.stories.delete(id);
  },

  setSynced: async (ids: string[], version: number): Promise<void> => {
    if (ids.length === 0) return;
    await db.stories
      .where('id').anyOf(ids)
      .modify({
        sync_status: SyncStatus.SYNCED,
        last_sync: new Date().toISOString(),
        version,
      });
  },

  // Stories yang perlu di-push ke cloud
  getUnsynced: async (): Promise<DexieStory[]> => {
    return db.stories
      .where('sync_status').equals(SyncStatus.LOCAL)
      .or('sync_status').equals(SyncStatus.CONFLICT)
      .toArray();
  },

  clearConflicts: async (): Promise<void> => {
    await db.stories
      .where('sync_status').equals(SyncStatus.CONFLICT)
      .modify({ sync_status: SyncStatus.LOCAL });
  },

  // Dipakai oleh SupabaseSync untuk simpan data dari cloud
  upsertFromCloud: async (story: Story, version: number): Promise<void> => {
    const existing = await db.stories.get(story.id);
    await db.stories.put({
      ...toDexie(story, SyncStatus.SYNCED),
      version,
      last_sync: new Date().toISOString(),
      // Kalau lokal ada conflict, tandai dulu
      sync_status: existing?.sync_status === SyncStatus.LOCAL
        ? SyncStatus.CONFLICT
        : SyncStatus.SYNCED,
    });
  },

  // Expose sync untuk dipakai StoryContext
  sync: async (userId: string): Promise<void> => {
    const { syncAPI } = await import('./SupabaseSync');
    await syncAPI.sync(userId);
  },
};

// ── Migrate dari localStorage ──────────────────────────────────────────────
export const migrateFromLocalStorage = async (): Promise<void> => {
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
};

export default db;
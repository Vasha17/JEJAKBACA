import { supabase } from '@/integrations/supabase/client';
import { dexieAPI } from './DexieDB';
import type { Story } from './types';
import { useEffect } from 'react';

interface SyncStats {
  local: number;
  cloud: number;
  conflicts: number;
}

export const syncAPI = {
  push: async (userId: string): Promise<SyncStats> => {
    const unsynced = await dexieAPI.getUnsynced();
    if (unsynced.length === 0) return { local: 0, cloud: 0, conflicts: 0 };

    const results = await Promise.allSettled(
      unsynced.map(async (dexieStory) => {
        const { sync_status, last_sync, updated_at, data: _data, ...storyToUpload } = dexieStory;
        const jsonData = JSON.parse(JSON.stringify(storyToUpload));

        const { error } = await supabase
          .from('stories')
          .upsert({
            id: dexieStory.id,
            user_id: userId,
            title: dexieStory.title,
            data: jsonData,
            version: dexieStory.version,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,id' });

        if (!error) {
          await dexieAPI.setSynced([dexieStory.id], dexieStory.version);
        }
        return { success: !error, storyId: dexieStory.id };
      })
    );

    return {
      local: unsynced.length,
      cloud: results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success).length,
      conflicts: 0
    };
  },

  // Sync deleted stories ke cloud
  pushDeletes: async (userId: string): Promise<void> => {
    try {
      const deletedIds: string[] = await dexieAPI.getPendingDeletes?.() ?? [];
      if (deletedIds.length === 0) return;
      await Promise.all(
        deletedIds.map(async (id) => {
          const { error } = await supabase
            .from('stories')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
          if (!error) {
            await dexieAPI.clearPendingDelete?.(id);
          }
        })
      );
    } catch (e) {
      console.error('pushDeletes error:', e);
    }
  },

  pull: async (userId: string): Promise<SyncStats> => {
    const { data, error } = await supabase
      .from('stories')
      .select('id, data, version, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error || !data) return { local: 0, cloud: 0, conflicts: 0 };

    // Ambil semua ID lokal, hapus yg ga ada di cloud
    const localIds = await dexieAPI.getAllIds?.() ?? [];
    const cloudIds = new Set(data.map(r => r.id));
    const toDelete = localIds.filter((id: string) => !cloudIds.has(id));
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map((id: string) => dexieAPI.deleteStory?.(id)));
    }

    const results = await Promise.allSettled(
      data.map(async (cloudRecord) => {
        const cloudDataRaw = cloudRecord.data;
        if (!cloudDataRaw || typeof cloudDataRaw !== 'object' || Array.isArray(cloudDataRaw)) return;
        const storyData = cloudDataRaw as unknown as Story;
        if (cloudRecord.version !== null) {
          await dexieAPI.upsertFromCloud(storyData, cloudRecord.version);
        }
      })
    );

    return {
      local: 0,
      cloud: data.length,
      conflicts: results.filter(r => r.status === 'rejected').length
    };
  },

  sync: async (userId: string): Promise<SyncStats> => {
    await syncAPI.pushDeletes(userId);
    const pushStats = await syncAPI.push(userId);
    const pullStats = await syncAPI.pull(userId);
    return {
      local: pushStats.local,
      cloud: pullStats.cloud,
      conflicts: pushStats.conflicts + pullStats.conflicts
    };
  }
};

// Handle DELETE event dari realtime
export function useRealtimeSync(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('stories')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const eventType = payload.eventType;
          console.log(`Realtime ${eventType}:`, payload);

          // Handle DELETE
          if (eventType === 'DELETE') {
            const oldRecord = payload.old as any;
            if (oldRecord?.id) {
              await dexieAPI.deleteStory?.(oldRecord.id);
            }
            return;
          }

          const record = payload.new as any;
          if (!record) return;
          const storyDataRaw = record.data;
          const version = record.version;
          if (storyDataRaw && typeof storyDataRaw === 'object' && !Array.isArray(storyDataRaw) && version) {
            const storyData = storyDataRaw as unknown as Story;
            await dexieAPI.upsertFromCloud(storyData, version);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
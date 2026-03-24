import { supabase } from '@/integrations/supabase/client';
import { db, dexieAPI, SyncStatus } from './DexieDB';
import { useEffect, useState } from 'react';

interface SyncStats {
  local: number;
  cloud: number;
  conflicts: number;
}

export const syncAPI = {
  /** Push local changes to Supabase */
  push: async (userId: string): Promise<SyncStats> => {
    const unsynced = await dexieAPI.getUnsynced();
    if (unsynced.length === 0) return { local: 0, cloud: 0, conflicts: 0 };

    const results = await Promise.allSettled(
      unsynced.map(async (story): Promise<any> => {
        const { error } = await supabase
          .from('stories')
          .upsert({
            id: story.id,
            user_id: userId,
            title: story.title,
            data: story.data,
            version: story.version,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,id' });

        if (!error) {
          await dexieAPI.setSynced([story.id], story.version);
        }
        return { success: !error, story };
      })
    );

    const stats: SyncStats = {
      local: unsynced.length,
      cloud: results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').length,
      conflicts: 0 // Add conflict logic later
    };

    return stats;
  },

  /** Pull changes from Supabase */
  pull: async (userId: string): Promise<SyncStats> => {
    const { data, error } = await supabase
      .from('stories')
      .select('id, data, version, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error || !data) return { local: 0, cloud: 0, conflicts: 0 };

    const updates: Array<{id: string, data: any, version: number}> = data;

    const results = await Promise.allSettled(
      updates.map(async ({ id, data: cloudData, version }) => {
        const localStory = await db.stories.get(id);
        if (!localStory || cloudData.version > localStory.version) {
          await db.stories.put({
            ...cloudData,
            id,
            sync_status: SyncStatus.SYNCED,
            version: cloudData.version,
            data: cloudData
          });
        }
      })
    );

    return {
      local: 0,
      cloud: data.length,
      conflicts: results.filter(r => r.status === 'rejected').length
    };
  },

  /** Full bi-directional sync */
  sync: async (userId: string): Promise<SyncStats> => {
    const pushStats = await syncAPI.push(userId);
    const pullStats = await syncAPI.pull(userId);
    return {
      local: pushStats.local,
      cloud: pullStats.cloud,
      conflicts: pushStats.conflicts + pullStats.conflicts
    };
  }
};

// Real-time subscription hook
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
          console.log('Realtime story change:', payload);
          
          const { id, data } = payload.new as any;
          if (!data) return;

          const localStory = await db.stories.get(id);
          if (localStory && data.version > localStory.version) {
            // Cloud wins (higher version)
            await db.stories.put({
              ...data,
              id,
              sync_status: SyncStatus.SYNCED,
              version: data.version,
              data
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

// React hook for sync stats
export function useSyncStats() {
  const [stats, setStats] = useState<SyncStats>({ local: 0, cloud: 0, conflicts: 0 });

  // Live counts from Dexie
  const updateStats = async () => {
    const local = await db.stories.where('sync_status').equals(SyncStatus.LOCAL).count();
    const conflicts = await db.stories.where('sync_status').equals(SyncStatus.CONFLICT).count();
    
    // Cloud count via quick Supabase count (if logged in)
    let cloud = 0;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { count } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.session.user.id);
      cloud = count || 0;
    }

    setStats({ local: Number(local), cloud, conflicts: Number(conflicts) });
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}


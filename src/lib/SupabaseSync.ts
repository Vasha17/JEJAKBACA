import { supabase } from '@/integrations/supabase/client';
import { db, dexieAPI, SyncStatus, DexieStory } from './DexieDB';
import type { Story } from './types'; 
import { useEffect, useState } from 'react';

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

    const stats: SyncStats = {
      local: unsynced.length,
      cloud: results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success).length,
      conflicts: 0 
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

    const results = await Promise.allSettled(
      data.map(async (cloudRecord) => {        
        const cloudDataRaw = cloudRecord.data;

        if (!cloudDataRaw || typeof cloudDataRaw !== 'object' || Array.isArray(cloudDataRaw)) return;

        const storyData = cloudDataRaw as unknown as Story; 
       
        await dexieAPI.upsertFromCloud(storyData, cloudRecord.version);
      })
    );

    return {
      local: 0,
      cloud: data.length,
      conflicts: results.filter(r => r.status === 'rejected').length
    };
  },

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
          const eventType = payload.eventType;           
          console.log(`Realtime ${eventType}:`, payload);                    
          const record = payload.new as any;
          
          if (!record) return;

          const storyDataRaw = record.data;
          const version = record.version;

          // Validasi data          
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

// React hook for sync stats
export function useSyncStats() {
  const [stats, setStats] = useState<SyncStats>({ local: 0, cloud: 0, conflicts: 0 });

  const updateStats = async () => {
    const unsyncedRecords = await dexieAPI.getUnsynced();
    const conflicts = unsyncedRecords.filter(r => r.sync_status === SyncStatus.CONFLICT).length;
    const local = unsyncedRecords.filter(r => r.sync_status === SyncStatus.LOCAL).length;
    
    let cloud = 0;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { count } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.session.user.id);
      cloud = count || 0;
    }

    setStats({ local, cloud, conflicts });
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}
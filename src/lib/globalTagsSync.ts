import { supabase } from "@/integrations/supabase/client";
import { db } from "./DexieDB";

const KEY = "jejakbaca_global_tags";
const MIGRATION_KEY = "global_tags_migrated_v1";

export async function pullGlobalTags(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getLocalTags();
  const { data } = await supabase
    .from("profiles")
    .select("global_tags")
    .eq("user_id", user.id)
    .single();
  const remote: string[] = data?.global_tags ?? [];
  const local = getLocalTags();
  const merged = Array.from(new Set([...remote, ...local])).sort((a, b) => a.localeCompare(b));
  localStorage.setItem(KEY, JSON.stringify(merged));
  if (merged.length !== remote.length) await pushGlobalTags(merged);
  return merged;
}

export async function pushGlobalTags(tags: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ global_tags: tags }).eq("user_id", user.id);
}

export async function migrateStoryTagsToGlobalTags() {
  const stories = await db.stories.toArray();

  const localTags = getLocalTags();

  const tags = Array.from(
    new Set([
      ...localTags,
      ...stories.flatMap(story => story.tags ?? [])
    ])
  );

  localStorage.setItem(
    KEY,
    JSON.stringify(tags)
  );

  await pushGlobalTags(tags);

  console.log("✅ Migrated tags:", tags.length);

  return tags;
}

export async function syncCurrentGlobalTagsToCloud() {
  const tags = getLocalTags();

  console.log("Pushing tags:", tags.length);

  await pushGlobalTags(tags);

  console.log("Done");
}

function getLocalTags(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
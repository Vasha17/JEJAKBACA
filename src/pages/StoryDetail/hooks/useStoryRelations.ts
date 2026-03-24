import { useState } from "react";
import { lsGet, lsSet } from "../utils/helpers";
import { RelationType, RelationMode } from "../constants/status";

export type StoryRelation = {
  id: string;
  mode: RelationMode;
  relatedStoryId?: string;
  relatedTitle: string;
  relatedUrl?: string;
  type: RelationType;
  createdAt: string;
};

const rKey          = (sid: string) => `story_relations_${sid}`;
export const loadRelations = (sid: string): StoryRelation[] => lsGet<StoryRelation[]>(rKey(sid), []);
const saveRelations = (sid: string, rels: StoryRelation[]) => lsSet(rKey(sid), rels);

export function useStoryRelations(storyId: string, stories: any[]) {
  const [relations, setRelations]           = useState<StoryRelation[]>([]);
  const [newRelTitle, setNewRelTitle]       = useState("");
  const [newRelType, setNewRelType]         = useState<RelationType>("sequel");
  const [newRelMode, setNewRelMode]         = useState<RelationMode>("local");
  const [newRelStoryId, setNewRelStoryId]   = useState("");
  const [newRelUrl, setNewRelUrl]           = useState("");
  const [relSuggestions, setRelSuggestions] = useState<{ id: string; title: string }[]>([]);

  const handleOpenRelated = () => setRelations(loadRelations(storyId));

  const handleRelTitleInput = (val: string) => {
    setNewRelTitle(val);
    setNewRelStoryId("");
    if (newRelMode === "local" && val.trim().length >= 1) {
      const q = val.trim().toLowerCase();
      const matches = (Array.isArray(stories) ? stories : [])
        .filter((s: any) => s.id !== storyId && s.title?.toLowerCase().includes(q))
        .slice(0, 6)
        .map((s: any) => ({ id: s.id, title: s.title }));
      setRelSuggestions(matches);
    } else {
      setRelSuggestions([]);
    }
  };

  const handleAddRelation = () => {
    if (!newRelTitle.trim()) return;
    const updated: StoryRelation[] = [...relations, {
      id: crypto.randomUUID(), mode: newRelMode,
      relatedStoryId: newRelMode === "local" ? newRelStoryId || undefined : undefined,
      relatedUrl:     newRelMode === "mention" ? newRelUrl.trim() || undefined : undefined,
      relatedTitle: newRelTitle.trim(), type: newRelType,
      createdAt: new Date().toISOString(),
    }];
    saveRelations(storyId, updated);
    setRelations(updated);
    setNewRelTitle(""); setNewRelStoryId(""); setNewRelUrl(""); setRelSuggestions([]);
  };

  const handleRemoveRelation = (relId: string) => {
    const updated = relations.filter(r => r.id !== relId);
    saveRelations(storyId, updated);
    setRelations(updated);
  };

  return {
    relations, newRelTitle, newRelType, newRelMode, newRelStoryId, newRelUrl, relSuggestions,
    setNewRelType, setNewRelMode, setNewRelStoryId, setNewRelUrl,
    handleOpenRelated, handleRelTitleInput, handleAddRelation, handleRemoveRelation,
  };
}
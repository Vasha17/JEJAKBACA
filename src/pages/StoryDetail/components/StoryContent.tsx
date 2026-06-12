import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Bookmark, Plus, Pencil, Sparkles, Loader2, X, GitBranch, ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { Textarea } from "@/component/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogClose,
} from "@/component/ui/dialog";

import { REL_LABELS, REL_COLORS } from "../constants/status";
import { normalizeTag } from "../utils/helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryContentProps {
  story: any;
  inlineRelations: any[];
  synopsisParagraphs: string[];
  hasMoreSynopsis: boolean;
  synopsisExpanded: boolean;
  setSynopsisExpanded: (v: boolean) => void;
  synopsisEditDialog: boolean;
  setSynopsisEditDialog: (v: boolean) => void;
  synopsisValue: string;
  setSynopsisValue: (v: string) => void;
  genreExpanded: boolean;
  setGenreExpanded: (fn: (v: boolean) => boolean) => void;
  setGenrePickerOpen: (v: boolean) => void;
  // Tags
  newTag: string;
  setNewTag: (v: string) => void;
  tagMode: "manual" | "existing" | "suggested";
  setTagMode: (v: "manual" | "existing" | "suggested") => void;
  suggestedTags: string[];
  setSuggestedTags: (fn: (p: string[]) => string[]) => void;
  suggestedLoading: boolean;
  tagRefresh: number;
  deleteTagConfirm: string | null;
  setDeleteTagConfirm: (v: string | null) => void;
  existingTagSearch: string;
  setExistingTagSearch: (v: string) => void;
  duplicateTagWarning: boolean;
  availableGlobalTags: string[];
  storyTagsNorm: string[];
  // Bookmarks
  deleteBookmarkId: string | null;
  setDeleteBookmarkId: (v: string | null) => void;
  // Handlers
  updateStory: (id: string, data: any) => void;
  addTagToStory: (id: string, tag: string) => void;
  removeTagFromStory: (id: string, tag: string) => void;
  removeBookmark: (storyId: string, bmId: string) => void;
  handleAddTag: () => void;
  handleSuggestTags: () => void;
  handleDeleteExistingTag: (tag: string) => void;
  lsGet: <T>(key: string, def: T) => T;
  lsSet: (key: string, val: any) => void;
  navigate: ReturnType<typeof useNavigate>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StoryContent({
  story, inlineRelations,
  synopsisParagraphs, hasMoreSynopsis, synopsisExpanded, setSynopsisExpanded,
  synopsisEditDialog, setSynopsisEditDialog, synopsisValue, setSynopsisValue,
  genreExpanded, setGenreExpanded, setGenrePickerOpen,
  newTag, setNewTag, tagMode, setTagMode,
  suggestedTags, setSuggestedTags, suggestedLoading,
  tagRefresh, 
  existingTagSearch, setExistingTagSearch, duplicateTagWarning,
  availableGlobalTags, storyTagsNorm,
  setDeleteBookmarkId,
  updateStory, addTagToStory, removeTagFromStory, 
  handleAddTag, handleSuggestTags, handleDeleteExistingTag,
  lsGet, lsSet,
  navigate,
}: StoryContentProps) {
  const handleTagClick = (tag: string) => {
    navigate(`/?tags=${encodeURIComponent(normalizeTag(tag))}`);
  };

  const [bookmarkAsc, setBookmarkAsc] = useState(true);

  return (
    <div className="flex-1 min-w-0 space-y-8 -mt-4">

      {/* Synopsis */}
      <div className="rounded-xl bg-card/80 border border-border/60 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground tracking-wide">Synopsis</span>
          <Dialog open={synopsisEditDialog} onOpenChange={setSynopsisEditDialog}>
            <DialogTrigger asChild>
              <button onClick={() => setSynopsisValue(story.synopsis || "")} className="p-1.5 rounded hover:bg-secondary transition-colors">
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden mx-auto">
              <DialogHeader className="px-4 py-3 border-b border-border bg-muted/20">
                <DialogTitle className="text-base font-semibold">Edit Synopsis</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <Textarea
                  value={synopsisValue}
                  onChange={e => setSynopsisValue(e.target.value)}
                  placeholder="Write the synopsis..."
                  className="min-h-[220px] bg-card resize-none text-sm leading-relaxed"
                  style={{ textAlign: "justify" }}
                  autoFocus
                />
              </div>
              <div className="px-4 pb-4 flex gap-2 justify-end border-t border-border pt-3">
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button onClick={() => { updateStory(story.id, { synopsis: synopsisValue }); setSynopsisEditDialog(false); }}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {story.synopsis ? (
          <>
            {synopsisExpanded
              ? <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" style={{ textAlign: "justify" }}>{story.synopsis}</p>
              : <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" style={{ textAlign: "justify" }}>{synopsisParagraphs[0]?.slice(0, 200)}{hasMoreSynopsis ? "..." : ""}</p>}
            {hasMoreSynopsis && (
              <div className="flex justify-center pt-1">
                <button onClick={() => setSynopsisExpanded(!synopsisExpanded)} className="text-xs text-primary hover:text-primary/80">
                  {synopsisExpanded ? "See Less" : "See More"}
                </button>
              </div>
            )}
          </>
        ) : <p className="text-sm text-muted-foreground italic">No synopsis yet.</p>}
      </div>

      {/* Genre — mobile only */}
      <div className="sm:hidden flex flex-wrap gap-1.5 items-center">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider shrink-0">Genre</span>
        {story.genres && story.genres.length > 0 ? (
          <>
            {(genreExpanded ? story.genres : story.genres.slice(0, 5)).map((g: string) => (
              <span key={g} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary/80 text-muted-foreground border border-border/50 whitespace-nowrap">{g}</span>
            ))}
            {story.genres.length > 5 && (
              <button onClick={() => setGenreExpanded(v => !v)} className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 transition-colors">
                {genreExpanded ? "Show less" : `+${story.genres.length - 5} more`}
              </button>
            )}
            <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-0.5 ml-1 transition-colors">
              <Plus size={10} /> Edit
            </button>
          </>
        ) : (
          <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-muted-foreground hover:text-foreground italic flex items-center gap-0.5">
            <Plus size={10} /> Add Genres
          </button>
        )}
      </div>

      {/* Inline relations */}
      {inlineRelations.length > 0 && (
        <div className="rounded-lg bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Related Stories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {inlineRelations.map((rel: any) => (
              <div key={rel.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold${(REL_COLORS as any)[rel.type]}`}>{(REL_LABELS as any)[rel.type]}</span>
                {rel.mode === "local" && rel.relatedStoryId
                  ? <Link to={`/story/${rel.relatedStoryId}`} className="text-sm text-primary hover:underline font-medium">{rel.relatedTitle}</Link>
                  : rel.mode === "mention" && rel.relatedUrl
                  ? <a href={rel.relatedUrl} target="_blank" rel="noopener" className="text-sm text-primary hover:underline font-medium">{rel.relatedTitle}</a>
                  : <span className="text-sm text-foreground font-medium">{rel.relatedTitle}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Tags</span>
            <span className="text-[10px] text-muted-foreground italic">Personal</span>
          </div>
          <div className="flex gap-1 ml-auto">
            {(["manual", "existing", "suggested"] as const).map(m => (
              <button
                key={m}
                onClick={() => {
                  setTagMode(m);
                  setExistingTagSearch("");
                  if (m === "suggested" && suggestedTags.length === 0 && !suggestedLoading) handleSuggestTags();
                }}
                className={`h-7 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-medium border transition-all
                  ${tagMode === m
                    ? "bg-secondary/50 text-foreground border-border shadow-sm"
                    : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/40 hover:text-foreground"
                  }`}
              >
                {m === "suggested" && <Sparkles className="w-3 h-3" />}
                {m === "manual" ? "Manual" : m === "existing" ? "Existing" : "Suggested"}
              </button>
            ))}
          </div>
        </div>

        {/* Current tags */}
        <div className="flex flex-wrap gap-1.5">
          {(story.tags || []).map((tag: string) => (
            <button
              key={tag}
              onClick={() => tagMode === "existing" ? removeTagFromStory(story.id, tag) : handleTagClick(tag)}
              title={tagMode === "existing" ? "Remove tag" : "Click to filter in Library"}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/8 text-primary/80 border border-primary/15 hover:bg-primary/15 transition-colors text-[11px] font-medium active:scale-95"
            >
              {tag}
              {tagMode === "existing" && (
                <span
                  className="opacity-60 hover:opacity-100 leading-none"
                  onClick={e => { e.stopPropagation(); removeTagFromStory(story.id, tag); }}
                >×</span>
              )}
            </button>
          ))}
        </div>

        {/* Tag mode content */}
        <div className="w-full" key={tagRefresh}>
          {tagMode === "manual" && (
            <form onSubmit={e => { e.preventDefault(); handleAddTag(); }} className="inline-flex">
              <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="+ add tag" className="h-8 w-32 text-xs bg-secondary rounded-full px-3 border-border" />
              {duplicateTagWarning && <p className="text-[10px] text-amber-400 mt-1">Tag already added.</p>}
            </form>
          )}

          {tagMode === "existing" && (
            <div className="space-y-3 w-full">
              <div className="rounded-2xl border border-border bg-card/50 p-3 space-y-3">
                <Input value={existingTagSearch} onChange={e => setExistingTagSearch(e.target.value)} placeholder="Search tags..." className="h-8 text-xs bg-secondary rounded-full px-3 border-border" />
                <div className="flex flex-wrap gap-1.5 max-h-[128px] sm:max-h-[132px] overflow-y-auto pr-1">
                  {availableGlobalTags
                    .filter((t: string) => t.toLowerCase().includes(existingTagSearch.toLowerCase()))
                    .map((t: string) => {
                      const alreadyAdded = storyTagsNorm.includes(normalizeTag(t));
                      return (
                        <span key={t} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs transition-colors ${alreadyAdded ? "bg-primary/10 text-primary border-primary/20 opacity-60" : "bg-secondary text-secondary-foreground border-border"}`}>
                          <button disabled={alreadyAdded} onClick={() => addTagToStory(story.id, normalizeTag(t))} className={alreadyAdded ? "cursor-default" : "hover:text-primary"}>
                            {alreadyAdded ? "✓" : "+"} {t}
                          </button>
                          <button onClick={() => handleDeleteExistingTag(t)} className="opacity-50 hover:opacity-100 hover:text-destructive transition-colors">×</button>
                        </span>
                      );
                    })}
                </div>
                {availableGlobalTags.filter((t: string) => t.toLowerCase().includes(existingTagSearch.toLowerCase())).length === 0 && (
                  <div className="text-xs text-muted-foreground italic text-center py-2">No matching tags found.</div>
                )}
              </div>
            </div>
          )}

          {tagMode === "suggested" && (
            suggestedLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />Generating suggestions...
              </div>
            ) : suggestedTags.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
                      <Sparkles className="w-3 h-3 shrink-0" />{t}
                      <button onClick={() => setSuggestedTags(p => p.filter(x => x !== t))} className="opacity-60 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const normTags = suggestedTags.map(t => normalizeTag(t));
                      const updatedTags = Array.from(new Set([...(story.tags || []), ...normTags]));
                      updateStory(story.id, { tags: updatedTags });
                      normTags.forEach(t => {
                        const existing: string[] = lsGet("jejakbaca_global_tags", []);
                        if (!existing.includes(t)) lsSet("jejakbaca_global_tags", [...existing, t]);
                      });
                      setSuggestedTags(() => []);
                      setTagMode("manual");
                    }}
                    className="px-3 py-1 text-xs rounded-full bg-blue-500 text-white hover:bg-blue-600"
                  >Apply All</button>
                  <button onClick={handleSuggestTags} className="px-3 py-1 text-xs rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground">↻ Refresh</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground italic">No suggestions. Add a synopsis first.</span>
                <button onClick={handleSuggestTags} className="text-xs text-primary hover:underline">Retry</button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Bookmarks */}
      <div className="space-y-3">        
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Bookmarks</h3>        
        <button
          onClick={() => setBookmarkAsc(v => !v)}
          className="flex items-center gap-1 text-muted-foreground/50 hover:text-foreground active:text-white transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>
        <div className="space-y-2">
          {[...story.bookmarks]
            .sort((a: any, b: any) => bookmarkAsc ? a.chapter - b.chapter : b.chapter - a.chapter)
            .map((bm: any) => (
            <div key={bm.id} className="relative group">
              <div className="peer flex items-center gap-3 py-3 px-3 border border-border/50 rounded-lg bg-card/50 hover:bg-secondary hover:border-border transition-colors duration-200 cursor-default select-none group">
                <Bookmark className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-sm text-foreground whitespace-nowrap shrink-0">Ch. {bm.chapter}</span>
                {bm.note && <p className="text-sm text-muted-foreground flex-1 min-w-0 truncate">{bm.note}</p>}
                <span className="text-[10px] text-muted-foreground shrink-0 opacity-60">{format(new Date(bm.createdAt), "MM/dd/yy")}</span>
                <button onClick={e => { e.stopPropagation(); setDeleteBookmarkId(bm.id); }} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><X className="w-4 h-4" /></button>
              </div>
              <div className="absolute z-20 bottom-full left-0 mb-2 w-64 p-3 rounded-xl bg-background border border-border shadow-xl opacity-0 pointer-events-none peer-hover:opacity-100 peer-hover:pointer-events-auto transition-all duration-150 space-y-2 backdrop-blur-md">
                <div className="flex items-center gap-2 text-primary">
                  <Bookmark className="w-4 h-4 fill-primary" />
                  <span className="font-bold text-sm">Chapter {bm.chapter}</span>
                </div>
                {bm.note && <p className="text-xs text-foreground leading-relaxed" style={{ textAlign: "justify" }}>{bm.note}</p>}
                <p className="text-[10px] text-muted-foreground">{format(new Date(bm.createdAt), "MMMM d, yyyy · HH:mm")}</p>
              </div>
            </div>
          ))}
        </div>
        {story.bookmarks.length === 0 && <p className="text-sm text-muted-foreground italic">No bookmarks yet.</p>}
      </div>
    </div>
  );
}
import { useState } from "react";
import {
  BookOpen, Bell, X, Plus, Upload, Image, ExternalLink, ArrowUp,
  Eye, AlertCircle, Loader2, CheckCircle2, XCircle, Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogClose,
} from "@/component/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RightPanelProps {
  story: any;
  ctaPreference: "floating" | "inside";
  trackedSourceIds: string[];
  linkStatuses: Record<string, { ok: boolean; checking: boolean; statusText: string }>;
  sourcesKey: number;
  editSrcId: string | null;
  editSrcName: string;
  editSrcUrl: string;
  editSrcChapter: string;
  editSrcLang: string;
  srcName: string;
  srcUrl: string;
  srcChapter: string;
  srcLang: string;
  srcNameSuggestion: string;
  mediaUrl: string;
  mediaLabel: string;
  mediaLightbox: { url: string; label: string; id: string } | null;
  editingMediaLabel: string;
  sourceDialog: boolean;
  addSourceDialog: boolean;
  mediaDialog: boolean;
  mediaFileRef: React.RefObject<HTMLInputElement>;
  stories: any[];
  // Setters
  setEditSrcId: (v: string | null) => void;
  setEditSrcName: (v: string) => void;
  setEditSrcUrl: (v: string) => void;
  setEditSrcChapter: (v: string) => void;
  setEditSrcLang: (v: string) => void;
  setSrcName: (v: string) => void;
  setSrcUrl: (v: string) => void;
  setSrcChapter: (v: string) => void;
  setSrcLang: (v: string) => void;
  setSrcNameSuggestion: (v: string) => void;
  setMediaUrl: (v: string) => void;
  setMediaLabel: (v: string) => void;
  setMediaLightbox: (v: { url: string; label: string; id: string } | null) => void;
  setEditingMediaLabel: (v: string) => void;
  setSourceDialog: (v: boolean) => void;
  setAddSourceDialog: (v: boolean) => void;
  setMediaDialog: (v: boolean) => void;
  setSourcesKey: (fn: (k: number) => number) => void;
  // Handlers
  updateStory: (id: string, data: any) => void;
  addSource: (storyId: string, data: any) => void;
  removeSource: (storyId: string, srcId: string) => void;
  addMedia: (storyId: string, data: any) => void;
  removeMedia: (storyId: string, mediaId: string) => void;
  toggleTracked: (srcId: string) => void;
  handleSaveSourceEdit: () => void;
  handleSaveMediaLabel: () => void;
  handleMediaFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  checkLink: (sourceId: string, url: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RightPanel({
  story, ctaPreference, trackedSourceIds, linkStatuses, sourcesKey,
  editSrcId, editSrcName, editSrcUrl, editSrcChapter, editSrcLang,
  srcName, srcUrl, srcChapter, srcLang, srcNameSuggestion,
  mediaUrl, mediaLabel, mediaLightbox, editingMediaLabel,
  sourceDialog, addSourceDialog, mediaDialog, mediaFileRef, stories,
  setEditSrcId, setEditSrcName, setEditSrcUrl, setEditSrcChapter, setEditSrcLang,
  setSrcName, setSrcUrl, setSrcChapter, setSrcLang, setSrcNameSuggestion,
  setMediaUrl, setMediaLabel, setMediaLightbox, setEditingMediaLabel,
  setSourceDialog, setAddSourceDialog, setMediaDialog,
  updateStory, addSource, removeSource, addMedia, removeMedia,
  toggleTracked, handleSaveSourceEdit, handleSaveMediaLabel,
  handleMediaFileUpload, checkLink,
}: RightPanelProps) {
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  return (
    <div className="lg:w-80 space-y-6">
      {/* Where to Read header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Where to Read?</h3>
        </div>
        <div className="flex gap-1">
          {/* Edit sources */}
          <Dialog open={sourceDialog} onOpenChange={(open) => { setSourceDialog(open); if (!open) setEditSrcId(null); }}>
            <DialogTrigger asChild>
              <button className="px-2 py-0.5 text-[10px] rounded bg-secondary/50 text-muted-foreground border border-border/40 hover:text-foreground hover:bg-secondary">Edit</button>
            </DialogTrigger>
            <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden mx-auto border-border/60 bg-card/95 backdrop-blur-xl">
              <div className="border-b border-border/50 px-4 py-3">
                <DialogHeader className="text-left">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Bell className="w-3.5 h-3.5 text-primary/90" />
                    </div>
                    <div>
                      <DialogTitle className="text-sm font-bold tracking-tight">Reading Sources</DialogTitle>
                      <p className="text-[10px] text-muted-foreground leading-tight">Reorder, edit, or track update notifications.</p>
                    </div>
                  </div>
                </DialogHeader>
              </div>
              <div className="p-5 pt-0.5">            
              {story.sources && story.sources.length > 0 ? (
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground text-center">🔔 Select up to 2 sources for notifications. ({trackedSourceIds.length}/2 active)</p>
                  {story.sources.map((src: any) => {
                    const isTracked = trackedSourceIds.includes(src.id);
                    const canTrack = isTracked || trackedSourceIds.length < 2;

                    return (
                      <div key={src.id} className={`relative overflow-hidden p-4 rounded-xl bg-secondary/40 border space-y-0.5 ${isTracked ? "border-primary/40" : "border-border/60"}`}>
                        {isTracked && <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />}
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs text-foreground uppercase tracking-wide truncate">{src.name}</span>
                            <button onClick={() => toggleTracked(src.id)} disabled={!canTrack}
                              className={`p-1 rounded-full transition-colors shrink-0 ${isTracked ? "bg-primary/20 text-primary hover:bg-red-500/20 hover:text-red-400" : "text-muted-foreground/40 hover:text-muted-foreground"} ${!canTrack ? "opacity-30 cursor-not-allowed" : ""}`}>
                              <Bell className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {editSrcId !== src.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => {
                                const idx = story.sources.findIndex((s:any)=>s.id===src.id);
                                if (idx <= 0) return;
                                const arr = [...story.sources];
                                [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
                                updateStory(story.id, { sources: arr });
                              }} className="text-muted-foreground hover:text-foreground text-xs px-0.5">▲</button>
                              <button onClick={() => {
                                const idx = story.sources.findIndex((s:any)=>s.id===src.id);
                                if (idx >= story.sources.length-1) return;
                                const arr = [...story.sources];
                                [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]];
                                updateStory(story.id, { sources: arr });
                              }} className="text-muted-foreground hover:text-foreground text-xs px-0.5">▼</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteSourceId(src.id)} className="text-destructive hover:text-destructive/80 shrink-0"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                        {editSrcId === src.id ? (
                          <div className="space-y-2">
                            <Input value={editSrcName} onChange={e => setEditSrcName(e.target.value)} placeholder="Site name" className="h-7 text-xs bg-card" />
                            <Input value={editSrcUrl} onChange={e => setEditSrcUrl(e.target.value)} placeholder="URL" className="h-7 text-xs bg-card" />
                            <div className="flex gap-2">
                              <Input value={editSrcChapter} onChange={e => setEditSrcChapter(e.target.value)} type="number" step="0.1" placeholder="Chapter" className="h-7 text-xs bg-card w-24" />
                              <Input value={editSrcLang} onChange={e => setEditSrcLang(e.target.value)} placeholder="Lang" className="h-7 text-xs bg-card flex-1" />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveSourceEdit}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditSrcId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] text-muted-foreground min-w-0">
                              <span><span className="sm:hidden">Ch.</span><span className="hidden sm:inline">Chapter</span> {src.currentChapter}</span>
                              {src.language && <span className="text-primary ml-1">{src.language}</span>}
                              <span className="block truncate opacity-60 max-w-[160px]">{src.url}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  const newSources = [...story.sources];
                                  const idx = newSources.findIndex((s: any) => s.id === src.id);
                                  if (idx !== -1) {
                                    const sourceChapter = Number.parseFloat(String(src.currentChapter)) || 0;
                                    const newCh = sourceChapter + 1;
                                    newSources[idx] = { ...newSources[idx], currentChapter: newCh };
                                    const updates: any = { sources: newSources };
                                    if ((story.currentChapter || 0) === sourceChapter) {
                                      updates.currentChapter = newCh;
                                      updates.chapterUpdatedAt = new Date().toISOString();
                                    }
                                    updateStory(story.id, updates);
                                  }
                                }}
                                className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                              >+1</button>
                              <button
                                onClick={() => { setEditSrcId(src.id); setEditSrcName(src.name); setEditSrcUrl(src.url); setEditSrcChapter(String(src.currentChapter)); setEditSrcLang(src.language || ""); }}
                                className="shrink-0 px-2 py-0.5 text-[10px] rounded bg-card text-foreground border border-border hover:bg-muted"
                              >Edit</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
               ) : <p className="text-sm text-muted-foreground italic p-4">No sources added yet.</p>}
  </div>
            </DialogContent>
          </Dialog>

          {/* Add source */}
          <Dialog open={addSourceDialog} onOpenChange={setAddSourceDialog}>
            <DialogTrigger asChild>
              <button className="px-2 py-0.5 text-[10px] rounded bg-secondary/50 text-muted-foreground border border-border/40 hover:text-foreground hover:bg-secondary">Add</button>
            </DialogTrigger>
            <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden mx-auto border-border/60 bg-card/95 backdrop-blur-xl">
              <div className="relative border-b border-border/50 px-4 py-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-bl from-primary/10 via-transparent to-transparent pointer-events-none" />
                <DialogHeader className="relative text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 text-primary/90" />
                    </div>
                    <div>
                      <DialogTitle className="text-sm font-bold tracking-tight">New Reading Link</DialogTitle>
                      <p className="text-[10px] text-muted-foreground leading-tight">Add a site where you follow this story.</p>
                    </div>
                  </div>
                </DialogHeader>
              </div>
              <div className="p-5 pt-4 space-y-3">
                <div className="relative">
                  <Input
                    value={srcName}
                    onChange={e => {
                      const val = e.target.value;
                      setSrcName(val);
                      const allSrcNames = stories.flatMap((s: any) => (s.sources || []).map((src: any) => src.name));
                      const unique = [...new Set(allSrcNames)] as string[];
                      const match = unique.find(n => n.toLowerCase().startsWith(val.toLowerCase()) && n.toLowerCase() !== val.toLowerCase());
                      setSrcNameSuggestion(match ? val + match.slice(val.length) : "");
                    }}
                    placeholder="Site name (e.g. MyAnimeList, Webtoon, etc.)"
                    className="bg-card text-sm"
                    onKeyDown={e => {
                      if (e.key === "Tab" && srcNameSuggestion) {
                        e.preventDefault(); setSrcName(srcNameSuggestion); setSrcNameSuggestion("");
                      }
                    }}
                  />
                  {srcNameSuggestion && (
                    <div
                      className="absolute inset-0 flex items-center px-3 cursor-pointer"
                      onClick={() => { setSrcName(srcNameSuggestion); setSrcNameSuggestion(""); }}
                    >
                      <span className="text-transparent select-none">{srcName}</span>
                      <span className="text-foreground/40 text-sm select-none">{srcNameSuggestion.slice(srcName.length)}</span>
                    </div>
                  )}
                </div>
                <Input value={srcUrl} onChange={e => setSrcUrl(e.target.value)} placeholder="URL" className="bg-card text-base h-11" />
                <div className="flex gap-2">
                  <Input value={srcChapter} onChange={e => setSrcChapter(e.target.value)} placeholder="Chapter" type="number" step="0.1" className="bg-card text-base h-11 w-28" />
                  <Input value={srcLang} onChange={e => setSrcLang(e.target.value)} placeholder="Lang (EN, ID, KR)" className="bg-card text-base h-11 flex-1" />
                </div>
               </div>
              <div className="px-4 pb-4 flex gap-2 justify-end border-t border-border pt-3">
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button onClick={() => {
                  if (!srcName.trim() || !srcUrl.trim()) return;
                  addSource(story.id, { name: srcName.trim(), url: srcUrl.trim(), currentChapter: Number.parseFloat(srcChapter) || 0, language: srcLang.trim().toUpperCase() || "" });
                  if (trackedSourceIds.length < 2) {
                    setTimeout(() => {
                      const newSrc = story.sources[story.sources.length - 1];
                      if (newSrc && !trackedSourceIds.includes(newSrc.id)) toggleTracked(newSrc.id);
                    }, 150);
                  }
                  setSrcName(""); setSrcUrl(""); setSrcChapter(""); setSrcLang(""); setAddSourceDialog(false);
                }}><Plus className="w-3.5 h-3.5 mr-1" />Add Link</Button>
              </div>
            </DialogContent>
          </Dialog>

          {story.sources && story.sources.length > 0 && (
            <button onClick={() => story.sources.forEach((s: any) => checkLink(s.id, s.url))} className="px-2 py-0.5 text-[10px] rounded bg-secondary/50 text-muted-foreground border border-border/40 hover:text-foreground hover:bg-secondary flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />Check
            </button>
          )}
        </div>
      </div>

      {/* CTA inside */}
      {ctaPreference === "inside" && story.sources && story.sources.length > 0 && (() => {
        const best = [...story.sources].sort((a: any, b: any) => (b.currentChapter || 0) - (a.currentChapter || 0))[0];
        const rawUrl = best.url.trim();
        const base = rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl;
        const cleanBase = base.replace(/\/+$/, "");
        const isInfoSite = /myanimelist\.net|anilist\.co|mangaupdates\.com|kitsu\.io/.test(base);
        const isSpecialSource = /atsu\.moe|mangadot\.net/i.test(cleanBase);
        const readingUrl = isInfoSite || isSpecialSource
          ? cleanBase
          : (cleanBase.includes("?") ? cleanBase : `${cleanBase}/chapter-${best.currentChapter}/`);
        return (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mb-2 mr-[5px]">
            <p className="text-[10px] text-muted-foreground mb-1">Continue where you left off</p>
            <p className="text-xs font-semibold text-foreground mb-2"><span className="sm:hidden">Ch.</span><span className="hidden sm:inline">Chapter</span> {best.currentChapter} · {best.name}</p>
            <a href={readingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> Continue Reading
            </a>
          </div>
        );
      })()}

      {/* Source cards */}
      <div className="grid grid-cols-1 gap-2" key={sourcesKey}>
        {story.sources && story.sources.map((src: any) => {
          const ls = linkStatuses[src.id];
          const isTracked = trackedSourceIds.includes(src.id);
          const currentStoryCh = story.currentChapter || 0;
          const srcCh = src.currentChapter || 0;
          const chaptersAhead = srcCh - currentStoryCh;
          const isAhead = chaptersAhead > 0;
          const cardTone = isTracked && isAhead
            ? "bg-emerald-500/5 border-emerald-500/40 shadow-md shadow-emerald-500/10"
            : ls && !ls.checking
              ? (ls.ok ? "bg-card/60 border-green-500/30" : "bg-card/60 border-red-500/30")
              : "bg-card/40 border-border/40 opacity-75";

          return (
            <div key={src.id} className={`rounded-xl border transition-all ${cardTone}`}>
              <a
                href={(() => {
                  const rawUrl = src.url.trim();
                  const base = rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl;
                  const cleanBase = base.replace(/\/+$/, "");
                  const isInfoSite = /myanimelist\.net|anilist\.co|mangaupdates\.com|kitsu\.io/.test(base);
                  const isSpecialSource = /atsu\.moe|mangadot\.net/i.test(cleanBase);
                  return isInfoSite || isSpecialSource || cleanBase.includes("?")
                    ? cleanBase
                    : `${cleanBase}/chapter-${src.currentChapter}/`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3"
              >
                <div className="flex items-center gap-1.5 min-w-0 mb-1">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wide break-words leading-tight min-w-0 flex-1">{src.name}</span>
                  {isTracked && <div title={isAhead ? "Update Available!" : "Notification active"}><Bell className={`w-3 h-3 shrink-0 transition-colors ${isAhead ? "text-emerald-500 fill-emerald-500/20 animate-pulse" : "text-emerald-500/80 fill-emerald-500/10"}`} /></div>}
                  <div className="flex items-center gap-1 shrink-0">
                    {ls && (ls.checking ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> : ls.ok ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />)}
                    {src.language && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">{src.language}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`font-medium ${isAhead ? "text-[11px] text-foreground" : "text-[10px] text-muted-foreground"}`}>
                      <span className="sm:hidden">Ch.</span><span className="hidden sm:inline">Chapter</span> {srcCh}
                    </span>
                    {isTracked && isAhead && (
                      <span className="inline-flex items-center gap-1 text-[10px] shrink-0">
                        <ArrowUp className="w-3 h-3 text-primary/60" />
                        <span className="text-primary font-medium">{chaptersAhead}</span>
                        <span className="text-muted-foreground">new</span>
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] shrink-0 ${isAhead ? "text-muted-foreground/80" : "text-muted-foreground/50"}`}>
                    {format(new Date(story.lastComicUpdateAt || src.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </a>

            </div>
          );
        })}
      </div>
      {(!story.sources || story.sources.length === 0) && <p className="text-xs text-muted-foreground italic">No reading sources added yet.</p>}

      {/* Media */}
      <div className="opacity-60 hover:opacity-100 transition-opacity">
      <div className="border-t border-border pt-5 mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Media</h3>
          </div>
          <div className="flex gap-1">
            <Dialog open={mediaDialog} onOpenChange={setMediaDialog}>
              <DialogTrigger asChild>
                <button className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground border border-border">Link</button>
              </DialogTrigger>
              <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden mx-auto border-border/60 bg-card/95 backdrop-blur-xl">
                <div className="border-b border-border/50 px-4 py-3">
                  <DialogHeader className="text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Image className="w-3.5 h-3.5 text-primary/90" />
                      </div>
                      <div>
                        <DialogTitle className="text-sm font-bold tracking-tight">Add Media Link</DialogTitle>
                        <p className="text-[10px] text-muted-foreground leading-tight">Attach an external image or link.</p>
                      </div>
                    </div>
                  </DialogHeader>
                </div>
                <div className="p-4 space-y-3">
                  <Input value={mediaLabel} onChange={e => setMediaLabel(e.target.value)} placeholder="Label / Alt text" className="bg-card" />
                  <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://..." className="bg-card" />
                </div>
                <div className="px-4 pb-4 flex gap-2 justify-end border-t border-border pt-3">
                  <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                  <Button onClick={() => {
                    if (mediaUrl.trim()) { addMedia(story.id, { type: "link", url: mediaUrl.trim(), label: mediaLabel.trim() || "Link" }); setMediaUrl(""); setMediaLabel(""); setMediaDialog(false); }
                  }}>Add</Button>
                </div>
              </DialogContent>
            </Dialog>
            <button onClick={() => mediaFileRef.current?.click()} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground border border-border flex items-center gap-1">
              <Upload className="w-3 h-3" />Photo
            </button>
            <input ref={mediaFileRef} type="file" accept="image/*" className="hidden" onChange={handleMediaFileUpload} />
          </div>
        </div>
        {(story.media || []).length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {story.media.map((m: any) => (
              <div key={m.id} className="relative group aspect-square rounded-md overflow-hidden bg-secondary border border-border cursor-pointer" onClick={() => setMediaLightbox({ url: m.url, label: m.label || "", id: m.id })}>
                {m.type === "image"
                  ? <img src={m.url} alt={m.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2"><ExternalLink className="w-4 h-4 text-primary" /><span className="text-[9px] text-muted-foreground text-center line-clamp-2">{m.label}</span></div>}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <button onClick={e => { e.stopPropagation(); removeMedia(story.id, m.id); }} className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground italic">No media yet.</p>}
      </div>

      {/* Media lightbox */}
      <Dialog open={!!mediaLightbox} onOpenChange={open => { if (!open) setMediaLightbox(null); }}>
        <DialogContent className="w-[92vw] max-w-2xl p-0 bg-black/95 border-border overflow-hidden rounded-xl mx-auto">
          {mediaLightbox && (
            <>
              <img src={mediaLightbox.url} alt={mediaLightbox.label} className="w-full h-auto max-h-[75vh] object-contain" />
              <div className="px-4 py-3 bg-black/80 border-t border-white/10 flex items-center gap-2">
                {editingMediaLabel ? (
                  <>
                    <Input value={editingMediaLabel} onChange={e => setEditingMediaLabel(e.target.value)} className="h-7 text-xs bg-card/20 border-white/20 text-white flex-1" onKeyDown={e => { if (e.key === "Enter") handleSaveMediaLabel(); }} autoFocus />
                    <Button size="sm" className="h-7 text-xs" onClick={handleSaveMediaLabel}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-white" onClick={() => setEditingMediaLabel("")}>✕</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-300 flex-1 text-center">{mediaLightbox.label || "—"}</p>
                    <button onClick={() => setEditingMediaLabel(mediaLightbox.label || "")} className="text-gray-400 hover:text-white transition-colors p-1 rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    <Dialog open={!!deleteSourceId} onOpenChange={open => { if (!open) setDeleteSourceId(null); }}>
     <DialogContent className="w-[92vw] max-w-2xl rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl mx-auto">
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4"><X className="w-7 h-7 text-red-500" /></div>
          <DialogTitle className="text-xl font-bold text-foreground">Delete source?</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">This reading source will be permanently deleted.</p>
          <div className="flex w-full gap-3 mt-6">
            <Button variant="secondary" className="flex-1 rounded-xl h-11" onClick={() => setDeleteSourceId(null)}>Cancel</Button>
            <Button className="flex-1 rounded-xl h-11 bg-red-500 hover:bg-red-600 text-white" onClick={() => {
              if (deleteSourceId) { removeSource(story.id, deleteSourceId); setDeleteSourceId(null); }
            }}>Delete</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
  );
}
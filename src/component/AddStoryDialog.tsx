import { useState, useEffect, cloneElement, isValidElement } from "react";
import { createPortal } from "react-dom";
import { useStories } from "@/lib/StoryContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/component/ui/dialog";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { Textarea } from "@/component/ui/textarea";
import { Label } from "@/component/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/component/ui/tabs";
import { Plus, Loader2, Sparkles, AlertTriangle, CheckCircle2, X, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createStory } from "@/lib/types";

/* ─── Mobile bottom-sheet detection ─────────────────── */
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

interface AddStoryDialogProps {
  trigger?: React.ReactNode;
  showLabel?: boolean;
}

export function AddStoryDialog({ trigger, showLabel }: AddStoryDialogProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const [title, setTitle]       = useState("");
  const [author, setAuthor]     = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [synopsis, setSynopsis] = useState("");

  const [autoUrl, setAutoUrl]         = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoPreview, setAutoPreview] = useState<any | null>(null);
  const [autoError, setAutoError]     = useState("");

  const { addStory, addStoryWithMeta, stories } = useStories();
  const navigate = useNavigate();

  function normalize(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  const duplicates = stories.filter(s => {
    const norm = normalize(title);
    if (norm.length < 3) return false;
    const normTitle = normalize(s.title);
    return normTitle === norm || normTitle.includes(norm) || norm.includes(normTitle);
  });

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const story = await addStory({
      title: title.trim(), author: author.trim(),
      coverUrl: coverUrl.trim(), synopsis: synopsis.trim(),
    });
    setTitle(""); setAuthor(""); setCoverUrl(""); setSynopsis("");
    setOpen(false);
    navigate(`/story/${story.id}`);
  };

  const handleAutoFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoUrl.trim()) return;
    setAutoLoading(true); setAutoError(""); setAutoPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-story-meta", {
        body: { url: autoUrl.trim() },
      });
      if (error) throw error;
      if (!data || !data.title) throw new Error("No data returned from server");
      setAutoPreview(data);
    } catch (err: any) {
      setAutoError(err?.message || "Failed to retrieve data. Check the link and try again.");
    } finally {
      setAutoLoading(false);
    }
  };

  const handleAutoConfirm = async () => {
    if (!autoPreview) return;
    const d = autoPreview;
    const now = new Date().toISOString();
    const storyData = createStory({
      title: d.title || "Untitled",
      altTitle: d.altTitle || d.alt_title || "",
      author: d.author || "",
      coverUrl: d.coverUrl || d.cover || d.thumbnail || d.cover_url || "",
      synopsis: d.synopsis || d.description || d.summary || "",
      genres: Array.isArray(d.genres) ? d.genres
        : Array.isArray(d.genre) ? d.genre
        : typeof d.genre === "string" && d.genre
          ? d.genre.split(",").map((g: string) => g.trim()).filter(Boolean) : [],
      originCountry: d.originCountry || d.origin || d.country || "",
      whereToRead: d.whereToRead || autoUrl.trim(),
      sources: d.whereToRead || autoUrl.trim() ? [{
        id: crypto.randomUUID(),
        name: d.sourceName || new URL(autoUrl.trim()).hostname.replace("www.", ""),
        url: d.whereToRead || autoUrl.trim(),
        currentChapter: d.latestChapter || d.latest_chapter || 0,
        language: d.language || "EN",
        lastOpenedAt: now, updatedAt: now,
      }] : [],
      status: "plan-to-read",
      currentChapter: 1,
    });
    try {
      const newStory = await addStoryWithMeta(storyData);
      setAutoUrl(""); setAutoPreview(null); setOpen(false);
      navigate(`/story/${newStory.id}`);
    } catch (err) {
      setAutoError("Failed to save story. Please try again.");
    }
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) { setAutoPreview(null); setAutoError(""); setAutoUrl(""); }
  };

  /* ─── Shared dialog content ─────────────────────────── */
  const dialogBody = (
    <Tabs defaultValue="auto" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Manual Input</TabsTrigger>
        <TabsTrigger value="auto">Auto-Fill (Link)</TabsTrigger>
      </TabsList>

      <TabsContent value="manual">
        <form onSubmit={handleManualSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="m-title">Title *</Label>
            <Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. One Piece" autoFocus />
            {duplicates.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>
                <div className="text-xs">
                  <span className="font-semibold">Possible duplicate:</span>
                  <ul className="mt-1 space-y-0.5">{duplicates.slice(0, 2).map(d => <li key={d.id}>• {d.title}</li>)}</ul>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-author">Author</Label>
            <Input id="m-author" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Optional"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-cover">Cover URL</Label>
            <Input id="m-cover" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..."/>
            {coverUrl && (
              <div className="w-24 h-34 rounded-2xl overflow-hidden border border-border bg-secondary shrink-0 shadow-xl shadow-black/30">
                <img src={coverUrl} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")}/>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-synopsis">Synopsis</Label>
            <Textarea id="m-synopsis" value={synopsis} onChange={e => setSynopsis(e.target.value)} placeholder="Brief summary..." className="min-h-[80px]"/>
          </div>
          <Button type="submit" className="w-full" disabled={!title.trim()}>Add Manually</Button>
        </form>
      </TabsContent>

      <TabsContent value="auto">
        <div className="space-y-5 mt-5">
          {!autoPreview ? (
            <>
              <p className="text-[13px] text-muted-foreground">
                Paste a link (MyAnimeList, Webtoon, etc.) and we'll fill Title, Author, Genre, and Cover automatically.
              </p>
              <form onSubmit={handleAutoFetch} className="flex gap-2">
                <Input value={autoUrl} onChange={e => { setAutoUrl(e.target.value); setAutoError(""); }}
                  placeholder="https://MyAnimeList.net/title/..." disabled={autoLoading} className="flex-1"/>
                <Button type="submit" disabled={autoLoading || !autoUrl.trim()} className="shrink-0">
                  {autoLoading ? <Loader2 className="animate-spin h-4 w-4"/> : <Sparkles className="h-4 w-4"/>}
                </Button>
              </form>
              {autoError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">Failed to auto-fill</p>
                    <p className="text-destructive/80">{autoError}</p>
                    <p className="text-destructive/60">Try using Manual Input instead.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/30 bg-primary/10">
                <CheckCircle2 className="w-4 h-4 text-primary/90 mt-0.5 shrink-0"/>
                <p className="text-xs text-primary/90 font-semibold">Data found! Review before adding.</p>
              </div>
              <div className="flex gap-3">
                {(autoPreview.coverUrl || autoPreview.cover || autoPreview.thumbnail) && (
                  <div className="w-24 h-34 rounded-2xl overflow-hidden border border-border bg-secondary shrink-0 shadow-xl shadow-black/30">
                    <img src={autoPreview.coverUrl || autoPreview.cover || autoPreview.thumbnail} alt=""
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.parentElement!.style.display = "none")}/>
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-bold text-[13px] text-foreground line-clamp-2">{autoPreview.title || "—"}</p>
                  {autoPreview.altTitle && <p className="text-[11px] text-muted-foreground/70 italic line-clamp-1">{autoPreview.altTitle}</p>}
                  {autoPreview.author && <p className="text-xs text-muted-foreground">{autoPreview.author}</p>}
                  {(autoPreview.genres || autoPreview.genre) && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(Array.isArray(autoPreview.genres || autoPreview.genre)
                        ? (autoPreview.genres || autoPreview.genre)
                        : String(autoPreview.genres || autoPreview.genre).split(",")
                      ).slice(0, 4).map((g: string) => (
                        <span key={g} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary/90 border border-primary/20">{g.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {(autoPreview.synopsis || autoPreview.description) && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 border-t border-border pt-3">
                  {autoPreview.synopsis || autoPreview.description}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setAutoPreview(null); setAutoError(""); }}>← Try Again</Button>
                <Button className="flex-1" onClick={handleAutoConfirm}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5"/>Add Story
                </Button>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );

  /* ─── Mobile: Bottom Sheet ──────────── */
  if (isMobile) {
    const triggerEl = isValidElement(trigger)
      ? cloneElement(trigger as React.ReactElement<any>, {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen(true);
          }
        })
      : (
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4"/>
          {showLabel && <span className="text-[13px] font-medium">Add Story</span>}
        </Button>
      );

    return (
      <>
        {triggerEl}
        {open && createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          >
            {/* Backdrop */}
            <div
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
              onClick={() => handleClose(false)}
            />

            {/* Sheet panel */}
            <div
              className="relative flex flex-col animate-in slide-in-from-bottom duration-300"
              style={{
                borderRadius: "24px 24px 0 0",
                maxHeight: "92dvh",
                background: "hsl(var(--card))",
                borderTop: "1px solid hsl(var(--border))",
                boxShadow: "0 -24px 60px rgba(0,0,0,0.5)",
              }}
            >
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 999, background: "hsl(var(--border))" }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-primary/90" />
                  <span className="font-bold text-[13px]">Add New Story</span>
                </div>
                <button
                  onClick={() => handleClose(false)}
                  className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-10">
                {dialogBody}
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  {/* ─── Desktop: Standard Dialog ───────────────────────── */}
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4"/>
            {showLabel && (
              <span className="text-[13px] font-medium">
                Add Story
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-0 gap-0 overflow-hidden">

        {/* HEADER */}
        <div className="relative border-b border-border/50 px-6 py-5 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary/90" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Add New Story
                </DialogTitle>
                <p className="text-[13px] text-muted-foreground">
                  Import metadata automatically or add manually.
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Tabs defaultValue="auto" className="w-full">
            {/* TABS */}
            <TabsList className="grid w-full grid-cols-2 bg-secondary/40 border border-border/50 backdrop-blur-sm rounded-2xl p-1 h-auto">
              <TabsTrigger value="manual" className="rounded-xl py-2 text-[13px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60">
                Manual Input
              </TabsTrigger>
              <TabsTrigger value="auto" className="rounded-xl py-2 text-[13px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60">
                Auto-Fill (Link)
              </TabsTrigger>
            </TabsList>

            {/* MANUAL */}
            <TabsContent value="manual">
              <form onSubmit={handleManualSubmit} className="space-y-4 mt-5">
                <div className="space-y-2">
                  <Label htmlFor="m-title">Title *</Label>
                  <Input
                    id="m-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. One Piece"
                    autoFocus
                  />

                  {duplicates.length > 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>
                      <div className="text-xs">
                        <span className="font-semibold">
                          Possible duplicate:
                        </span>
                        <ul className="mt-1 space-y-0.5">
                          {duplicates.slice(0, 2).map(d => (
                            <li key={d.id}>• {d.title}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m-author">Author</Label>
                  <Input
                    id="m-author"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m-cover">
                    Cover URL
                  </Label>
                  <Input
                    id="m-cover"
                    value={coverUrl}
                    onChange={e => setCoverUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {coverUrl && (
                    <div className="w-24 h-34 rounded-2xl overflow-hidden border border-border bg-secondary shrink-0 shadow-xl shadow-black/30">
                      <img
                        src={coverUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                        onError={e => (
                          e.currentTarget.style.display = "none"
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m-synopsis">
                    Synopsis
                  </Label>
                  <Textarea
                    id="m-synopsis"
                    value={synopsis}
                    onChange={e => setSynopsis(e.target.value)}
                    placeholder="Brief summary..."
                    className="min-h-[80px]"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  Add Manually
                </Button>
              </form>
            </TabsContent>

            {/* AUTO */}
            <TabsContent value="auto">
              <div className="space-y-5 mt-5">
                {!autoPreview ? (
                  <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[13px] text-muted-foreground">
                        Paste a link and we'll automatically fill metadata.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {["MAL", "MangaDex", "Webtoon", "NovelUpdates"].map(site => (
                          <span key={site} className="px-2 py-1 rounded-full text-[10px] bg-primary/10 text-primary/90 border border-primary/20">
                            {site}
                          </span>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleAutoFetch} className="flex gap-2">
                      <Input
                        value={autoUrl}
                        onChange={e => {
                          setAutoUrl(e.target.value);
                          setAutoError("");
                        }}
                        placeholder="https://MyAnimeList.net/title/..."
                        disabled={autoLoading}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={autoLoading || !autoUrl.trim()} className="rounded-xl px-4 shadow-lg shadow-primary/20 shrink-0">
                        {autoLoading ? (
                          <Loader2 className="animate-spin h-4 w-4"/>
                        ) : (
                          <Sparkles className="h-4 w-4"/>
                        )}
                      </Button>
                    </form>
                    {autoError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">
                            Failed to auto-fill
                          </p>
                          <p className="text-destructive/80">
                            {autoError}
                          </p>
                          <p className="text-destructive/60">
                            Try using Manual Input instead.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4 space-y-4"> 
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/30 bg-primary/10">
                      <CheckCircle2 className="w-4 h-4 text-primary/90 mt-0.5 shrink-0"/>
                      <p className="text-xs text-primary/90 font-semibold">
                        Data found! Review before adding.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      {(autoPreview.coverUrl || autoPreview.cover || autoPreview.thumbnail) && (
                        <div className="w-24 h-34 rounded-2xl overflow-hidden border border-border bg-secondary shrink-0 shadow-xl shadow-black/30">
                          <img
                            src={autoPreview.coverUrl || autoPreview.cover || autoPreview.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={e => (
                              e.currentTarget.parentElement!.style.display = "none"
                            )}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* TITLE */}
                        <div className="space-y-1">
                          <p className="font-bold text-lg leading-tight text-foreground line-clamp-2">
                            {autoPreview.title || "—"}
                          </p>
                          {(autoPreview.altTitle || autoPreview.alt_title) && (
                            <p className="text-xs italic text-muted-foreground line-clamp-1">
                              {autoPreview.altTitle || autoPreview.alt_title}
                            </p>
                          )}
                          {autoPreview.author && (
                            <p className="text-[13px] text-muted-foreground">
                              {autoPreview.author}
                            </p>
                          )}
                        </div>

                        {/* GENRES */}
                        {(autoPreview.genres || autoPreview.genre) && (
                          <div className="flex flex-wrap gap-1.5">
                            {(Array.isArray(autoPreview.genres || autoPreview.genre)
                              ? (autoPreview.genres || autoPreview.genre)
                              : String(autoPreview.genres || autoPreview.genre).split(",")
                            )
                              .slice(0, 6)
                              .map((g: string) => (
                                <span
                                  key={g}
                                  className="px-2 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary/90 border border-primary/20"
                                >
                                  {g.trim()}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {(autoPreview.synopsis || autoPreview.description) && (
                      <div className="border-t border-border/50 pt-4">
                        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-4">
                          {autoPreview.synopsis || autoPreview.description}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => {
                        setAutoPreview(null);
                        setAutoError("");
                      }}>
                        ← Try Again
                      </Button>
                      <Button className="flex-1 rounded-xl" onClick={handleAutoConfirm}>
                        <CheckCircle2 className="w-4 h-4 mr-1.5"/>
                        Add Story
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
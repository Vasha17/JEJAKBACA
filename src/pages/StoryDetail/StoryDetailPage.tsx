import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useStories } from "@/lib/StoryContext";
import { StoryStatus, getGlobalTags } from "@/lib/types";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from "@/component/ui/dialog";
import {
  BookOpen, X, Plus, Trash2, AlertCircle,
  CheckCircle2, Globe, Database, ChevronLeft,
  ChevronRight, Search, Bookmark,
} from "lucide-react";
import { format } from "date-fns";
import { RichTextEditor } from "@/component/RichTextEditor";
import { ImageCropper } from "@/component/ImageCropper";
import "flag-icons/css/flag-icons.min.css";

// ── Local imports ─────────────────────────────────────────────────────────────
import { StoryDetailSkeleton }            from "./components/StoryDetailSkeleton";
import { GenrePickerModal }               from "./components/GenrePickerModal";
import { HeroSection }                   from "./components/HeroSection";
import { StoryContent }                  from "./components/StoryContent";
import { RightPanel }                    from "./components/RightPanel";
import { NotesTimeline }                 from "./components/NotesTimeline";
import {
  STATUS_OPTIONS, statusColor,
  REL_LABELS, REL_COLORS,
  ARC_COLOR_PALETTES, ARC_COLORS,
  type ArcColorPalette,
} from "./constants/status";
import { ALL_COUNTRIES, POPULAR_COUNTRIES } from "./constants/countries";
import {
  lsGet, lsSet, normalizeTag, haptic,
  base64ToFile,
  loadArcs, saveArcs,
  type Arc,
} from "./utils/helpers";
import { computePrediction, pushCHLog }     from "./hooks/useChapterPrediction";
import { useStoryHistory, pushHistory }     from "./hooks/useStoryHistory";
import { useStoryRelations, loadRelations } from "./hooks/useStoryRelations";
import { usePullToRefresh }                 from "./hooks/usePullToRefresh";
import { useKeyboardShortcuts }             from "./hooks/useKeyboardShortcuts";

// ─────────────────────────────────────────────────────────────────────────────

const safeGet = <T,>(key: string, defaultValue: T): T => {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return defaultValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn("Storage blocked (Incognito?):", e);
    return defaultValue;
  }
};

export default function StoryDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // Dipertahankan untuk kebutuhan state navigasi lain (misal: fromVault)  

  const fromListId = location.state?.fromListId;
  const {
    getStory, stories, updateStory, deleteStory,
    addBookmark, removeBookmark,
    addSource, removeSource,
    addNote, removeNote,
    addMedia, removeMedia,
    addTagToStory, removeTagFromStory,
    addListToStory, removeListFromStory,
  } = useStories();
  const story = getStory(id || "");

  // ── Mobile Detection ──────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── CTA preference ────────────────────────────────────────────────────────
  const [ctaPreference, setCtaPreference] = useState<"floating" | "inside">(() => {
    const val = localStorage.getItem("jejakbaca_cta_pref");
    return val === "floating" || val === "inside" ? val : "floating";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "jejakbaca_cta_pref" && (e.newValue === "floating" || e.newValue === "inside"))
        setCtaPreference(e.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // ── Dialog states ─────────────────────────────────────────────────────────
  const [coverDialog, setCoverDialog]                           = useState(false);
  const [headerDialog, setHeaderDialog]                         = useState(false);
  const [headerDialogTouchStart, setHeaderDialogTouchStart]     = useState(0);
  const [coverDialogTouchStart, setCoverDialogTouchStart]       = useState(0);
  const [ratingDialog, setRatingDialog]                         = useState(false);
  const [notesDialog, setNotesDialog]                           = useState(false);
  const [listsDialog, setListsDialog]                           = useState(false);
  const [bookmarkDialog, setBookmarkDialog]                     = useState(false);
  const [sourceDialog, setSourceDialog]                         = useState(false);
  const [addSourceDialog, setAddSourceDialog]                   = useState(false);
  const [synopsisEditDialog, setSynopsisEditDialog]             = useState(false);
  const [mediaDialog, setMediaDialog]                           = useState(false);
  const [headerCropOpen, setHeaderCropOpen]                     = useState(false);
  const [coverCropOpen, setCoverCropOpen]                       = useState(false);
  const [historyDialog, setHistoryDialog]                       = useState(false);
  const [relatedDialog, setRelatedDialog]                       = useState(false);
  const [statusDialog, setStatusDialog]                         = useState(false);
  const [deleteNoteId, setDeleteNoteId]                         = useState<string | null>(null);
  const [mediaLightbox, setMediaLightbox]                       = useState<{ url: string; label: string; id: string } | null>(null);
  const [editingMediaLabel, setEditingMediaLabel]               = useState("");
  const [updateBellDialog, setUpdateBellDialog]                 = useState(false);
  const [chapterTooltip, setChapterTooltip]                     = useState(false);
  const [moreDialog, setMoreDialog]                             = useState(false);
  const [editingNote, setEditingNote]                           = useState<any | null>(null);
  const [countryDialog, setCountryDialog]                       = useState(false);
  const [countrySearch, setCountrySearch]                       = useState("");
  const [deleteStoryDialog, setDeleteStoryDialog]               = useState(false);
  const [arcDialog, setArcDialog]                               = useState(false);
  const [editingArc, setEditingArc]                             = useState<Arc | null>(null);
  const [deleteArcId, setDeleteArcId]                           = useState<string | null>(null);
  const [coverLightbox, setCoverLightbox]                       = useState(false);
  const [headerLightbox, setHeaderLightbox]                     = useState(false);

  // ── Form states ───────────────────────────────────────────────────────────
  const [coverUrlValue, setCoverUrlValue]   = useState("");
  const [headerUrlValue, setHeaderUrlValue] = useState("");
  const [noteContent, setNoteContent]       = useState("");
  const [newListName, setNewListName]       = useState("");
  const [bmChapter, setBmChapter]           = useState("");
  const [bmNote, setBmNote]                 = useState("");
  const [srcName, setSrcName]               = useState("");
  const [srcUrl, setSrcUrl]                 = useState("");
  const [srcChapter, setSrcChapter]         = useState("");
  const [srcLang, setSrcLang]               = useState("");
  const [synopsisValue, setSynopsisValue]   = useState("");
  const [mediaUrl, setMediaUrl]             = useState("");
  const [mediaLabel, setMediaLabel]         = useState("");

  // ── Inline edit states ────────────────────────────────────────────────────
  const [editingTitle, setEditingTitle]         = useState(false);
  const [editingAltTitle, setEditingAltTitle]   = useState(false);
  const [editingAuthor, setEditingAuthor]       = useState(false);
  const [editingChapter, setEditingChapter]     = useState(false);
  const [titleValue, setTitleValue]             = useState("");
  const [altTitleValue, setAltTitleValue]       = useState("");
  const [authorValue, setAuthorValue]           = useState("");
  const [chapterValue, setChapterValue]         = useState("");
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  // ── Tag states ────────────────────────────────────────────────────────────
  const [newTag, setNewTag]                           = useState("");
  const [tagMode, setTagMode]                         = useState<"manual" | "existing" | "suggested">("manual");
  const [suggestedTags, setSuggestedTags]             = useState<string[]>([]);
  const [suggestedLoading, setSuggestedLoading]       = useState(false);
  const [tagRefresh, setTagRefresh]                   = useState(0);
  const [deleteTagConfirm, setDeleteTagConfirm]       = useState<string | null>(null);
  const [existingTagSearch, setExistingTagSearch]     = useState("");
  const [duplicateTagWarning, setDuplicateTagWarning] = useState(false);

  // ── Source edit states ────────────────────────────────────────────────────
  const [editSrcId, setEditSrcId]                 = useState<string | null>(null);
  const [editSrcChapter, setEditSrcChapter]       = useState("");
  const [editSrcUrl, setEditSrcUrl]               = useState("");
  const [editSrcName, setEditSrcName]             = useState("");
  const [editSrcLang, setEditSrcLang]             = useState("");
  const [sourcesKey, setSourcesKey]               = useState(0);
  const [srcNameSuggestion, setSrcNameSuggestion] = useState("");
  const [deleteBookmarkId, setDeleteBookmarkId]   = useState<string | null>(null);
  const [noSourceDialog, setNoSourceDialog]       = useState(false);

  // ── Genre states ──────────────────────────────────────────────────────────
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [genreExpanded, setGenreExpanded]     = useState(false);

  // ── Arc states ────────────────────────────────────────────────────────────
  const [arcs, setArcs]                       = useState<Arc[]>([]);
  const [arcName, setArcName]                 = useState("");
  const [arcStart, setArcStart]               = useState("");
  const [arcEnd, setArcEnd]                   = useState("");
  const [arcDesc, setArcDesc]                 = useState("");
  const [arcColor, setArcColor]               = useState(ARC_COLORS[0]);
  const [arcColorPalette, setArcColorPalette] = useState<ArcColorPalette>("colorful");
  const [arcColorMode, setArcColorMode]       = useState<"auto" | "manual">("auto");

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"notes" | "timeline">(() =>
    lsGet<"notes" | "timeline">(`tab_pref_${id}`, "notes")
  );
  const handleTabChange = (tab: "notes" | "timeline") => {
    setActiveTab(tab); lsSet(`tab_pref_${id}`, tab);
  };

  // ── Link checker ──────────────────────────────────────────────────────────
  const [linkStatuses, setLinkStatuses] = useState<Record<string, { ok: boolean; checking: boolean; statusText: string }>>({});

  // ── Notification tracking ─────────────────────────────────────────────────
  const [trackedSourceIds, setTrackedSourceIds] = useState<string[]>([]);

  // ── Lists state ───────────────────────────────────────────────────────────
  const [customLists, setCustomLists] = useState<any[]>(() => safeGet<any[]>("my_reading_lists", []));

  // ── Loading state ─────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const mediaFileRef   = useRef<HTMLInputElement>(null);
  const coverFileRef   = useRef<HTMLInputElement>(null);
  const headerFileRef  = useRef<HTMLInputElement>(null);
  const noteContentRef = useRef("");

  // ═══════════════════════════════════════════════════════════════════════════
  // useEffect HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 150);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    try { setTrackedSourceIds(safeGet<string[]>(`tracked_sources_${id}`, [])); }
    catch (e) { console.warn("Gagal load tracked sources", e); }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    try { setArcs(loadArcs(id)); }
    catch (e) { console.warn("Gagal load arcs (storage blocked?)", e); setArcs([]); }
  }, [id]);

  // ── Custom hooks ──────────────────────────────────────────────────────────
  const { isRefreshing, pullDelta, PULL_THRESHOLD, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh();

  const { historyEntries, handleOpenHistory, handleUndoHistory, clearHistory } =
    useStoryHistory(story?.id || "", updateStory);

  const {
    relations, newRelTitle, newRelType, newRelMode, newRelUrl, relSuggestions,
    setNewRelType, setNewRelMode, setNewRelStoryId, setNewRelUrl,
    handleOpenRelated, handleRelTitleInput, handleAddRelation, handleRemoveRelation,
  } = useStoryRelations(story?.id || "", stories);

  // ── Navigation ────────────────────────────────────────────────────────────
  const fromVault = location.state?.fromVault === true;
  const allStories = useMemo(() => {
    const savedLists = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    const hiddenListIds = new Set(savedLists.filter((l: any) => l.isHidden).map((l: any) => l.id));
    let filtered = (stories || []).filter((s: any) => {
      const inHiddenList = (s.lists || []).some((lid: string) => hiddenListIds.has(lid));
      const isHidden = s.hidden === true || inHiddenList;
      return fromVault ? isHidden : !isHidden;
    });
    if (fromListId) filtered = filtered.filter((s: any) => (s.lists || []).includes(fromListId));
    return filtered.sort((a: any, b: any) =>
      new Date(b.chapterUpdatedAt).getTime() - new Date(a.chapterUpdatedAt).getTime()
    );
  }, [stories, fromVault, fromListId]);

  const currentIndex = allStories.findIndex((s: any) => s.id === story?.id);
  const prevStory    = currentIndex > 0 ? allStories[currentIndex - 1] : null;
  const nextStory    = currentIndex < allStories.length - 1 ? allStories[currentIndex + 1] : null;

  const handleNavigateStory = (targetId: string) => {
    navigate(`/story/${targetId}`, { state: { fromVault } });
    window.scrollTo(0, 0);
  };

  // ── Chapter update ────────────────────────────────────────────────────────
  const handleChapterUpdate = useCallback((ch: number) => {
    if (!story) return;
    pushHistory(story.id, {
      type: "chapter", label: "Chapter updated",
      oldValue: String(story.currentChapter), newValue: String(ch),
    });
    pushCHLog(story.id, ch);
    const updatedSources = (story.sources || []).map((src: any) =>
      (src.currentChapter || 0) < ch ? { ...src, currentChapter: ch } : src
    );
    updateStory(story.id, { currentChapter: ch, chapterUpdatedAt: new Date().toISOString(), sources: updatedSources });
  }, [story, updateStory]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts({
    story,
    onChapterUpdate: handleChapterUpdate,
    onOpenNotes:     () => setNotesDialog(true),
    onOpenRating:    () => setRatingDialog(true),
    onNavigateBack:  () => navigate("/"),
    prevStoryId:     prevStory?.id,
    nextStoryId:     nextStory?.id,
    onNavigateStory: handleNavigateStory,
  });

  const toggleTracked = (srcId: string) => {
    if (!story) return;
    setTrackedSourceIds(prev => {
      const next = prev.includes(srcId)
        ? prev.filter(x => x !== srcId)
        : prev.length >= 2 ? prev : [...prev, srcId];
      try { lsSet(`tracked_sources_${story.id}`, next); }
      catch (e) { console.warn("Storage blocked"); }
      return next;
    });
  };

  // ── Early returns ─────────────────────────────────────────────────────────
  if (isLoading) return <StoryDetailSkeleton />;
  if (!story) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Story not found</p>
          <Link to="/" className="text-primary hover:underline">Back to Library</Link>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const currentStatus       = STATUS_OPTIONS.find(s => s.value === story.status);
  const dotColor            = statusColor(story.status);
  const globalTags          = getGlobalTags();
  const storyTagsSafe       = story?.tags || [];
  const storyTagsNorm       = storyTagsSafe.map(normalizeTag);
  const availableGlobalTags = globalTags.filter((t: string) => !storyTagsNorm.includes(normalizeTag(t)));
  const inlineRelations     = loadRelations(story.id);
  const synopsisParagraphs  = story.synopsis ? story.synopsis.split("\n").filter((p: string) => p.trim()) : [];
  const hasMoreSynopsis     = synopsisParagraphs.length > 1 || (synopsisParagraphs[0]?.length > 200);
  const prediction          = computePrediction(story.id, story.chapterUpdatedAt);

  const trackedSourcesWithUpdates = story.sources.filter((src: any) =>
    trackedSourceIds.includes(src.id) && (src.currentChapter || 0) > (story.currentChapter || 0)
  );
  const maxChaptersAhead = trackedSourcesWithUpdates.length > 0
    ? Math.max(...trackedSourcesWithUpdates.map((src: any) => (src.currentChapter || 0) - (story.currentChapter || 0)))
    : 0;
  const hasUpdates = trackedSourcesWithUpdates.length > 0;

  const getBadgeStyles = (diff: number) => {
    if (diff >= 50) return "bg-red-500/30 shadow-red-500/80 text-white";
    if (diff >= 20) return "bg-orange-400/40 shadow-orange-500/800 text-white";
    if (diff >= 10) return "bg-yellow-600/60 shadow-yellow-500/100 text-white";
    return "bg-blue-500/60 shadow-blue-500/30 text-white";
  };

  const anyDialogOpen = coverDialog || headerDialog || ratingDialog || notesDialog ||
    listsDialog || bookmarkDialog || sourceDialog || addSourceDialog ||
    synopsisEditDialog || moreDialog || arcDialog || statusDialog;

  const isTouchDevice = typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const uploadToStorage = async (file: File, path: string): Promise<string> => {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${path}/${fileName}`;
    const { error } = await supabase.storage.from("images").upload(filePath, file);
    if (error) { console.error("Upload failed:", error); throw error; }
    const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const handleSuggestTags = async () => {
    if (!story.title) return;
    setSuggestedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-tags", {
        body: { title: story.title, synopsis: story.synopsis, existingTags: story.tags },
      });
      if (error) throw error;
      if (Array.isArray(data.tags))
        setSuggestedTags(data.tags.filter((t: string) => !storyTagsNorm.includes(normalizeTag(t))));
    } catch (e) { console.error(e); }
    finally { setSuggestedLoading(false); }
  };

  const handleAddTag = () => {
    const tag = normalizeTag(newTag);
    if (!tag) return;
    if (storyTagsNorm.includes(tag)) {
      setDuplicateTagWarning(true);
      setTimeout(() => setDuplicateTagWarning(false), 2000);
      return;
    }
    addTagToStory(story.id, tag); setNewTag("");
  };

  const handleDeleteExistingTag = (tag: string) => setDeleteTagConfirm(tag);

  const confirmDeleteExistingTag = () => {
    if (!deleteTagConfirm) return;
    const existing: string[] = lsGet("jejakbaca_global_tags", []);
    lsSet("jejakbaca_global_tags", existing.filter((t: string) => t !== deleteTagConfirm));
    setTagRefresh(r => r + 1);
    setDeleteTagConfirm(null);
  };

  const handleToggleGenre = (g: string) => {
    if (g === "__CLEAR__") { updateStory(story.id, { genres: [] }); return; }
    const cur: string[] = story.genres || [];
    updateStory(story.id, {
      genres: cur.includes(g) ? cur.filter((x: string) => x !== g) : [...cur, g],
    });
  };

  const handleRatingChange = (r: number) => {
    pushHistory(story.id, { type: "rating", label: "Rating changed", oldValue: String(story.rating || 0), newValue: String(r) });
    updateStory(story.id, { rating: r }); setRatingDialog(false);
  };

  const handleStatusChange = (s: StoryStatus) => {
    pushHistory(story.id, { type: "status", label: "Status changed", oldValue: story.status, newValue: s });
    updateStory(story.id, { status: s }); setStatusDialog(false);
  };

  const handleSaveNote = () => {
    const content = noteContentRef.current || noteContent;
    const stripped = content.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!stripped) return;
    if (editingNote) {
      const updatedNotes = (story.notes || []).map((n: any) =>
        n.id === editingNote.id ? { ...n, text: content } : n
      );
      updateStory(story.id, { notes: updatedNotes });
    } else {
      addNote(story.id, content);
    }
    noteContentRef.current = "";
    setNoteContent(""); setEditingNote(null); setNotesDialog(false);
  };

  const handleSaveMediaLabel = () => {
    if (!mediaLightbox) return;
    const trimmed = editingMediaLabel.trim();
    if (!trimmed) return;
    const updatedMedia = (story.media || []).map((m: any) =>
      m.id === mediaLightbox.id ? { ...m, label: trimmed } : m
    );
    updateStory(story.id, { media: updatedMedia });
    setMediaLightbox(prev => prev ? { ...prev, label: trimmed } : null);
    setEditingMediaLabel("");
  };

  const handleSaveSourceEdit = () => {
    if (!editSrcId) return;
    if (editSrcName.trim() && editSrcUrl.trim()) {
      const newCh = parseInt(editSrcChapter) || 0;
      const oldSrc = story.sources.find((s: any) => s.id === editSrcId);
      const upd = (story.sources || []).map((s: any) => s.id === editSrcId
        ? { ...s, name: editSrcName.trim(), url: editSrcUrl.trim(), language: editSrcLang.trim().toUpperCase(), currentChapter: newCh }
        : s);
      const updates: any = { sources: upd };
      if (oldSrc && (oldSrc.currentChapter || 0) === (story.currentChapter || 0) && newCh !== (story.currentChapter || 0)) {
        updates.currentChapter = newCh;
        updates.chapterUpdatedAt = new Date().toISOString();
      }
      updateStory(story.id, updates);
    }
    setEditSrcId(null); setSourcesKey(k => k + 1);
  };

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const publicUrl = await uploadToStorage(file, "media");
      addMedia(story.id, { type: "image", url: publicUrl, label: file.name });
    } catch { alert("Failed to upload image. Check your internet connection."); }
    e.target.value = "";
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const publicUrl = await uploadToStorage(file, "covers");
      const updates: any = { coverUrl: publicUrl };
      if (!story.headerUrl) updates.headerUrl = publicUrl;
      updateStory(story.id, updates); setCoverDialog(false);
    } catch { alert("Failed to upload cover image."); }
    e.target.value = "";
  };

  const handleHeaderFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const publicUrl = await uploadToStorage(file, "headers");
      updateStory(story.id, { headerUrl: publicUrl }); setHeaderDialog(false);
    } catch { alert("Image upload failed."); }
    e.target.value = "";
  };

  const handleReadNow = () => {
    if (!story.sources || story.sources.length === 0) {
      setNoSourceDialog(true); return;
    }
    const best = [...story.sources].sort((a: any, b: any) => (b.currentChapter || 0) - (a.currentChapter || 0))[0];
    window.open(best.url, "_blank");
  };

  const handleOpenListsDialog = () => {
    const lists = safeGet<any[]>("my_reading_lists", []);
    setCustomLists(lists.filter(l => story.hidden ? l.isHidden : !l.isHidden));
    setListsDialog(true);
  };

  // ── Arc handlers ──────────────────────────────────────────────────────────
  const handleOpenArcDialog = (arc?: Arc) => {
    if (arc) {
      setEditingArc(arc); setArcName(arc.name);
      setArcStart(String(arc.chapterStart)); setArcEnd(arc.chapterEnd ? String(arc.chapterEnd) : "");
      setArcColor(arc.color); setArcDesc(arc.description);
    } else {
      setEditingArc(null); setArcName(""); setArcStart(""); setArcEnd(""); setArcDesc("");
      if (arcColorMode === "auto") {
        const palette = ARC_COLOR_PALETTES[arcColorPalette];
        setArcColor(palette[arcs.length % palette.length]);
      }
    }
    setArcDialog(true);
  };

  const handleMoveArc = (arcId: string, direction: "up" | "down") => {
    const sorted = [...arcs]
      .map((a, i) => ({ ...a, order: a.order ?? i }))
      .sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(a => a.id === arcId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...sorted];
    [updated[idx].order, updated[swapIdx].order] = [updated[swapIdx].order, updated[idx].order];
    saveArcs(story.id, updated); setArcs(updated);
  };

  const handleSaveArc = () => {
    if (!arcName.trim() || !arcStart) return;
    let finalColor = arcColor;
    if (arcColorMode === "auto" && !editingArc) {
      const palette = ARC_COLOR_PALETTES[arcColorPalette];
      finalColor = palette[arcs.length % palette.length];
    }
    const arc: Arc = {
      id: editingArc?.id || crypto.randomUUID(),
      name: arcName.trim(),
      chapterStart: parseInt(arcStart),
      chapterEnd: arcEnd ? parseInt(arcEnd) : null,
      description: arcDesc.trim(),
      color: finalColor,
      createdAt: editingArc?.createdAt || new Date().toISOString(),
      order: editingArc?.order ?? arcs.length,
    };
    const updated = editingArc
      ? arcs.map(a => a.id === editingArc.id ? arc : a)
      : [...arcs, arc];
    saveArcs(story.id, updated); setArcs(updated); setArcDialog(false); setEditingArc(null);
  };

  const handleDeleteArc = (arcId: string) => {
    const updated = arcs.filter(a => a.id !== arcId);
    saveArcs(story.id, updated); setArcs(updated); setDeleteArcId(null);
  };

  function checkLink(sourceId: string, url: string) {
    setLinkStatuses(prev => ({ ...prev, [sourceId]: { ok: false, checking: true, statusText: "Checking..." } }));
    supabase.functions.invoke("check-link", { body: { url } }).then(({ data, error }) => {
      if (error) { setLinkStatuses(prev => ({ ...prev, [sourceId]: { ok: false, checking: false, statusText: "Error" } })); return; }
      setLinkStatuses(prev => ({ ...prev, [sourceId]: { ok: data.ok, checking: false, statusText: data.ok ? "Active" : `${data.status}` } }));
    });
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-background relative animate-in fade-in slide-in-from-bottom-1 duration-200"
      key={story.id}
      {...(isTouchDevice ? { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd } : {})}
    >
      {/* ═══ HERO ════════════════════════════════════════════════════════════ */}
      <HeroSection
        story={story}
        isMobile={isMobile}
        fromListId={fromListId}
        fromVault={fromVault}
        prevStory={prevStory}
        nextStory={nextStory}
        currentIndex={currentIndex}
        allStoriesLength={allStories.length}
        isRefreshing={isRefreshing}
        pullDelta={pullDelta}
        PULL_THRESHOLD={PULL_THRESHOLD}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
        ctaPreference={ctaPreference}
        trackedSourceIds={trackedSourceIds}
        trackedSourcesWithUpdates={trackedSourcesWithUpdates}
        maxChaptersAhead={maxChaptersAhead}
        hasUpdates={hasUpdates}
        prediction={prediction}
        editingTitle={editingTitle}
        editingAltTitle={editingAltTitle}
        editingAuthor={editingAuthor}
        editingChapter={editingChapter}
        titleValue={titleValue}
        altTitleValue={altTitleValue}
        authorValue={authorValue}
        chapterValue={chapterValue}
        chapterTooltip={chapterTooltip}
        genreExpanded={genreExpanded}
        coverDialog={coverDialog}
        headerDialog={headerDialog}
        ratingDialog={ratingDialog}
        statusDialog={statusDialog}
        moreDialog={moreDialog}
        updateBellDialog={updateBellDialog}
        headerLightbox={headerLightbox}
        coverLightbox={coverLightbox}
        coverUrlValue={coverUrlValue}
        headerUrlValue={headerUrlValue}
        headerDialogTouchStart={headerDialogTouchStart}
        coverDialogTouchStart={coverDialogTouchStart}
        coverFileRef={coverFileRef}
        headerFileRef={headerFileRef}
        setEditingTitle={setEditingTitle}
        setEditingAltTitle={setEditingAltTitle}
        setEditingAuthor={setEditingAuthor}
        setEditingChapter={setEditingChapter}
        setTitleValue={setTitleValue}
        setAltTitleValue={setAltTitleValue}
        setAuthorValue={setAuthorValue}
        setChapterValue={setChapterValue}
        setChapterTooltip={setChapterTooltip}
        setGenreExpanded={setGenreExpanded}
        setCoverDialog={setCoverDialog}
        setHeaderDialog={setHeaderDialog}
        setRatingDialog={setRatingDialog}
        setStatusDialog={setStatusDialog}
        setMoreDialog={setMoreDialog}
        setUpdateBellDialog={setUpdateBellDialog}
        setHeaderLightbox={setHeaderLightbox}
        setCoverLightbox={setCoverLightbox}
        setCoverUrlValue={setCoverUrlValue}
        setHeaderUrlValue={setHeaderUrlValue}
        setHeaderDialogTouchStart={setHeaderDialogTouchStart}
        setCoverDialogTouchStart={setCoverDialogTouchStart}
        setHeaderCropOpen={setHeaderCropOpen}
        setCoverCropOpen={setCoverCropOpen}
        setCountryDialog={setCountryDialog}
        setBookmarkDialog={setBookmarkDialog}
        setNotesDialog={setNotesDialog}
        setGenrePickerOpen={setGenrePickerOpen}
        setHistoryDialog={setHistoryDialog}
        setRelatedDialog={setRelatedDialog}
        setDeleteStoryDialog={setDeleteStoryDialog}
        updateStory={updateStory}
        deleteStory={deleteStory}
        handleChapterUpdate={handleChapterUpdate}
        handleOpenHistory={handleOpenHistory}
        handleOpenRelated={handleOpenRelated}
        handleOpenListsDialog={handleOpenListsDialog}
        handleRatingChange={handleRatingChange}
        handleStatusChange={handleStatusChange}
        handleCoverFileUpload={handleCoverFileUpload}
        handleHeaderFileUpload={handleHeaderFileUpload}
        navigate={navigate}
      />

      {/* ═══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <main className="container max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 mt-12 space-y-6 sm:space-y-0">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-6 gap-y-8">

            {/* Left column */}
            <StoryContent
              story={story}
              inlineRelations={inlineRelations}
              synopsisParagraphs={synopsisParagraphs}
              hasMoreSynopsis={hasMoreSynopsis}
              synopsisExpanded={synopsisExpanded}
              setSynopsisExpanded={setSynopsisExpanded}
              synopsisEditDialog={synopsisEditDialog}
              setSynopsisEditDialog={setSynopsisEditDialog}
              synopsisValue={synopsisValue}
              setSynopsisValue={setSynopsisValue}
              genreExpanded={genreExpanded}
              setGenreExpanded={setGenreExpanded}
              setGenrePickerOpen={setGenrePickerOpen}
              newTag={newTag}
              setNewTag={setNewTag}
              tagMode={tagMode}
              setTagMode={setTagMode}
              suggestedTags={suggestedTags}
              setSuggestedTags={setSuggestedTags}
              suggestedLoading={suggestedLoading}
              tagRefresh={tagRefresh}
              deleteTagConfirm={deleteTagConfirm}
              setDeleteTagConfirm={setDeleteTagConfirm}
              existingTagSearch={existingTagSearch}
              setExistingTagSearch={setExistingTagSearch}
              duplicateTagWarning={duplicateTagWarning}
              availableGlobalTags={availableGlobalTags}
              storyTagsNorm={storyTagsNorm}
              deleteBookmarkId={deleteBookmarkId}
              setDeleteBookmarkId={setDeleteBookmarkId}
              updateStory={updateStory}
              addTagToStory={addTagToStory}
              removeTagFromStory={removeTagFromStory}
              removeBookmark={removeBookmark}
              handleAddTag={handleAddTag}
              handleSuggestTags={handleSuggestTags}
              handleDeleteExistingTag={handleDeleteExistingTag}
              lsGet={lsGet}
              lsSet={lsSet}
              navigate={navigate}
            />

            {/* Right column */}
            <RightPanel
              story={story}
              ctaPreference={ctaPreference}
              trackedSourceIds={trackedSourceIds}
              linkStatuses={linkStatuses}
              sourcesKey={sourcesKey}
              editSrcId={editSrcId}
              editSrcName={editSrcName}
              editSrcUrl={editSrcUrl}
              editSrcChapter={editSrcChapter}
              editSrcLang={editSrcLang}
              srcName={srcName}
              srcUrl={srcUrl}
              srcChapter={srcChapter}
              srcLang={srcLang}
              srcNameSuggestion={srcNameSuggestion}
              mediaUrl={mediaUrl}
              mediaLabel={mediaLabel}
              mediaLightbox={mediaLightbox}
              editingMediaLabel={editingMediaLabel}
              sourceDialog={sourceDialog}
              addSourceDialog={addSourceDialog}
              mediaDialog={mediaDialog}
              mediaFileRef={mediaFileRef}
              stories={stories}
              setEditSrcId={setEditSrcId}
              setEditSrcName={setEditSrcName}
              setEditSrcUrl={setEditSrcUrl}
              setEditSrcChapter={setEditSrcChapter}
              setEditSrcLang={setEditSrcLang}
              setSrcName={setSrcName}
              setSrcUrl={setSrcUrl}
              setSrcChapter={setSrcChapter}
              setSrcLang={setSrcLang}
              setSrcNameSuggestion={setSrcNameSuggestion}
              setMediaUrl={setMediaUrl}
              setMediaLabel={setMediaLabel}
              setMediaLightbox={setMediaLightbox}
              setEditingMediaLabel={setEditingMediaLabel}
              setSourceDialog={setSourceDialog}
              setAddSourceDialog={setAddSourceDialog}
              setMediaDialog={setMediaDialog}
              setSourcesKey={setSourcesKey}
              updateStory={updateStory}
              addSource={addSource}
              removeSource={removeSource}
              addMedia={addMedia}
              removeMedia={removeMedia}
              toggleTracked={toggleTracked}
              handleSaveSourceEdit={handleSaveSourceEdit}
              handleSaveMediaLabel={handleSaveMediaLabel}
              handleMediaFileUpload={handleMediaFileUpload}
              checkLink={checkLink}
              getBadgeStyles={getBadgeStyles}
            />
          </div>
        </div>

        {/* Notes / Timeline */}
        <NotesTimeline
          story={story}
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          arcs={arcs}
          setNotesDialog={setNotesDialog}
          setEditingNote={setEditingNote}
          setNoteContent={setNoteContent}
          setDeleteNoteId={setDeleteNoteId}
          handleOpenArcDialog={handleOpenArcDialog}
          handleMoveArc={handleMoveArc}
          setDeleteArcId={setDeleteArcId}
        />
      </main>

      {/* ═══ SHARED DIALOGS ══════════════════════════════════════════════════ */}

      {/* Rating */}
      <Dialog open={ratingDialog} onOpenChange={setRatingDialog}>
        <DialogContent className="sm:max-w-sm p-6 rounded-2xl">
          <DialogHeader className="mb-2 text-center">
            <DialogTitle className="text-2xl font-bold">Rate This Story</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">How much did you enjoy it?</p>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2 py-6">
            {[1,2,3,4,5,6,7,8,9,10].map(r => (
              <button key={r} onClick={() => { haptic("light"); handleRatingChange(r); }}
                className={`relative aspect-square rounded-xl text-lg font-bold transition-all duration-300 flex items-center justify-center shadow-sm ${story.rating === r ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white scale-110 shadow-amber-500/40 shadow-lg rotate-3 z-10" : "bg-secondary text-muted-foreground hover:bg-foreground hover:text-background hover:scale-105"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex-col sm:flex-col gap-2">
            {story.rating > 0 && <p className="text-xs text-center text-muted-foreground">Your rating: <span className="font-bold text-amber-500">{story.rating}/10</span></p>}
            <Button variant="ghost" size="sm" onClick={() => { updateStory(story.id, { rating: 0 }); setRatingDialog(false); }} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">Clear Rating</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          <DialogHeader className="mb-4"><DialogTitle className="text-xl">Select Status</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => { haptic("light"); handleStatusChange(s.value); }}
                className={`relative overflow-hidden group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${story.status === s.value ? "border-primary bg-primary/5 scale-105 shadow-lg" : "border-border bg-card hover:border-primary/50 hover:bg-secondary"}`}>
                {story.status === s.value && <div className="absolute inset-0 bg-primary/5 blur-xl -z-10" />}
                <span className="w-8 h-8 rounded-full shadow-inner mb-2 ring-2 ring-background transition-transform group-hover:scale-110" style={{ backgroundColor: s.color }} />
                <span className={`font-bold text-sm tracking-wide ${story.status === s.value ? "text-primary" : "text-foreground"}`}>{s.label}</span>
                {story.status === s.value && <div className="absolute top-2 right-2 text-primary"><CheckCircle2 size={16} className="fill-current" /></div>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookmark */}
      <Dialog open={bookmarkDialog} onOpenChange={setBookmarkDialog}>
        <DialogContent className="w-[92vw] max-w-sm mx-auto rounded-2xl">
          <DialogHeader><DialogTitle>Add Bookmark</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={bmChapter} onChange={e => setBmChapter(e.target.value)} placeholder="Chapter number" type="number" step="0.1" />
            <Input value={bmNote}    onChange={e => setBmNote(e.target.value)}    placeholder="Short note (optional)" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={() => {
              const ch = parseInt(bmChapter); if (!ch) return;
              haptic("medium");
              addBookmark(story.id, ch, bmNote); setBmChapter(""); setBmNote(""); setBookmarkDialog(false);
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes */}
      <Dialog open={notesDialog} onOpenChange={open => { if (!open) { setNotesDialog(false); setEditingNote(null); noteContentRef.current = ""; } }}>
        <DialogContent className="w-[92vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden mx-auto rounded-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingNote ? "Edit Note" : "Write a Note"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <RichTextEditor content={noteContent} onChange={(val) => { setNoteContent(val); noteContentRef.current = val; }} placeholder="Write your notes here..." />
          </div>
          <DialogFooter className="shrink-0 pt-2">
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={() => { haptic("medium"); handleSaveNote(); }}>{editingNote ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lists */}
      <Dialog open={listsDialog} onOpenChange={setListsDialog}>
        <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden gap-0 mx-auto rounded-2xl">
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-base font-bold text-foreground">Add to List</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Organise this story into your collections</p>
          </div>
          <div className="px-3 py-3 space-y-0.5 max-h-60 overflow-y-auto">
            {customLists.length > 0 ? (
              customLists.map((list: any) => {
                const isIn = story.lists?.includes(list.id) || false;
                return (
                  <label key={list.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${isIn ? "bg-primary/8 border-primary/25" : "border-transparent hover:bg-secondary/60 hover:border-border/60"}`}>
                    <div className="relative shrink-0">
                      <input type="checkbox" checked={isIn} onChange={() => {
                        if (isIn) { removeListFromStory(story.id, list.id); }
                        else { addListToStory(story.id, list.id); }
                        setTimeout(() => {
                          const lists = safeGet<any[]>("my_reading_lists", []);
                          setCustomLists(lists.filter(l => story.hidden ? l.isHidden : !l.isHidden));
                        }, 50);
                      }} className="sr-only" />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isIn ? "border-primary bg-primary shadow-sm shadow-primary/30" : "border-border bg-secondary"}`}>
                        {isIn && (
                          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                            <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10" style={{ backgroundColor: list.color || "#6b7280" }} />
                      <span className={`text-sm font-medium truncate ${isIn ? "text-foreground" : "text-foreground/80"}`}>{list.name}</span>
                    </div>
                    {isIn && <span className="text-[10px] font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded-full">Added</span>}
                  </label>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                  <X className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No lists yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Create one below</p>
              </div>
            )}
          </div>
          <div className="px-4 py-3.5 border-t border-border bg-secondary/30">
            <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Quick Create</p>
            <div className="flex gap-2">
              <Input
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="New list name..."
                className="bg-card text-sm h-9 flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && newListName.trim()) {
                    const newId = Date.now().toString();
                    const newList = { id: newId, name: newListName.trim(), description: "", status: "Custom", stories: [], color: "#3b82f6", isHidden: story.hidden === true };
                    const existing = safeGet<any[]>("my_reading_lists", []);
                    const updated = [...existing, newList];
                    localStorage.setItem("my_reading_lists", JSON.stringify(updated));
                    import("@/integrations/supabase/client").then(({ supabase }) => {
                      supabase.auth.getUser().then(({ data }) => {
                        if (data.user) {
                          supabase.from("lists").upsert({ id: newId, user_id: data.user.id, name: newListName.trim(), color: "#3b82f6", status: "Custom", description: "" }, { onConflict: "id" });
                        }
                      });
                    });
                    setCustomLists(updated);
                    addListToStory(story.id, newId);
                    setNewListName("");
                  }
                }}
              />
              <Button size="sm" className="h-9 px-3 shrink-0" onClick={() => {
                if (!newListName.trim()) return;
                const newId = Date.now().toString();
                const newList = { id: newId, name: newListName.trim(), description: "", status: "Custom", stories: [], color: "#3b82f6", isHidden: story.hidden === true };
                const existing = safeGet<any[]>("my_reading_lists", []);
                const updated = [...existing, newList];
                localStorage.setItem("my_reading_lists", JSON.stringify(updated));
                setCustomLists(updated);
                addListToStory(story.id, newId);
                setNewListName("");
              }}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="w-[92vw] max-w-md mx-auto rounded-2xl">
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          {historyEntries.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {historyEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{entry.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span className="line-through opacity-60">{entry.oldValue || "—"}</span>
                      <span className="mx-1">→</span>
                      <span className="text-primary">{entry.newValue}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" onClick={() => handleUndoHistory(entry, story)}>Undo</Button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground italic py-4 text-center">No history yet.</p>}
          {historyEntries.length > 0 && (
            <DialogFooter><Button variant="ghost" size="sm" onClick={clearHistory}>Clear History</Button></DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Related Stories */}
      <Dialog open={relatedDialog} onOpenChange={setRelatedDialog}>
        <DialogContent className="w-[92vw] max-w-md mx-auto rounded-2xl">
          <DialogHeader><DialogTitle>Related Stories</DialogTitle></DialogHeader>
          {relations.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
              {relations.map(rel => (
                <div key={rel.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                     <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${(REL_COLORS as any)[rel.type]}`}
                    >
                      {(REL_LABELS as any)[rel.type]}
                    </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${rel.mode === "local" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                        {rel.mode === "local" ? <><Database className="w-3 h-3 inline mr-0.5" />Local</> : <><Globe className="w-3 h-3 inline mr-0.5" />Mention</>}
                      </span>
                    </div>
                    {rel.mode === "local" && rel.relatedStoryId
                      ? <Link to={`/story/${rel.relatedStoryId}`} className="text-sm font-medium text-primary hover:underline truncate block">{rel.relatedTitle}</Link>
                      : rel.mode === "mention" && rel.relatedUrl
                      ? <a href={rel.relatedUrl} target="_blank" rel="noopener" className="text-sm font-medium text-primary hover:underline truncate block">{rel.relatedTitle}</a>
                      : <p className="text-sm font-medium text-foreground truncate">{rel.relatedTitle}</p>}
                  </div>
                  <button onClick={() => handleRemoveRelation(rel.id)} className="text-destructive hover:text-destructive/80 shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground italic mb-4">No related stories yet.</p>}
          <div className="border-t border-border pt-5 mt-4 space-y-3">
            <span className="text-xs text-muted-foreground font-semibold block">Add Related Story</span>
            <div className="flex gap-1">
              {(["local", "mention"] as const).map(m => (
                <button key={m} onClick={() => setNewRelMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors ${newRelMode === m ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}>
                  {m === "local" ? <><Database className="w-3.5 h-3.5" />Local DB</> : <><Globe className="w-3.5 h-3.5" />Mention + Link</>}
                </button>
              ))}
            </div>
            <div className="relative">
              <Input value={newRelTitle} onChange={e => handleRelTitleInput(e.target.value)} placeholder={newRelMode === "local" ? "Search title in library..." : "Story title"} className="bg-card text-sm" />
              {newRelMode === "local" && relSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {relSuggestions.map(s => (
                    <button key={s.id} onClick={() => { setNewRelStoryId(s.id); handleRelTitleInput(s.title); }} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {newRelMode === "mention" && <Input value={newRelUrl} onChange={e => setNewRelUrl(e.target.value)} placeholder="URL / hyperlink (optional)" className="bg-card text-sm" />}
            <div className="flex gap-2">
              <select value={newRelType} onChange={e => setNewRelType(e.target.value as any)} className="flex-1 h-9 rounded-md border border-border bg-card text-sm px-3 text-foreground">
                <option value="prequel">Prequel</option>
                <option value="sequel">Sequel</option>
                <option value="spin-off">Spin-off</option>
                <option value="related">Related</option>
              </select>
              <Button size="sm" onClick={handleAddRelation} disabled={!newRelTitle.trim()}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Bookmark */}
      <Dialog open={!!deleteBookmarkId} onOpenChange={open => { if (!open) setDeleteBookmarkId(null); }}>
        <DialogContent className="w-[92vw] sm:max-w-[380px] rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bookmark className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">Delete bookmark?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">This bookmark will be permanently deleted.</p>
            <div className="flex w-full gap-3 mt-6">
              <Button variant="secondary" className="flex-1 rounded-xl h-11" onClick={() => setDeleteBookmarkId(null)}>Cancel</Button>
              <Button className="flex-1 rounded-xl h-11 bg-red-500 hover:bg-red-600 text-white" onClick={() => {
                if (deleteBookmarkId) { removeBookmark(story.id, deleteBookmarkId); setDeleteBookmarkId(null); }
              }}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Story */}
      <Dialog open={deleteStoryDialog} onOpenChange={setDeleteStoryDialog}>
        <DialogContent className="sm:max-w-[380px] rounded-3xl border-border/60 bg-card/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl [&>button]:z-30">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-background to-background pointer-events-none" />
          <div className="relative z-10 px-6 pt-8 pb-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-5 shadow-lg shadow-destructive/10">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Delete Story?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-[260px]">This will permanently remove</p>
            <p className="mt-1 text-sm font-semibold text-foreground line-clamp-2 max-w-[260px]">"{story.title}"</p>
            <div className="mt-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <span className="text-[11px] font-medium text-destructive">This action cannot be undone</span>
            </div>
            <DialogFooter className="grid grid-cols-2 gap-3 mt-7 w-full">
              <Button variant="secondary" className="h-11 rounded-xl text-sm font-medium" onClick={() => setDeleteStoryDialog(false)}>Cancel</Button>
              <Button variant="destructive" className="h-11 rounded-xl text-sm font-semibold shadow-lg shadow-destructive/20" onClick={() => { deleteStory(story.id); navigate("/"); }}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note */}
      <Dialog open={!!deleteNoteId} onOpenChange={open => { if (!open) setDeleteNoteId(null); }}>
        <DialogContent className="w-[92vw] sm:max-w-[380px] rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4"><Trash2 className="w-7 h-7 text-red-500" /></div>
            <DialogTitle className="text-xl font-bold text-foreground">Delete note?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">This note will be permanently deleted.</p>
            <div className="flex w-full gap-3 mt-6">
              <Button variant="secondary" className="flex-1 rounded-xl h-11" onClick={() => setDeleteNoteId(null)}>Cancel</Button>
              <Button className="flex-1 rounded-xl h-11 bg-red-500 hover:bg-red-600 text-white" onClick={() => {
                if (deleteNoteId) { removeNote(story.id, deleteNoteId); setDeleteNoteId(null); }
              }}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Tag */}
      <Dialog open={!!deleteTagConfirm} onOpenChange={open => { if (!open) setDeleteTagConfirm(null); }}>
        <DialogContent className="w-[92vw] sm:max-w-[380px] rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4"><Trash2 className="w-7 h-7 text-red-500" /></div>
            <DialogTitle className="text-xl font-bold text-foreground">Delete tag?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">This tag will be permanently deleted.</p>
            <div className="flex w-full gap-3 mt-6">
              <Button variant="secondary" className="flex-1 rounded-xl h-11" onClick={() => setDeleteTagConfirm(null)}>Cancel</Button>
              <Button className="flex-1 rounded-xl h-11 bg-red-500 hover:bg-red-600 text-white" onClick={confirmDeleteExistingTag}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Arc */}
      <Dialog open={!!deleteArcId} onOpenChange={open => { if (!open) setDeleteArcId(null); }}>
        <DialogContent className="w-[92vw] sm:max-w-[380px] rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4"><Trash2 className="w-7 h-7 text-red-500" /></div>
            <DialogTitle className="text-xl font-bold text-foreground">Delete arc?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">This arc will be permanently deleted.</p>
            <div className="flex w-full gap-3 mt-6">
              <Button variant="secondary" className="flex-1 rounded-xl h-11" onClick={() => setDeleteArcId(null)}>Cancel</Button>
              <Button className="flex-1 rounded-xl h-11 bg-red-500 hover:bg-red-600 text-white" onClick={() => { if (deleteArcId) handleDeleteArc(deleteArcId); }}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Source Alert */}
      <Dialog open={noSourceDialog} onOpenChange={setNoSourceDialog}>
        <DialogContent className="w-[92vw] sm:max-w-[380px] rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">No source yet</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Add a source link first so JejakBaca knows where to send you.
            </p>
            <div className="flex w-full gap-3 mt-6">
              <Button variant="secondary" className="flex-1 rounded-xl h-11" onClick={() => setNoSourceDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-xl h-11" onClick={() => { setNoSourceDialog(false); setAddSourceDialog(true); }}>
                Add Source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Arc add/edit */}
      <Dialog open={arcDialog} onOpenChange={open => { if (!open) { setArcDialog(false); setEditingArc(null); } }}>
        <DialogContent className="w-[92vw] max-w-md mx-auto rounded-2xl">
          <DialogHeader><DialogTitle>{editingArc ? "Edit Arc" : "Add Arc"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={arcName} onChange={e => setArcName(e.target.value)} placeholder="Arc name (e.g. East Blue Arc)" className="bg-card" autoFocus />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block">Chapter Start</label>
                <Input value={arcStart} onChange={e => setArcStart(e.target.value)} type="number" step="0.1" placeholder="1" className="bg-card" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block">Chapter End (blank = ongoing)</label>
                <Input value={arcEnd} onChange={e => setArcEnd(e.target.value)} type="number" step="0.1" placeholder="100" className="bg-card" />
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Arc Color</label>
                <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 border border-border">
                  {(["auto", "manual"] as const).map(m => (
                    <button key={m} onClick={() => {
                      setArcColorMode(m);
                      if (m === "auto") { const palette = ARC_COLOR_PALETTES[arcColorPalette]; setArcColor(palette[arcs.length % palette.length]); }
                    }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${arcColorMode === m ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {m === "auto" ? "Auto" : "Manual"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5">
                {(["colorful", "mono"] as ArcColorPalette[]).map(p => (
                  <button key={p} onClick={() => {
                    setArcColorPalette(p);
                    if (arcColorMode === "auto") { const palette = ARC_COLOR_PALETTES[p]; setArcColor(palette[arcs.length % palette.length]); }
                  }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${arcColorPalette === p ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}>
                    {p === "colorful" ? "Colorful" : "Mono"}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {ARC_COLOR_PALETTES[arcColorPalette].map((c, i) => {
                  const currentAutoColor = ARC_COLOR_PALETTES[arcColorPalette][arcs.length % ARC_COLOR_PALETTES[arcColorPalette].length];
                  const isSelected = arcColorMode === "manual" ? arcColor === c : currentAutoColor === c;
                  return (
                    <button key={i} onClick={() => { setArcColorMode("manual"); setArcColor(c); }}
                      className={`w-7 h-7 rounded-full transition-all shrink-0 ${isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "opacity-80 hover:opacity-100 hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  );
                })}
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-secondary/50">
                <div className="w-5 h-5 rounded-full shadow-md shrink-0 ring-1 ring-white/20"
                  style={{ backgroundColor: arcColorMode === "auto" ? ARC_COLOR_PALETTES[arcColorPalette][arcs.length % ARC_COLOR_PALETTES[arcColorPalette].length] : arcColor }} />
                <p className="text-[10px] text-muted-foreground flex-1">{arcColorMode === "auto" ? `Auto • ${arcColorPalette} palette` : "Manually picked"}</p>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Description (optional)</label>
              <textarea value={arcDesc} onChange={e => setArcDesc(e.target.value)} placeholder="What happens in this arc?" className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={() => { haptic("medium"); handleSaveArc(); }} disabled={!arcName.trim() || !arcStart}>{editingArc ? "Update" : "Add Arc"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Country */}
      <Dialog open={countryDialog} onOpenChange={setCountryDialog}>
        <DialogContent className="w-[92vw] max-w-md mx-auto rounded-2xl">
          <DialogHeader><DialogTitle>Origin Country</DialogTitle></DialogHeader>
          <div className="relative mb-4">
            <Input placeholder="Search country (e.g. Japan, ID, USA)..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="pl-9" />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
            {countrySearch === "" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider pl-1">Popular</p>
                <div className="grid grid-cols-4 gap-2">
                  {POPULAR_COUNTRIES.map(code => {
                    const country = ALL_COUNTRIES.find(c => c.code === code);
                    if (!country) return null;
                    return (
                      <button key={country.code} onClick={() => { updateStory(story.id, { originCountry: country.code }); setCountryDialog(false); }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all hover:bg-secondary h-16 justify-center ${story.originCountry === country.code ? "border-primary bg-primary/5" : "border-border"}`}>
                        <span className={`fi fi-${country.code.toLowerCase()} w-8 h-6 rounded-sm inline-block`} />
                        <span className="text-[10px] text-muted-foreground font-medium">{country.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {countrySearch.trim() !== "" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider pl-1">Search Results</p>
                <div className="space-y-1">
                  {ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase())).map(country => (
                    <button key={country.code} onClick={() => { updateStory(story.id, { originCountry: country.code }); setCountrySearch(""); setCountryDialog(false); }}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all hover:bg-secondary text-left ${story.originCountry === country.code ? "border-primary bg-primary/5" : "border-border"}`}>
                      <span className={`fi fi-${country.code.toLowerCase()} w-8 h-6 rounded-sm inline-block shrink-0`} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{country.name}</p><p className="text-[10px] text-muted-foreground">{country.code}</p></div>
                      {story.originCountry === country.code && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {story.originCountry && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { updateStory(story.id, { originCountry: "" }); setCountryDialog(false); }}>Clear Selection</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ GENRE PICKER ════════════════════════════════════════════════════ */}
      <GenrePickerModal
        open={genrePickerOpen}
        onClose={() => setGenrePickerOpen(false)}
        selectedGenres={story.genres || []}
        onToggleGenre={handleToggleGenre}
      />

      {/* ═══ IMAGE CROPPERS ══════════════════════════════════════════════════ */}
      {story.headerUrl && (
        <div onClick={e => e.stopPropagation()}>
          <ImageCropper
            open={headerCropOpen}
            onOpenChange={open => { if (!open) setHeaderCropOpen(false); }}
            imageSrc={story.headerUrl}
            aspect={16 / 5}
            title="Reposition Header"
            onCropComplete={async croppedBase64 => {
              try {
                const file = base64ToFile(croppedBase64, `header-crop-${Date.now()}.jpg`);
                const publicUrl = await uploadToStorage(file, "headers");
                updateStory(story.id, { headerUrl: publicUrl });
                setHeaderCropOpen(false);
              } catch (err) { console.error("Header Crop Error:", err); }
            }}
          />
        </div>
      )}
      {story.coverUrl && (
        <div onClick={e => e.stopPropagation()}>
          <ImageCropper
            open={coverCropOpen}
            onOpenChange={open => { if (!open) setCoverCropOpen(false); }}
            imageSrc={story.coverUrl}
            aspect={3 / 4}
            title="Reposition Cover"
            onCropComplete={async croppedBase64 => {
              try {
                const file = base64ToFile(croppedBase64, `cover-crop-${Date.now()}.jpg`);
                const publicUrl = await uploadToStorage(file, "covers");
                updateStory(story.id, { coverUrl: publicUrl });
                setCoverCropOpen(false);
              } catch (err) { console.error("Cover Crop Error:", err); }
            }}
          />
        </div>
      )}

      {/* ═══ LIGHTBOXES ══════════════════════════════════════════════════════ */}
      {coverLightbox && story.coverUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setCoverLightbox(false)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={e => { e.stopPropagation(); setCoverLightbox(false); }}>
            <X className="w-5 h-5" />
          </button>
          <img src={story.coverUrl} alt={story.title} className="h-[80vh] sm:h-screen w-auto max-w-[92vw] sm:max-w-[95vw] object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
      {headerLightbox && story.headerUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setHeaderLightbox(false)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={e => { e.stopPropagation(); setHeaderLightbox(false); }}>
            <X className="w-5 h-5" />
          </button>
          <img src={story.headerUrl} alt="header" className="h-[80vh] sm:h-screen w-auto max-w-[92vw] sm:max-w-[95vw] object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ═══ FLOATING UI ═════════════════════════════════════════════════════ */}
      {prevStory && (
        <button onClick={() => handleNavigateStory(prevStory.id)} className="fixed left-2 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 opacity-40 sm:opacity-0 hover:opacity-100 transition-all duration-300 group shadow-xl" title={`Previous: ${prevStory.title}`}>
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}
      {nextStory && (
        <button onClick={() => handleNavigateStory(nextStory.id)} className="fixed right-2 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 opacity-40 sm:opacity-0 hover:opacity-100 transition-all duration-300 group shadow-xl" title={`Next: ${nextStory.title}`}>
          <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {ctaPreference === "floating" && !anyDialogOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
          <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded mb-1 opacity-0 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto" id="read-tooltip">
            Press N to continue
          </div>
          <button
            onClick={handleReadNow}
            onMouseEnter={() => document.getElementById("read-tooltip")?.classList.remove("opacity-0")}
            onMouseLeave={() => document.getElementById("read-tooltip")?.classList.add("opacity-0")}
            className="pointer-events-auto flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-primary to-primary/90 text-primary-foreground border border-white/20 shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/60 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 font-semibold text-sm"
          >
            <BookOpen className="w-5 h-5" />
            <span>Continue Reading</span>
          </button>
        </div>
      )}

      <div className="fixed bottom-4 left-4 z-40 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="bg-card/90 backdrop-blur border border-border p-2 rounded text-[9px] text-muted-foreground space-y-1 shadow-lg">
          <div><span className="font-bold text-foreground">N</span> : Update Chapter</div>
          <div><span className="font-bold text-foreground">S</span> : Save Note</div>
          <div><span className="font-bold text-foreground">R</span> : Rate Story</div>
          <div><span className="font-bold text-foreground">Esc</span> : Back</div>
          <div><span className="font-bold text-foreground">←/→</span> : Nav Story</div>
        </div>
      </div>
    </div>
  );
}
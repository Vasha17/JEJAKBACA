import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useStories } from "@/lib/StoryContext";
import { StoryStatus, getGlobalTags } from "@/lib/types";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { Textarea } from "@/component/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogClose,
} from "@/component/ui/dialog";
import {
  ArrowLeft, BookOpen, Bookmark, FileText, Plus, Trash2, Pencil,
  Star, List, X, ExternalLink, Upload, Eye, Sparkles, Loader2,
  CheckCircle2, XCircle, AlertCircle, History, GitBranch, Bell,
  Database, Globe, Image, RefreshCw, Zap, ChevronLeft, ChevronRight,
  MoreHorizontal, Search, HelpCircle,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { RichTextEditor, RichTextDisplay } from "@/component/RichTextEditor";
import { ImageCropper } from "@/component/ImageCropper";
import "flag-icons/css/flag-icons.min.css";
import { useLocation } from "react-router-dom";

// ── Local imports ─────────────────────────────────────────────────────────────
import { StoryDetailSkeleton }             from "./components/StoryDetailSkeleton";
import { GenrePickerModal }                from "./components/GenrePickerModal";
import {
  STATUS_OPTIONS, statusColor,
  REL_LABELS, REL_COLORS,
  ARC_COLOR_PALETTES, ARC_COLORS,
  DEMOGRAPHIC_INFO, DEMOGRAPHIC_ICONS,
  type ArcColorPalette,
} from "./constants/status";
import { ALL_COUNTRIES, POPULAR_COUNTRIES } from "./constants/countries";
import {
  lsGet, lsSet, normalizeTag, haptic,
  base64ToFile,
  loadArcs, saveArcs,
  type Arc,
} from "./utils/helpers";
import { computePrediction, pushCHLog }      from "./hooks/useChapterPrediction";
import { useStoryHistory, pushHistory }      from "./hooks/useStoryHistory";
import { useStoryRelations, loadRelations }  from "./hooks/useStoryRelations";
import { usePullToRefresh }                  from "./hooks/usePullToRefresh";
import { useKeyboardShortcuts }              from "./hooks/useKeyboardShortcuts";

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

export default function StoryDetail() {
  const { id }   = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
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

  // ── Mobile Detection ────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── CTA preference ──────────────────────────────────────────────────────────
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

  // ── Dialog states ───────────────────────────────────────────────────────────
  const [coverDialog, setCoverDialog]               = useState(false);
  const [headerDialog, setHeaderDialog]             = useState(false);
  const [headerDialogTouchStart, setHeaderDialogTouchStart] = useState(0);
  const [coverDialogTouchStart, setCoverDialogTouchStart]   = useState(0);
  const [ratingDialog, setRatingDialog]             = useState(false);
  const [notesDialog, setNotesDialog]               = useState(false);
  const [listsDialog, setListsDialog]               = useState(false);
  const [bookmarkDialog, setBookmarkDialog]         = useState(false);
  const [sourceDialog, setSourceDialog]             = useState(false);
  const [addSourceDialog, setAddSourceDialog]       = useState(false);
  const [synopsisEditDialog, setSynopsisEditDialog] = useState(false);
  const [mediaDialog, setMediaDialog]               = useState(false);
  const [headerCropOpen, setHeaderCropOpen]         = useState(false);
  const [coverCropOpen, setCoverCropOpen]           = useState(false);
  const [historyDialog, setHistoryDialog]           = useState(false);
  const [relatedDialog, setRelatedDialog]           = useState(false);
  const [statusDialog, setStatusDialog]             = useState(false);
  const [deleteNoteId, setDeleteNoteId]             = useState<string | null>(null);
  const [mediaLightbox, setMediaLightbox]           = useState<{ url: string; label: string; id: string } | null>(null);
  const [editingMediaLabel, setEditingMediaLabel]   = useState("");
  const [updateBellDialog, setUpdateBellDialog]     = useState(false);
  const [chapterTooltip, setChapterTooltip]         = useState(false);
  const [moreDialog, setMoreDialog]                 = useState(false);
  const [editingNote, setEditingNote]               = useState<any | null>(null);
  const [countryDialog, setCountryDialog]           = useState(false);
  const [countrySearch, setCountrySearch]           = useState("");
  const [deleteStoryDialog, setDeleteStoryDialog]   = useState(false);
  const [arcDialog, setArcDialog]                   = useState(false);
  const [editingArc, setEditingArc]                 = useState<Arc | null>(null);
  const [deleteArcId, setDeleteArcId]               = useState<string | null>(null);
  const [coverLightbox, setCoverLightbox]           = useState(false);
  const [headerLightbox, setHeaderLightbox]         = useState(false);

  // ── Form states ─────────────────────────────────────────────────────────────
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

  // ── Inline edit states ──────────────────────────────────────────────────────
  const [editingTitle, setEditingTitle]         = useState(false);
  const [editingAltTitle, setEditingAltTitle]   = useState(false);
  const [editingAuthor, setEditingAuthor]       = useState(false);
  const [editingChapter, setEditingChapter]     = useState(false);
  const [titleValue, setTitleValue]             = useState("");
  const [altTitleValue, setAltTitleValue]       = useState("");
  const [authorValue, setAuthorValue]           = useState("");
  const [chapterValue, setChapterValue]         = useState("");
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  // ── Tag states ──────────────────────────────────────────────────────────────
  const [newTag, setNewTag]                     = useState("");
  const [tagMode, setTagMode]                   = useState<"manual" | "existing" | "suggested">("manual");
  const [suggestedTags, setSuggestedTags]       = useState<string[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [tagRefresh, setTagRefresh]             = useState(0);  

  // ── Source edit states ──────────────────────────────────────────────────────
  const [editSrcId, setEditSrcId]                 = useState<string | null>(null);
  const [editSrcChapter, setEditSrcChapter]       = useState("");
  const [editSrcUrl, setEditSrcUrl]               = useState("");
  const [editSrcName, setEditSrcName]             = useState("");
  const [editSrcLang, setEditSrcLang]             = useState("");
  const [sourcesKey, setSourcesKey]               = useState(0);
  const [srcNameSuggestion, setSrcNameSuggestion] = useState("");

  // ── Genre states ────────────────────────────────────────────────────────────
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [genreExpanded, setGenreExpanded]     = useState(false);

  // ── Arc states ──────────────────────────────────────────────────────────────
  const [arcs, setArcs]                       = useState<Arc[]>([]);
  const [arcName, setArcName]                 = useState("");
  const [arcStart, setArcStart]               = useState("");
  const [arcEnd, setArcEnd]                   = useState("");
  const [arcDesc, setArcDesc]                 = useState("");
  const [arcColor, setArcColor]               = useState(ARC_COLORS[0]);
  const [arcColorPalette, setArcColorPalette] = useState<ArcColorPalette>("colorful");
  const [arcColorMode, setArcColorMode]       = useState<"auto" | "manual">("auto");

  // ── Tab state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"notes" | "timeline">(() =>
    lsGet<"notes" | "timeline">(`tab_pref_${id}`, "notes")
  );
  const handleTabChange = (tab: "notes" | "timeline") => {
    setActiveTab(tab); lsSet(`tab_pref_${id}`, tab);
  };

  // ── Link checker ────────────────────────────────────────────────────────────
  const [linkStatuses, setLinkStatuses] = useState<Record<string, { ok: boolean; checking: boolean; statusText: string }>>({});

  // ── Notification tracking ───────────────────────────────────────────────────
  const [trackedSourceIds, setTrackedSourceIds] = useState<string[]>([]);

  // ── Lists state ─────────────────────────────────────────────────────────────
  const [customLists, setCustomLists] = useState<any[]>(() => {
    return safeGet<any[]>("my_reading_lists", []);
  });

  // ── Loading state ───────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const mediaFileRef  = useRef<HTMLInputElement>(null);
  const coverFileRef  = useRef<HTMLInputElement>(null);
  const headerFileRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // ALL useEffect HOOKS 
  // ═══════════════════════════════════════════════════════════════════════════

  // Loading timer
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 150);
    return () => clearTimeout(t);
  }, [id]);

  // CTA preference storage listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "jejakbaca_cta_pref" && (e.newValue === "floating" || e.newValue === "inside"))
        setCtaPreference(e.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Load tracked sources
  useEffect(() => {
    if (!id) return;
    try {
      const loaded = safeGet<string[]>(`tracked_sources_${id}`, []);
      setTrackedSourceIds(loaded);
    } catch (e) {
      console.warn("Gagal load tracked sources", e);
    }
  }, [id]);

  // Load arcs
  useEffect(() => {
    if (!id) return;
    try {
      const loaded = loadArcs(id);
      setArcs(loaded);
    } catch (e) {
      console.warn("Gagal load arcs (storage blocked?)", e);
      setArcs([]);
    }
  }, [id]);

  // ── Hooks (custom) ───────────────────────────────────────────────────────────
  const { isRefreshing, pullDelta, PULL_THRESHOLD, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh();

  const { historyEntries, handleOpenHistory, handleUndoHistory, clearHistory } =
    useStoryHistory(story?.id || "", updateStory);

  const {
    relations, newRelTitle, newRelType, newRelMode, newRelUrl, relSuggestions,
    setNewRelType, setNewRelMode, setNewRelStoryId, setNewRelUrl,
    handleOpenRelated, handleRelTitleInput, handleAddRelation, handleRemoveRelation,
  } = useStoryRelations(story?.id || "", stories);
  

  // ── Navigation ──────────────────────────────────────────────────────────────
  const allStories = (stories || []).filter((s: any) => !s.hidden);
  const currentIndex = allStories.findIndex((s: any) => s.id === story?.id);
  const prevStory    = currentIndex > 0 ? allStories[currentIndex - 1] : null;
  const nextStory    = currentIndex < allStories.length - 1 ? allStories[currentIndex + 1] : null;

  const handleNavigateStory = (targetId: string) => {
    navigate(`/story/${targetId}`);
    window.scrollTo(0, 0);
  };

  // ── Chapter update ──────────────────────────────────────────────────────────
  const handleChapterUpdate = useCallback((ch: number) => {
    if (!story) return;
    pushHistory(story.id, {
      type: "chapter", label: "Chapter updated",
      oldValue: String(story.currentChapter), newValue: String(ch),
    });
    pushCHLog(story.id, ch);
    updateStory(story.id, { currentChapter: ch, chapterUpdatedAt: new Date().toISOString() });
  }, [story, updateStory]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
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
      try {
        lsSet(`tracked_sources_${story.id}`, next);
      } catch (e) { console.warn("Storage blocked"); }
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EARLY RETURNS
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ── Derived values ──────────────────────────────────────────────────────────
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

  // ── Handlers ────────────────────────────────────────────────────────────────
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
    if (!tag || storyTagsNorm.includes(tag)) return;
    addTagToStory(story.id, tag); setNewTag("");
  };

  const handleDeleteExistingTag = (tag: string) => {
    const existing: string[] = lsGet("global_tags", []);
    lsSet("global_tags", existing.filter((t: string) => t !== tag));
    setTagRefresh(r => r + 1);
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
    const stripped = noteContent.replace(/<[^>]+>/g, "").trim();
    if (!stripped) return;
    if (editingNote) {
      const updatedNotes = (story.notes || []).map((n: any) =>
        n.id === editingNote.id ? { ...n, text: noteContent } : n
      );
      updateStory(story.id, { notes: updatedNotes });
    } else {
      addNote(story.id, noteContent);
    }
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
      const upd = (story.sources || []).map((s: any) => s.id === editSrcId
        ? { ...s, name: editSrcName.trim(), url: editSrcUrl.trim(), language: editSrcLang.trim().toUpperCase(), currentChapter: parseInt(editSrcChapter) || 0 }
        : s);
      updateStory(story.id, { sources: upd });
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
      alert("There is no source link for this story yet."); return;
    }
    const best = [...story.sources].sort((a: any, b: any) => (b.currentChapter || 0) - (a.currentChapter || 0))[0];
    window.open(best.url, "_blank");
  };

  const handleTagClick = (tag: string) => {
    navigate(`/?tags=${encodeURIComponent(normalizeTag(tag))}`);
  };

  // ── Arc handlers ────────────────────────────────────────────────────────────
  const handleOpenArcDialog = (arc?: Arc) => {
    if (arc) {
      setEditingArc(arc); setArcName(arc.name);
      setArcStart(String(arc.chapterStart)); setArcEnd(arc.chapterEnd ? String(arc.chapterEnd) : "");
      setArcColor(arc.color); setArcDesc(arc.description);
    } else {
      setEditingArc(null); setArcName(""); setArcStart(""); setArcEnd(""); setArcDesc("");
      // Auto color logic uses current palette length
      if (arcColorMode === "auto") {
        const palette = ARC_COLOR_PALETTES[arcColorPalette];
        setArcColor(palette[arcs.length % palette.length]);
      }
    }
    setArcDialog(true);
  };

  const handleMoveArc = (arcId: string, direction: "up" | "down") => {
  const sorted = [...arcs]
    .map((a, i) => ({ ...a, order: a.order ?? i })) // fix arc lama yang order-nya undefined
    .sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(a => a.id === arcId);
  if (direction === "up" && idx === 0) return;
  if (direction === "down" && idx === sorted.length - 1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  const updated = [...sorted];
  [updated[idx].order, updated[swapIdx].order] = [updated[swapIdx].order, updated[idx].order];
  saveArcs(story.id, updated);
  setArcs(updated);
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

  const handleOpenListsDialog = () => {
    const lists = safeGet<any[]>("my_reading_lists", []);
    setCustomLists(lists);
    setListsDialog(true);
  };

  const isTouchDevice = typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const anyDialogOpen = coverDialog || headerDialog || ratingDialog || notesDialog || 
  listsDialog || bookmarkDialog || sourceDialog || addSourceDialog || 
  synopsisEditDialog || moreDialog || arcDialog || statusDialog;

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-background relative animate-in fade-in slide-in-from-bottom-1 duration-200"
      key={story.id}
      {...(isTouchDevice ? { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd } : {})}
    >
      {/* Pull to refresh indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center transition-all duration-200 pointer-events-none"
        style={{ height: pullDelta > 0 ? `${pullDelta}px` : 0, overflow: "hidden" }}
      >
        <div className={`flex items-center gap-2 text-xs text-muted-foreground bg-card/90 px-3 py-1.5 rounded-full border border-border shadow-sm ${isRefreshing ? "opacity-100" : pullDelta >= PULL_THRESHOLD ? "opacity-100" : "opacity-70"}`}>
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
            style={!isRefreshing ? { transform: `rotate(${Math.round((pullDelta / PULL_THRESHOLD) * 180)}deg)` } : {}}
          />
          <span>{isRefreshing ? "Refreshing..." : pullDelta >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>

      {/* ═══ HERO ══════════════════════════════════════════════════════════════ */}
      <div className="relative">
        <div className="h-48 sm:h-64 relative overflow-hidden bg-secondary group cursor-zoom-in" onClick={() => story.headerUrl && setHeaderLightbox(true)}>
          {story.headerUrl ? (
            <img src={`${story.headerUrl}?width=1920&quality=100`} alt="" className="w-full h-full object-cover"/>
          ) : story.coverUrl ? (
            <img src={story.coverUrl} alt="" className="w-full h-full object-cover opacity-30 blur-xl scale-110"/>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-card"/>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"/>
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">            
             {fromListId ? (
                <Link 
                  to={`/lists/${fromListId}`} 
                  className="p-2 rounded-md bg-card/80 hover:bg-card border border-border transition-colors"
                  title="Back to List"
                >
                  <ArrowLeft className="w-4 h-4 text-foreground"/>
                </Link>
              ) : (
                <button 
                  onClick={() => navigate("/")} 
                  className="p-2 rounded-md bg-card/80 hover:bg-card border border-border transition-colors"
                  title="Back to Library"
                >
                  <ArrowLeft className="w-4 h-4 text-foreground"/>
                </button>
              )}
          <div className="flex gap-2">
            {!isMobile ? (
              <Dialog open={headerDialog} onOpenChange={setHeaderDialog}>
                <DialogTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHeaderUrlValue(story.headerUrl || ""); }}
                    className="px-3 py-1 text-xs rounded bg-card/80 text-foreground hover:bg-card border border-border"
                  >
                    Edit Header
                  </button>
                </DialogTrigger>
                <DialogContent className="w-[92vw] max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Edit Header Image</DialogTitle>
                  </DialogHeader>
                  <Input value={headerUrlValue} onChange={e => setHeaderUrlValue(e.target.value)} placeholder="Paste image URL..."/>
                  <Button variant="outline" onClick={() => headerFileRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1"/>Upload
                  </Button>
                  <input ref={headerFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderFileUpload}/>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost" onClick={(e) => e.stopPropagation()}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={(e) => { e.stopPropagation(); updateStory(story.id, { headerUrl: headerUrlValue }); setHeaderDialog(false); }}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <>
                {headerDialog && (
                  <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHeaderDialog(false)} />
                    <div
                      className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        maxHeight: "92vh",
                        background: "hsl(var(--card))",
                        borderTop: "1px solid hsl(var(--border))",
                        boxShadow: "0 -24px 60px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div
                        className="flex justify-center pt-3 shrink-0 cursor-grab active:cursor-grabbing"
                        onTouchStart={(e) => setHeaderDialogTouchStart(e.touches[0].clientY)}
                        onTouchEnd={(e) => {
                          const diff = e.changedTouches[0].clientY - headerDialogTouchStart;
                          if (diff > 80) setHeaderDialog(false);
                        }}
                      >
                        <div className="w-10 h-1 rounded-full bg-border" />
                      </div>
                      <div className="px-4 py-3 border-b border-border/50">
                        <h2 className="text-lg font-semibold text-foreground">Edit Header Image</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <Input value={headerUrlValue} onChange={e => setHeaderUrlValue(e.target.value)} placeholder="Paste image URL..."/>
                        <Button variant="outline" onClick={() => headerFileRef.current?.click()} className="w-full">
                          <Upload className="w-3.5 h-3.5 mr-1"/>Upload
                        </Button>
                        <input ref={headerFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderFileUpload}/>
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" className="flex-1" onClick={(e) => { e.stopPropagation(); setHeaderDialog(false); }}>Cancel</Button>
                          <Button className="flex-1" onClick={(e) => { e.stopPropagation(); updateStory(story.id, { headerUrl: headerUrlValue }); setHeaderDialog(false); }}>Save</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setHeaderUrlValue(story.headerUrl || ""); setHeaderDialog(true); }}
                  className="px-3 py-1 text-xs rounded bg-card/80 text-foreground hover:bg-card border border-border"
                >
                  Edit Header
                </button>
              </>
            )}
            {story.headerUrl && (
              <button onClick={(e) => { e.stopPropagation(); setHeaderCropOpen(true); }} className="px-3 py-1 text-xs rounded bg-card/80 text-foreground hover:bg-card border border-border">
                Reposition
              </button>
            )}
          </div>

            {story.headerUrl && (  
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>                  
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cover + meta */}
        <div className="relative px-3 sm:px-6 -mt-24 sm:-mt-40 flex flex-row gap-3 sm:gap-6 items-start">
          <div className="w-[105px] sm:w-44 shrink-0 z-20">
            <div 
              className="aspect-[3/4] rounded-xl overflow-hidden bg-card border-2 border-border shadow-xl cursor-zoom-in relative group"
              onClick={() => story.coverUrl && setCoverLightbox(true)}
            >
              {story.coverUrl
                ? <>
                    <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:group-active:opacity-100 active:opacity-100 transition-opacity bg-black/20">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                      </div>
                    </div>
                  </>
                : <div className="w-full h-full flex items-center justify-center bg-secondary"><BookOpen className="w-12 h-12 text-muted-foreground/30"/></div>}
            </div>
            <div className="flex gap-1 mt-2 justify-center">
              {!isMobile ? (
                <Dialog open={coverDialog} onOpenChange={setCoverDialog}>
                  <DialogTrigger asChild>
                    <button onClick={() => setCoverUrlValue(story.coverUrl || "")} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted">Edit Cover</button>
                  </DialogTrigger>
                  <DialogContent className="w-[92vw] max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader><DialogTitle>Edit Cover</DialogTitle></DialogHeader>
                    <Input value={coverUrlValue} onChange={e => setCoverUrlValue(e.target.value)} placeholder="Paste image URL..."/>
                    <Button variant="outline" onClick={() => coverFileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1"/>Upload</Button>
                    <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload}/>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                      </DialogClose>
                      <Button onClick={() => { 
                        const updates: any = { coverUrl: coverUrlValue };
                        if (!story.headerUrl) updates.headerUrl = coverUrlValue;
                        updateStory(story.id, updates); setCoverDialog(false); 
                      }}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <>
                  {coverDialog && (
                    <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCoverDialog(false)} />
                      <div
                        className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          maxHeight: "auto",
                          background: "hsl(var(--card))",
                          borderTop: "1px solid hsl(var(--border))",
                          boxShadow: "0 -24px 60px rgba(0,0,0,0.4)",
                        }}
                      >
                        <div
                          className="flex justify-center pt-3 shrink-0 cursor-grab active:cursor-grabbing"
                          onTouchStart={(e) => setCoverDialogTouchStart(e.touches[0].clientY)}
                          onTouchEnd={(e) => {
                            const diff = e.changedTouches[0].clientY - coverDialogTouchStart;
                            if (diff > 80) setCoverDialog(false);
                          }}
                        >
                          <div className="w-10 h-1 rounded-full bg-border" />
                        </div>
                        <div className="px-4 py-3 border-b border-border/50">
                          <h2 className="text-lg font-semibold text-foreground">Edit Cover</h2>
                        </div>
                        <div className="p-4 space-y-3">
                          <Input value={coverUrlValue} onChange={e => setCoverUrlValue(e.target.value)} placeholder="Paste image URL..."/>
                          <Button variant="outline" onClick={() => coverFileRef.current?.click()} className="w-full"><Upload className="w-3.5 h-3.5 mr-1"/>Upload</Button>
                          <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload}/>
                          <div className="flex gap-2 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={() => setCoverDialog(false)}>Cancel</Button>
                            <Button className="flex-1" onClick={() => { updateStory(story.id, { coverUrl: coverUrlValue }); setCoverDialog(false); }}>Save</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { setCoverUrlValue(story.coverUrl || ""); setCoverDialog(true); }}
                    className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted"
                  >
                    Edit Cover
                  </button>
                </>
              )}
              {story.coverUrl && (
                <button onClick={() => setCoverCropOpen(true)} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted">Reposition</button>
              )}
            </div>           
          </div>

          <div className="flex-1 z-10 pb-2 sm:pt-8 space-y-2">
            {/* Title row */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { title: titleValue }); setEditingTitle(false); }} className="flex gap-2">
                    <Input value={titleValue} onChange={e => setTitleValue(e.target.value)} className="text-xl font-bold bg-card h-auto py-1" autoFocus/>
                    <Button size="sm" type="submit">Save</Button>
                  </form>
                ) : (
                  <h1
                    className="text-xl sm:text-4xl font-bold text-foreground cursor-pointer hover:text-primary/80 transition-colors line-clamp-2 leading-tight"
                    onClick={() => { setTitleValue(story.title); setEditingTitle(true); }}
                  >
                    {story.title}
                  </h1>
                )}
                {editingAltTitle ? (
                  <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { altTitle: altTitleValue }); setEditingAltTitle(false); }} className="flex gap-2 mt-1">
                    <Input value={altTitleValue} onChange={e => setAltTitleValue(e.target.value)} className="text-xs bg-card h-7" autoFocus/>
                    <Button size="sm" className="h-7" type="submit">Save</Button>
                  </form>
                ) : (
                  <p
                    className={`text-xs sm:text-sm mt-1 cursor-pointer transition-colors ${story.altTitle ? "text-muted-foreground opacity-70 hover:opacity-100 hover:text-foreground" : "text-muted-foreground/30 hover:text-muted-foreground/60 italic"}`}
                    onClick={() => { setAltTitleValue(story.altTitle || ""); setEditingAltTitle(true); }}
                  >
                    {story.altTitle || " no alternative title "}
                  </p>
                )}
                {editingAuthor ? (
                  <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { author: authorValue }); setEditingAuthor(false); }} className="flex gap-2 mt-1">
                    <Input value={authorValue} onChange={e => setAuthorValue(e.target.value)} className="text-xs bg-card h-7" autoFocus/>
                    <Button size="sm" className="h-7" type="submit">Save</Button>
                  </form>
                ) : (
                  <p
                    className={`text-sm mt-1 cursor-pointer transition-colors ${story.author ? "text-foreground/80 hover:text-primary" : "text-muted-foreground/40 hover:text-muted-foreground italic"}`}
                    onClick={() => { setAuthorValue(story.author || ""); setEditingAuthor(true); }}
                  >
                    {story.author || "Unknown Author"}
                  </p>
                )}
              </div>

              {/* Rating + Country */}
              <div className="flex flex-col items-end gap-1 shrink-0 max-w-[72px]">
                <button onClick={() => setRatingDialog(true)} className="shrink-0 flex flex-col items-end group transition-transform hover:scale-105">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star size={20} className={story.rating > 0 ? "fill-current" : "fill-transparent stroke-current"}/>
                    <span className="text-2xl font-bold leading-none">{story.rating || "-"}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Rating</span>
                </button>
                <button onClick={() => setCountryDialog(true)} className="text-2xl hover:scale-110 active:scale-95 transition-all duration-200 opacity-80 hover:opacity-100" title="Set Origin Country">
                  {story.originCountry
                    ? <span className={`fi fi-${story.originCountry.toLowerCase()}`} style={{ width: "28px", height: "20px", display: "inline-block", borderRadius: "3px" }}/>
                    : <Globe className="w-5 h-5 text-muted-foreground"/>}
                </button>
              </div>
            </div>

            {/* Status + Chapter row */}
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border/50 mt-2">
              {currentStatus && (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border"
                  style={{ backgroundColor: `${currentStatus.color}20`, color: currentStatus.color, borderColor: `${currentStatus.color}40` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentStatus.color }}/>
                  {currentStatus.label}
                </span>
              )}

              <div className="flex items-center gap-2 flex-1 group/chapter relative">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }}/>
                {editingChapter ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      const ch = Math.max(0.5, parseFloat(chapterValue) || 1);
                      handleChapterUpdate(ch); setEditingChapter(false);
                    }}
                    className="flex gap-2 items-center w-full"
                  >
                    <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">Ch.</span>
                    <Input value={chapterValue} onChange={e => setChapterValue(e.target.value)} type="number" step="0.5" className="w-16 h-7 text-xs bg-card" autoFocus/>
                    <Button size="sm" type="submit" className="h-7">Save</Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="font-semibold text-xs sm:text-sm text-foreground">Chapter {story.currentChapter}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      {hasUpdates && (
                        <Dialog open={updateBellDialog} onOpenChange={setUpdateBellDialog}>
                          <DialogTrigger asChild>
                            <button className="relative p-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors">
                              <Bell size={16} className="animate-pulse"/>
                              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card"/>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="w-[92vw] sm:max-w-md border-emerald-500/50 bg-gradient-to-br from-emerald-900 to-slate-900 text-white shadow-2xl shadow-emerald-500/20 overflow-hidden">
                            <DialogHeader className="relative z-10 pb-2">
                              <div className="absolute -top-10 -right-10 text-emerald-500/10 opacity-50 pointer-events-none">
                                <Bell size={120} strokeWidth={1}/>
                              </div>
                              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"/>
                                </span>
                                Updates Available!
                              </DialogTitle>
                              <p className="text-sm text-emerald-100/80 mt-1">
                                {trackedSourcesWithUpdates.length} source(s) ahead. You are behind by{" "}
                                <span className="text-emerald-300 font-bold">+{maxChaptersAhead} chapters</span>.
                              </p>
                            </DialogHeader>
                            <div className="space-y-3 relative z-10">
                              <div className="space-y-2 pt-2">
                                {trackedSourcesWithUpdates.map((src: any) => {
                                  const diff = (src.currentChapter || 0) - (story.currentChapter || 0);
                                  return (
                                    <div key={src.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 hover:bg-emerald-950/60 transition-colors group">
                                      <span className="text-xs font-semibold text-emerald-50">{src.name}</span>
                                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                        +{diff}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <button onClick={() => { setChapterValue(String(story.currentChapter)); setEditingChapter(true); }} className="px-2 py-1 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted border border-border">Edit</button>
                      <button onClick={() => { haptic("medium"); handleChapterUpdate(story.currentChapter + 1); }} className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/80 active:scale-90 active:bg-primary/70 font-medium transition-all duration-150">+1</button>
                    </div>
                  </div>
                )}
                <div
                  className="absolute bottom-full left-0 mb-2 w-max max-w-[200px] p-2 rounded-lg bg-black/90 border border-border shadow-xl text-[10px] text-muted-foreground opacity-0 group-hover/chapter:opacity-100 transition-opacity pointer-events-none z-50"
                  onTouchStart={() => { if (!editingChapter) setTimeout(() => setChapterTooltip(true), 500); }}
                  onTouchEnd={() => setChapterTooltip(false)}
                >
                  <p className="font-bold text-foreground mb-0.5">Current Progress</p>
                  <p>Chapter {story.currentChapter}</p>
                  <p className="mt-0.5 text-primary">Updated: {format(new Date(story.chapterUpdatedAt), "MMM d, yyyy")}</p>
                </div>
                {chapterTooltip && !editingChapter && (
                  <div className="absolute bottom-full left-0 mb-2 w-max max-w-[200px] p-2 rounded-lg bg-popover border border-border shadow-xl text-[10px] text-muted-foreground z-50 animate-in fade-in slide-in-from-bottom-1">
                    <p className="font-bold text-foreground mb-0.5">Current Progress</p>
                    <p>Chapter {story.currentChapter}</p>
                    <p className="mt-0.5 text-primary">Updated: {format(new Date(story.chapterUpdatedAt), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Prediction bar */}
            {prediction.confidence !== "insufficient" && (
              <div className={`mt-2 rounded-lg px-3 py-2.5 border flex items-start gap-2.5 ${
                prediction.daysUntil !== null && prediction.daysUntil <= 1 ? "bg-emerald-500/10 border-emerald-500/30"
                : prediction.daysUntil !== null && prediction.daysUntil < 0 ? "bg-orange-500/10 border-orange-500/30"
                : "bg-secondary/80 border-border"
              }`}>
                <Zap className={`w-4 h-4 mt-0.5 shrink-0 ${
                  prediction.daysUntil !== null && prediction.daysUntil <= 1 ? "text-emerald-400"
                  : prediction.daysUntil !== null && prediction.daysUntil < 0 ? "text-orange-400"
                  : "text-primary"
                }`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{prediction.message}</p>
                  {prediction.avgDays !== null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 bg-border rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${prediction.progressPct >= 100 ? "bg-orange-400" : prediction.progressPct >= 75 ? "bg-emerald-400" : "bg-primary"}`}
                          style={{ width: `${Math.min(prediction.progressPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{prediction.progressPct}%</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                        prediction.confidence === "high"   ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : prediction.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}>{prediction.confidence}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-3 space-y-4">
              {/* Mobile quick actions */}
              <div className="grid grid-cols-3 gap-3 sm:hidden">
                <button onClick={() => setBookmarkDialog(true)} className="flex flex-col items-center p-3 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                  <Bookmark size={20} className="text-primary mb-2"/>
                  <span className="text-[11px] font-semibold text-foreground">Bookmark</span>
                  <span className="text-[9px] text-muted-foreground">{story.bookmarks.length} saved</span>
                </button>
                <button onClick={() => setNotesDialog(true)} className="flex flex-col items-center p-3 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                  <FileText size={20} className="text-blue-500 mb-2"/>
                  <span className="text-[11px] font-semibold text-foreground">Notes</span>
                  <span className="text-[9px] text-muted-foreground">{story.notes?.length || 0} notes</span>
                </button>
                <button onClick={handleOpenListsDialog} className="flex flex-col items-center p-3 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                  <List size={20} className="text-purple-500 mb-2"/>
                  <span className="text-[11px] font-semibold text-foreground">Lists</span>
                  <span className="text-[9px] text-muted-foreground">{story.lists.length} lists</span>
                </button>
              </div>

              {/* Desktop actions */}
              <div className="hidden sm:grid grid-cols-5 gap-3 pb-1">
                {[
                  { icon: <Star size={20} className="text-amber-500 mb-2"/>, label: "Rating", sub: `${story.rating || "—"}/10`, action: () => setRatingDialog(true) },
                  { icon: <div className="w-5 h-5 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: dotColor }}><div className="w-1.5 h-1.5 rounded-full bg-white"/></div>, label: "Status", sub: currentStatus?.label || "Set", action: () => setStatusDialog(true) },
                  { icon: <Bookmark size={20} className="text-primary mb-2"/>, label: "Bookmark", sub: `${story.bookmarks.length} saved`, action: () => setBookmarkDialog(true) },
                  { icon: <FileText size={20} className="text-blue-500 mb-2"/>, label: "Notes", sub: `${story.notes?.length || 0} notes`, action: () => setNotesDialog(true) },
                  { icon: <List size={20} className="text-purple-500 mb-2"/>, label: "Lists", sub: `${story.lists.length} lists`, action: handleOpenListsDialog },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} className="flex flex-col items-center p-3 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                    {btn.icon}
                    <span className="text-[11px] font-semibold text-foreground">{btn.label}</span>
                    <span className="text-[9px] text-muted-foreground">{btn.sub}</span>
                  </button>
                ))}
              </div>

              {/* Genre + Demographic + More */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mt-2">
                {/* Genre — desktop */}
                <div className="hidden sm:flex flex-1 flex-wrap items-center gap-1.5 mr-4 min-w-0">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider mr-1 shrink-0">Genre</span>
                  {story.genres && story.genres.length > 0 ? (
                    <>
                      {(genreExpanded ? story.genres : story.genres.slice(0, 5)).map((g: string) => (
                        <span key={g} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary/80 text-foreground border border-border/50 whitespace-nowrap">{g}</span>
                      ))}
                      {story.genres.length > 5 && (
                        <button onClick={() => setGenreExpanded(v => !v)} className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 transition-colors">
                          {genreExpanded ? "Show less" : `+${story.genres.length - 5} more`}
                        </button>
                      )}
                      <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-0.5 ml-1 transition-colors">
                        <Plus size={10}/> Edit
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-muted-foreground hover:text-foreground italic flex items-center gap-0.5">
                      <Plus size={10}/> Add Genres
                    </button>
                  )}
                </div>

                {/* Demographic + More */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end mr-2.5">
                  <div className="relative group/demog">
                    <button
                      onClick={() => {
                        const list = ["Josei", "Seinen", "Shoujo", "Shounen", "Unknown"];
                        const nextIndex = (list.indexOf(story.demographic || "") + 1) % list.length;
                        updateStory(story.id, { demographic: list[nextIndex] });
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-foreground text-xs font-semibold transition-colors border shadow-sm ${story.demographic ? `${DEMOGRAPHIC_INFO[story.demographic]} border-current/50` : "bg-secondary hover:bg-secondary/80 border-border text-muted-foreground"}`}
                    >
                      <span className={story.demographic ? "text-current" : "text-muted-foreground"}>
                        {DEMOGRAPHIC_ICONS[story.demographic || "Unknown"] || <HelpCircle className="w-3.5 h-3.5"/>}
                      </span>
                      <span className="whitespace-nowrap">{story.demographic || "Unknown"}</span>
                    </button>
                    <div className="absolute top-full right-0 mt-2 w-max px-2 py-1 bg-popover border border-border rounded shadow-xl text-[10px] text-muted-foreground opacity-0 group-hover/demog:opacity-100 pointer-events-none transition-opacity z-50">
                      Click to cycle audience
                    </div>
                  </div>

                  <Dialog open={moreDialog} onOpenChange={setMoreDialog}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors border border-border">
                        <MoreHorizontal size={14}/>
                        <span className="hidden sm:inline">More Options</span>
                        <span className="sm:hidden text-[12px]">More Options</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-[92vw] max-w-sm sm:max-w-lg p-6">
                      <DialogHeader><DialogTitle>More Options</DialogTitle></DialogHeader>
                      <div className="grid gap-2 pb-4 border-b border-border">
                        <button onClick={() => { setMoreDialog(false); setRatingDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors md:hidden">
                          <div className="p-1.5 rounded bg-secondary/50"><Star className="w-4 h-4 text-amber-500"/></div>
                          <div className="flex-1"><p className="text-sm font-medium text-foreground">Change Rating</p><p className="text-[10px] text-muted-foreground">Current: {story.rating || "—"}/10</p></div>
                        </button>
                        <button onClick={() => { setMoreDialog(false); setStatusDialog(true); }} className="flex sm:hidden items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors">
                          <div className="p-1.5 rounded bg-secondary/50"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: dotColor }}/></div>
                          <div className="flex-1"><p className="text-sm font-medium text-foreground">Change Status</p><p className="text-[10px] text-muted-foreground">{currentStatus?.label || "Not set"}</p></div>
                        </button>
                        <button onClick={() => { setMoreDialog(false); handleOpenHistory(); setHistoryDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors">
                          <div className="p-1.5 rounded bg-secondary/50"><History className="w-4 h-4 text-foreground"/></div>
                          <div className="flex-1"><p className="text-sm font-medium text-foreground">Version History</p><p className="text-[10px] text-muted-foreground">View history change</p></div>
                        </button>
                        <button onClick={() => { setMoreDialog(false); handleOpenRelated(); setRelatedDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors">
                          <div className="p-1.5 rounded bg-secondary/50"><GitBranch className="w-4 h-4 text-foreground"/></div>
                          <div className="flex-1"><p className="text-sm font-medium text-foreground">Related Stories</p><p className="text-[10px] text-muted-foreground">Prequel, Sequel, dll.</p></div>
                        </button>
                        {/* Tombol Hidden Vault */}
                        <button 
                          onClick={() => { 
                            setMoreDialog(false); // Tutup dialog
                            updateStory(story.id, { hidden: !story.hidden }); // Toggle hidden
                          }} 
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors"
                        >
                          <div className="p-1.5 rounded bg-secondary/50">
                            {story.hidden 
                              ? <Eye className="w-4 h-4 text-foreground"/>
                              : <EyeOff className="w-4 h-4 text-foreground"/>
                            }
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {story.hidden ? "Show in Library" : "Hide from Library"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {story.hidden ? "Story will reappear in the library" : "Move to Hidden Vault"}
                            </p>
                          </div>
                        </button>
                        <button onClick={() => { setMoreDialog(false); setDeleteStoryDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-left transition-colors">
                          <div className="p-1.5 rounded bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive"/></div>
                          <div className="flex-1"><p className="text-sm font-medium text-destructive">Delete Story</p><p className="text-[10px] text-muted-foreground">Delete permanently, cannot be undone</p></div>
                        </button>
                      </div>
                      <div className="pt-4 flex flex-col items-end">
                        <span className="text-xs italic text-muted-foreground text-right">Story #{currentIndex + 1} of {allStories.length}</span>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ DIALOGS ═══════════════════════════════════════════════════════════ */}

      {/* Rating */}
      <Dialog open={ratingDialog} onOpenChange={setRatingDialog}>
        <DialogContent className="sm:max-w-sm p-6">
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
          <DialogFooter className="flex-col sm:flex-col gap-2">
            {story.rating > 0 && <p className="text-xs text-center text-muted-foreground">Your rating: <span className="font-bold text-amber-500">{story.rating}/10</span></p>}
            <Button variant="ghost" size="sm" onClick={() => { updateStory(story.id, { rating: 0 }); setRatingDialog(false); }} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">Clear Rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4"><DialogTitle className="text-xl">Select Status</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => { haptic("light"); handleStatusChange(s.value); }}
                className={`relative overflow-hidden group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${story.status === s.value ? "border-primary bg-primary/5 scale-105 shadow-lg" : "border-border bg-card hover:border-primary/50 hover:bg-secondary"}`}>
                {story.status === s.value && <div className="absolute inset-0 bg-primary/5 blur-xl -z-10"/>}
                <span className="w-8 h-8 rounded-full shadow-inner mb-2 ring-2 ring-background transition-transform group-hover:scale-110" style={{ backgroundColor: s.color }}/>
                <span className={`font-bold text-sm tracking-wide ${story.status === s.value ? "text-primary" : "text-foreground"}`}>{s.label}</span>
                {story.status === s.value && <div className="absolute top-2 right-2 text-primary"><CheckCircle2 size={16} className="fill-current"/></div>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookmark */}
      <Dialog open={bookmarkDialog} onOpenChange={setBookmarkDialog}>
        <DialogContent className="w-[92vw] max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Add Bookmark</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={bmChapter} onChange={e => setBmChapter(e.target.value)} placeholder="Chapter number" type="number" step="0.5"/>
            <Input value={bmNote}    onChange={e => setBmNote(e.target.value)}    placeholder="Short note (optional)"/>
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
      <Dialog open={notesDialog} onOpenChange={open => { if (!open) { setNotesDialog(false); setEditingNote(null); } }}>
        <DialogContent className="w-[92vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden mx-auto">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingNote ? "Edit Note" : "Write a Note"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <RichTextEditor content={noteContent} onChange={setNoteContent} placeholder="Write your notes here..."/>
          </div>
          <DialogFooter className="shrink-0 pt-2">
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={() => { haptic("medium"); handleSaveNote(); }}>{editingNote ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lists */}
      <Dialog open={listsDialog} onOpenChange={setListsDialog}>
        <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden gap-0 mx-auto">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-base font-bold text-foreground">Add to List</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Organise this story into your collections</p>
          </div>

          {/* List items */}
          <div className="px-3 py-3 space-y-0.5 max-h-60 overflow-y-auto">
            {customLists.length > 0 ? (
              customLists.map((list: any) => {
                const isIn = story.lists?.includes(list.id) || false;
                return (
                  <label
                    key={list.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${isIn ? "bg-primary/8 border-primary/25" : "border-transparent hover:bg-secondary/60 hover:border-border/60"}`}
                  >
                    {/* Custom checkbox */}
                    <div className="relative shrink-0">
                      <input
                        type="checkbox"
                        checked={isIn}
                        onChange={() => {
                          if (isIn) {
                            removeListFromStory(story.id, list.id);
                          } else {
                            addListToStory(story.id, list.id);
                          }
                          setTimeout(() => {
                            setCustomLists(safeGet<any[]>("my_reading_lists", []));
                          }, 50);
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isIn ? "border-primary bg-primary shadow-sm shadow-primary/30" : "border-border bg-secondary"}`}>
                        {isIn && (
                          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                            <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Color dot + name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10"
                        style={{ backgroundColor: list.color || "#6b7280" }}
                      />
                      <span className={`text-sm font-medium truncate ${isIn ? "text-foreground" : "text-foreground/80"}`}>
                        {list.name}
                      </span>
                    </div>

                    {isIn && (
                      <span className="text-[10px] font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Added
                      </span>
                    )}
                  </label>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                  <List className="w-5 h-5 text-muted-foreground/40"/>
                </div>
                <p className="text-sm text-muted-foreground font-medium">No lists yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Create one below</p>
              </div>
            )}
          </div>

          {/* Create new list */}
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
                    const newList = {
                      id: newId,
                      name: newListName.trim(),
                      description: "",
                      status: "Custom",
                      stories: [],
                      color: "#3b82f6",
                    };
                    const existing = safeGet<any[]>("my_reading_lists", []);
                    const updated = [...existing, newList];
                    localStorage.setItem("my_reading_lists", JSON.stringify(updated));
                    import("@/integrations/supabase/client").then(({ supabase }) => {
                      supabase.auth.getUser().then(({ data }) => {
                        if (data.user) {
                          supabase.from("lists").upsert(
                            { id: newId, user_id: data.user.id, name: newListName.trim(), color: "#3b82f6", status: "Custom", description: "" },
                            { onConflict: "id" }
                          );
                        }
                      });
                    });
                    setCustomLists(updated);
                    addListToStory(story.id, newId);
                    setNewListName("");
                  }
                }}
              />
              <Button
                size="sm"
                className="h-9 px-3 shrink-0"
                onClick={() => {
                  if (!newListName.trim()) return;
                  const newId = Date.now().toString();
                  const newList = {
                    id: newId,
                    name: newListName.trim(),
                    description: "",
                    status: "Custom",
                    stories: [],
                    color: "#3b82f6",
                  };
                  const existing = safeGet<any[]>("my_reading_lists", []);
                  const updated = [...existing, newList];
                  localStorage.setItem("my_reading_lists", JSON.stringify(updated));
                  setCustomLists(updated);
                  addListToStory(story.id, newId);
                  setNewListName("");
                }}
              >
                <Plus className="w-3.5 h-3.5"/>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="w-[92vw] max-w-md mx-auto">
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          {historyEntries.length > 0
            ? <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
            : <p className="text-sm text-muted-foreground italic py-4 text-center">No history yet.</p>}
          {historyEntries.length > 0 && (
            <DialogFooter><Button variant="ghost" size="sm" onClick={clearHistory}>Clear History</Button></DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Related Stories */}
      <Dialog open={relatedDialog} onOpenChange={setRelatedDialog}>
        <DialogContent className="w-[92vw] max-w-md mx-auto">
          <DialogHeader><DialogTitle>Related Stories</DialogTitle></DialogHeader>
          {relations.length > 0
            ? <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
                {relations.map(rel => (
                  <div key={rel.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${REL_COLORS[rel.type]}`}>{REL_LABELS[rel.type]}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${rel.mode === "local" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                          {rel.mode === "local" ? <><Database className="w-3 h-3 inline mr-0.5"/>Local</> : <><Globe className="w-3 h-3 inline mr-0.5"/>Mention</>}
                        </span>
                      </div>
                      {rel.mode === "local" && rel.relatedStoryId
                        ? <Link to={`/story/${rel.relatedStoryId}`} className="text-sm font-medium text-primary hover:underline truncate block">{rel.relatedTitle}</Link>
                        : rel.mode === "mention" && rel.relatedUrl
                        ? <a href={rel.relatedUrl} target="_blank" rel="noopener" className="text-sm font-medium text-primary hover:underline truncate block">{rel.relatedTitle}</a>
                        : <p className="text-sm font-medium text-foreground truncate">{rel.relatedTitle}</p>}
                    </div>
                    <button onClick={() => handleRemoveRelation(rel.id)} className="text-destructive hover:text-destructive/80 shrink-0"><X className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
              </div>
            : <p className="text-sm text-muted-foreground italic mb-4">No related stories yet.</p>}
          <div className="border-t border-border pt-5 mt-4 space-y-3">
            <span className="text-xs text-muted-foreground font-semibold block">Add Related Story</span>
            <div className="flex gap-1">
              {(["local", "mention"] as const).map(m => (
                <button key={m} onClick={() => setNewRelMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors ${newRelMode === m ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}>
                  {m === "local" ? <><Database className="w-3.5 h-3.5"/>Local DB</> : <><Globe className="w-3.5 h-3.5"/>Mention + Link</>}
                </button>
              ))}
            </div>
            <div className="relative">
              <Input value={newRelTitle} onChange={e => handleRelTitleInput(e.target.value)} placeholder={newRelMode === "local" ? "Search title in library..." : "Story title"} className="bg-card text-sm"/>
              {newRelMode === "local" && relSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {relSuggestions.map(s => (
                    <button key={s.id} onClick={() => { setNewRelStoryId(s.id); handleRelTitleInput(s.title); }} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0"/>
                      <span className="truncate">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {newRelMode === "mention" && <Input value={newRelUrl} onChange={e => setNewRelUrl(e.target.value)} placeholder="URL / hyperlink (optional)" className="bg-card text-sm"/>}
            <div className="flex gap-2">
              <select 
                value={newRelType}   
                onChange={e => setNewRelType(e.target.value as any)} 
                className="flex-1 h-9 rounded-md border border-border bg-card text-sm px-3 text-foreground"
              >
                <option value="prequel">Prequel</option>
                <option value="sequel">Sequel</option>
                <option value="spin-off">Spin-off</option>
                <option value="related">Related</option>
              </select>
              <Button size="sm" onClick={handleAddRelation} disabled={!newRelTitle.trim()}><Plus className="w-3.5 h-3.5 mr-1"/>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note confirm */}
      <Dialog open={!!deleteNoteId} onOpenChange={open => { if (!open) setDeleteNoteId(null); }}>
        <DialogContent className="w-[92vw] max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Delete notes?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This notes will be deleted permanently.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteNoteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteNoteId) { removeNote(story.id, deleteNoteId); setDeleteNoteId(null); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Story confirm */}
      <Dialog open={deleteStoryDialog} onOpenChange={setDeleteStoryDialog}>
        <DialogContent className="sm:max-w-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 to-background pointer-events-none"/>
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center pt-4 pb-2">
              <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4 shadow-lg shadow-destructive/10">
                <Trash2 className="w-7 h-7 text-destructive"/>
              </div>
              <h2 className="text-xl font-bold text-foreground">Delete Story?</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">You will delete</p>
              <p className="text-sm font-semibold text-foreground px-4 line-clamp-2 mt-0.5">"{story.title}"</p>
              <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0"/>
                <span className="text-[11px] text-destructive font-medium">You can't undo this action</span>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 mt-4 sm:flex-col">
              <Button variant="destructive" className="w-full h-11 font-bold text-sm shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all" onClick={() => { deleteStory(story.id); navigate("/"); }}>
                <Trash2 className="w-4 h-4 mr-2"/>Yes, delete it now
              </Button>
              <Button variant="ghost" className="w-full h-11 text-sm" onClick={() => setDeleteStoryDialog(false)}>No, keep it</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media lightbox */}
      <Dialog open={!!mediaLightbox} onOpenChange={open => { if (!open) setMediaLightbox(null); }}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-border overflow-hidden rounded-xl">
          {mediaLightbox && (
            <>
              <img src={mediaLightbox.url} alt={mediaLightbox.label} className="w-full h-auto max-h-[75vh] object-contain"/>
              <div className="px-4 py-3 bg-black/80 border-t border-white/10 flex items-center gap-2">
                {editingMediaLabel ? (
                  <>
                    <Input value={editingMediaLabel} onChange={e => setEditingMediaLabel(e.target.value)} className="h-7 text-xs bg-card/20 border-white/20 text-white flex-1" onKeyDown={e => { if (e.key === "Enter") handleSaveMediaLabel(); }} autoFocus/>
                    <Button size="sm" className="h-7 text-xs" onClick={handleSaveMediaLabel}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-white" onClick={() => setEditingMediaLabel("")}>✕</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-300 flex-1 text-center">{mediaLightbox.label || "—"}</p>
                    <button onClick={() => setEditingMediaLabel(mediaLightbox.label || "")} className="text-gray-400 hover:text-white transition-colors p-1 rounded">
                      <Pencil className="w-3.5 h-3.5"/>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <main className="container max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 mt-12 space-y-6 sm:space-y-0">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-6 gap-y-8">

           

            {/* ── Left Column ── */}
            <div className="flex-1 min-w-0 space-y-8">

              {/* Synopsis */}
              <div className="rounded-xl bg-card/80 border border-border/60 p-4 space-y-2 border-l-2 border-l-primary/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground tracking-wide">Synopsis</span>
                  <Dialog open={synopsisEditDialog} onOpenChange={setSynopsisEditDialog}>
                    <DialogTrigger asChild>
                      <button onClick={() => setSynopsisValue(story.synopsis || "")} className="p-1.5 rounded hover:bg-secondary transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground"/>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader><DialogTitle>Edit Synopsis</DialogTitle></DialogHeader>
                      <Textarea value={synopsisValue} onChange={e => setSynopsisValue(e.target.value)} placeholder="Write the synopsis..." className="min-h-[200px] bg-card resize-none" style={{ textAlign: "justify" }}/>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={() => { updateStory(story.id, { synopsis: synopsisValue }); setSynopsisEditDialog(false); }}>Save</Button>
                      </DialogFooter>
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
                    <span key={g} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary/80 text-foreground border border-border/50 whitespace-nowrap">{g}</span>
                  ))}
                  {story.genres.length > 5 && (
                    <button onClick={() => setGenreExpanded(v => !v)} className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 transition-colors">
                      {genreExpanded ? "Show less" : `+${story.genres.length - 5} more`}
                    </button>
                  )}
                  <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-0.5 ml-1 transition-colors">
                    <Plus size={10}/> Edit
                  </button>
                </>
              ) : (
                <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-muted-foreground hover:text-foreground italic flex items-center gap-0.5">
                  <Plus size={10}/> Add Genres
                </button>
              )}
            </div>

              {/* Inline relations */}
              {inlineRelations.length > 0 && (
                <div className="rounded-lg bg-card border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary"/>
                    <span className="text-sm font-semibold text-foreground">Related Stories</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inlineRelations.map(rel => (
                      <div key={rel.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${REL_COLORS[rel.type]}`}>{REL_LABELS[rel.type]}</span>
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
                      <button key={m} onClick={() => { setTagMode(m); if (m === "suggested" && suggestedTags.length === 0 && !suggestedLoading) handleSuggestTags(); }}
                        className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 ${tagMode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        {m === "suggested" && <Sparkles className="w-3.5 h-3.5"/>}
                        {m === "manual" ? "Manual" : m === "existing" ? "Existing" : "Suggested"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {story.tags.map((tag: string) => (
                    <button key={tag} onClick={() => handleTagClick(tag)} title="Click to filter in Library"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer active:scale-95">
                      {tag}
                      <span className="opacity-50 hover:opacity-100" onClick={e => { e.stopPropagation(); removeTagFromStory(story.id, tag); }}>×</span>
                    </button>
                  ))}                                    
                </div>
                <div className="flex flex-wrap gap-1.5" key={tagRefresh}>
                  {tagMode === "manual" && (
                    <form onSubmit={e => { e.preventDefault(); handleAddTag(); }} className="inline-flex">
                      <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="+ add tag" className="h-7 w-28 text-xs bg-secondary px-3 rounded-full border-border"/>
                    </form>
                  )}
                  {tagMode === "existing" && (
                    availableGlobalTags.length > 0
                      ? <div className="flex flex-wrap gap-1">
                          {availableGlobalTags.map((t: string) => (
                            <span key={t} className="inline-flex items-center gap-0.5 px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                              <button onClick={() => addTagToStory(story.id, normalizeTag(t))}>+ {t}</button>
                              <button onClick={() => handleDeleteExistingTag(t)} className="ml-1 hover:text-destructive text-muted-foreground">×</button>
                            </span>
                          ))}
                        </div>
                      : <span className="text-xs text-muted-foreground italic">No existing tags.</span>
                  )}
                  {tagMode === "suggested" && (
                    suggestedLoading
                      ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin"/>Generating suggestions...</div>
                      : suggestedTags.length > 0
                      ? <div className="w-full space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {suggestedTags.map(t => (
                              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Sparkles className="w-3 h-3 shrink-0"/>{t}
                                <button onClick={() => setSuggestedTags(p => p.filter(x => x !== t))} className="ml-0.5 hover:text-red-400">×</button>
                              </span>
                            ))}
                            <form onSubmit={e => {
                              e.preventDefault();
                              const inp = e.currentTarget.elements.namedItem("suggestedtag") as HTMLInputElement;
                              const v = normalizeTag(inp.value);
                              if (v && !suggestedTags.map(normalizeTag).includes(v) && !storyTagsNorm.includes(v)) setSuggestedTags(p => [...p, v]);
                              inp.value = "";
                            }} className="inline-flex">
                              <input name="suggestedtag" placeholder="+ add" className="h-7 w-24 text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full px-3 placeholder:text-blue-400/50 outline-none focus:border-blue-400"/>
                            </form>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              const normTags = suggestedTags.map(t => normalizeTag(t));
                              const updatedTags = Array.from(new Set([...(story.tags || []), ...normTags]));
                              updateStory(story.id, { tags: updatedTags });
                              setSuggestedTags([]); setTagMode("manual");
                            }} className="px-3 py-1 text-xs rounded-full bg-blue-500 text-white hover:bg-blue-600 font-medium">Apply All</button>
                            <button onClick={handleSuggestTags} className="px-3 py-1 text-xs rounded-full bg-secondary text-muted-foreground hover:text-foreground border border-border">↻ Refresh</button>
                          </div>
                        </div>
                      : <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground italic">No suggestions. Add a synopsis first.</span>
                          <button onClick={handleSuggestTags} className="text-xs text-primary hover:underline">Retry</button>
                        </div>
                  )}
                </div>
              </div>

              {/* Bookmarks */}
              <div className="space-y-3">
                <h3 className="font-bold text-foreground px-4 py-2 bg-secondary rounded-md text-base border border-border inline-block">Bookmarks</h3>
                <div className="space-y-2">
                  {story.bookmarks.map((bm: any) => (
                    <div key={bm.id} className="relative group">
                      <div className="peer flex items-center gap-3 py-3 px-3 border border-border/50 rounded-lg bg-card/50 hover:bg-secondary hover:border-border transition-colors duration-200 cursor-default select-none group">
                        <Bookmark className="w-4 h-4 text-primary shrink-0"/>
                        <span className="font-semibold text-sm text-foreground whitespace-nowrap shrink-0">Ch. {bm.chapter}</span>
                        {bm.note && <p className="text-sm text-muted-foreground flex-1 min-w-0 truncate">{bm.note}</p>}
                        <span className="text-[10px] text-muted-foreground shrink-0 opacity-60">{format(new Date(bm.createdAt), "MM/dd/yy")}</span>
                        <button onClick={e => { e.stopPropagation(); removeBookmark(story.id, bm.id); }} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><X className="w-4 h-4"/></button>
                      </div>
                      <div className="absolute z-20 bottom-full left-0 mb-2 w-64 p-3 rounded-xl bg-background border border-border shadow-xl opacity-0 pointer-events-none peer-hover:opacity-100 peer-hover:pointer-events-auto transition-all duration-150 space-y-2 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-primary">
                          <Bookmark className="w-4 h-4 fill-primary"/>
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

            {/* ── Right Column ── */}
            <div className="lg:w-80 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary"/>
                  <h3 className="font-semibold text-sm text-foreground">Where to Read?</h3>
                </div>
                <div className="flex gap-1">
                  <Dialog open={sourceDialog} onOpenChange={setSourceDialog}>
                    <DialogTrigger asChild>
                      <button className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground border border-border">Edit</button>
                    </DialogTrigger>
                    <DialogContent className="w-[92vw] max-w-md mx-auto">
                      <DialogHeader><DialogTitle>Edit Sources</DialogTitle></DialogHeader>
                      {story.sources && story.sources.length > 0 ? (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                          <p className="text-[10px] text-muted-foreground text-center">🔔 Select up to 2 sources for notifications. ({trackedSourceIds.length}/2 active)</p>
                          {story.sources.map((src: any) => {
                            const isTracked = trackedSourceIds.includes(src.id);
                            const canTrack  = isTracked || trackedSourceIds.length < 2;
                            return (
                              <div key={src.id} className={`p-3 rounded-lg bg-secondary/50 border space-y-2 ${isTracked ? "border-primary/40" : "border-border"}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-xs text-foreground uppercase tracking-wide truncate">{src.name}</span>
                                    <button onClick={() => toggleTracked(src.id)} disabled={!canTrack}
                                      className={`p-1 rounded-full transition-colors shrink-0 ${isTracked ? "bg-primary/20 text-primary hover:bg-red-500/20 hover:text-red-400" : "text-muted-foreground/40 hover:text-muted-foreground"} ${!canTrack ? "opacity-30 cursor-not-allowed" : ""}`}>
                                      <Bell className="w-3.5 h-3.5"/>
                                    </button>
                                  </div>
                                  <button onClick={() => removeSource(story.id, src.id)} className="text-destructive hover:text-destructive/80 shrink-0"><X className="w-3.5 h-3.5"/></button>
                                </div>
                                {editSrcId === src.id ? (
                                  <div className="space-y-2">
                                    <Input value={editSrcName} onChange={e => setEditSrcName(e.target.value)} placeholder="Site name" className="h-7 text-xs bg-card"/>
                                    <Input value={editSrcUrl}  onChange={e => setEditSrcUrl(e.target.value)}  placeholder="URL"       className="h-7 text-xs bg-card"/>
                                    <div className="flex gap-2">
                                      <Input value={editSrcChapter} onChange={e => setEditSrcChapter(e.target.value)} type="number" step="0.5" placeholder="Chapter" className="h-7 text-xs bg-card w-24"/>
                                      <Input value={editSrcLang}    onChange={e => setEditSrcLang(e.target.value)}    placeholder="Lang"    className="h-7 text-xs bg-card flex-1"/>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                      <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveSourceEdit}>Save</Button>
                                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditSrcId(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] text-muted-foreground min-w-0">
                                      <span>Ch. {src.currentChapter}</span>
                                      {src.language && <span className="text-primary ml-1">{src.language}</span>}
                                      <span className="block truncate opacity-60 max-w-[160px]">{src.url}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => {
                                          const newSources = [...story.sources];
                                          const idx = newSources.findIndex((s: any) => s.id === src.id);
                                          if (idx !== -1) { newSources[idx] = { ...newSources[idx], currentChapter: (parseInt(src.currentChapter) || 0) + 1 }; updateStory(story.id, { sources: newSources }); }
                                        }}
                                        className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                      >+1</button>
                                      <button onClick={() => { setEditSrcId(src.id); setEditSrcName(src.name); setEditSrcUrl(src.url); setEditSrcChapter(String(src.currentChapter)); setEditSrcLang(src.language || ""); }}
                                        className="shrink-0 px-2 py-0.5 text-[10px] rounded bg-card text-foreground border border-border hover:bg-muted">Edit</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : <p className="text-sm text-muted-foreground italic">No sources added yet.</p>}
                    </DialogContent>
                  </Dialog>

                  <Dialog open={addSourceDialog} onOpenChange={setAddSourceDialog}>
                    <DialogTrigger asChild>
                      <button className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground border border-border">Add</button>
                    </DialogTrigger>
                    <DialogContent className="w-[92vw] max-w-md mx-auto">
                      <DialogHeader><DialogTitle>Add Reading Link</DialogTitle></DialogHeader>
                      <div className="space-y-2">
                        <div className="relative">
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
                                  e.preventDefault();
                                  setSrcName(srcNameSuggestion);
                                  setSrcNameSuggestion("");
                                }
                              }}
                            />
                            {srcNameSuggestion && (
                              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                <span className="text-transparent">{srcName}</span>
                                <span className="text-foreground/40 text-sm">{srcNameSuggestion.slice(srcName.length)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Input value={srcUrl}  onChange={e => setSrcUrl(e.target.value)}  placeholder="URL"                       className="bg-card text-sm"/>
                        <div className="flex gap-2">
                          <Input value={srcChapter} onChange={e => setSrcChapter(e.target.value)} placeholder="Chapter" type="number" step="0.5" className="bg-card text-sm w-24"/>
                          <Input value={srcLang}    onChange={e => setSrcLang(e.target.value)}    placeholder="Lang (EN, ID, KR)"    className="bg-card text-sm flex-1"/>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={() => {
                          if (!srcName.trim() || !srcUrl.trim()) return;
                          addSource(story.id, { name: srcName.trim(), url: srcUrl.trim(), currentChapter: parseInt(srcChapter) || 0, language: srcLang.trim().toUpperCase() || "" });
                          setSrcName(""); setSrcUrl(""); setSrcChapter(""); setSrcLang(""); setAddSourceDialog(false);
                        }}><Plus className="w-3.5 h-3.5 mr-1"/>Add Link</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {story.sources && story.sources.length > 0 && (
                    <button onClick={() => story.sources.forEach((s: any) => checkLink(s.id, s.url))} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground border border-border flex items-center gap-1 hover:bg-muted">
                      <AlertCircle className="w-3 h-3"/>Check
                    </button>
                  )}
                </div>
              </div>

              {/* CTA inside */}
              {ctaPreference === "inside" && story.sources && story.sources.length > 0 && (() => {
                const best = [...story.sources].sort((a: any, b: any) => (b.currentChapter || 0) - (a.currentChapter || 0))[0];
                return (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mb-2 mr-[5px]">
                    <p className="text-[10px] text-muted-foreground mb-1">Continue where you left off</p>
                    <p className="text-xs font-semibold text-foreground mb-2">Ch. {best.currentChapter} · {best.name}</p>
                    <a href={best.url} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
                      <BookOpen className="w-3.5 h-3.5"/> Continue Reading
                    </a>
                  </div>
                );
              })()}

              {/* Source cards */}
              <div className="grid grid-cols-1 gap-2" key={sourcesKey}>
                {story.sources && story.sources.map((src: any) => {
                  const ls             = linkStatuses[src.id];
                  const isTracked      = trackedSourceIds.includes(src.id);
                  const currentStoryCh = story.currentChapter || 0;
                  const srcCh          = src.currentChapter || 0;
                  const chaptersAhead  = srcCh - currentStoryCh;
                  const isAhead        = chaptersAhead > 0;
                  return (
                    <div key={src.id} className={`rounded-xl border transition-all ${isTracked && isAhead ? "bg-emerald-500/5 border-emerald-500/40 shadow-md shadow-emerald-500/10" : ls && !ls.checking ? (ls.ok ? "bg-card/60 border-green-500/30" : "bg-card/60 border-red-500/30") : "bg-card/60 border-border/50"}`}>
                      <a href={src.url} target="_blank" rel="noopener" className="block p-3">
                        <div className="flex items-center gap-1.5 min-w-0 mb-1">
                          <span className="font-bold text-xs text-foreground uppercase tracking-wide break-words leading-tight min-w-0 flex-1">{src.name}</span>
                          {isTracked && <div title={isAhead ? "Update Available!" : "Notifikasi aktif"}><Bell className={`w-3 h-3 shrink-0 transition-colors ${isAhead ? "text-emerald-500 fill-emerald-500/20 animate-pulse" : "text-primary"}`}/></div>}
                          <div className="flex items-center gap-1 shrink-0">
                            {ls && (ls.checking ? <Loader2 className="w-3 h-3 animate-spin text-blue-400"/> : ls.ok ? <CheckCircle2 className="w-3 h-3 text-green-400"/> : <XCircle className="w-3 h-3 text-red-400"/>)}
                            {src.language && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">{src.language}</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${isTracked && isAhead ? "text-foreground font-semibold" : "text-muted-foreground"}`}>Ch. {srcCh}</span>
                            {isTracked && isAhead && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm ${getBadgeStyles(chaptersAhead)}`}>+{chaptersAhead}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 opacity-60">{format(new Date(src.updatedAt), "MMM d, yyyy")}</span>
                        </div>
                      </a>
                    </div>
                  );
                })}
              </div>
              {(!story.sources || story.sources.length === 0) && <p className="text-xs text-muted-foreground italic">No reading sources added yet.</p>}

              {/* Media */}
              <div className="border-t border-border pt-5 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary"/>
                    <h3 className="font-semibold text-sm text-foreground">Media</h3>
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={mediaDialog} onOpenChange={setMediaDialog}>
                      <DialogTrigger asChild>
                        <button className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground border border-border">Link</button>
                      </DialogTrigger>
                      <DialogContent className="w-[92vw] max-w-sm mx-auto">
                        <DialogHeader><DialogTitle>Add Media Link</DialogTitle></DialogHeader>
                        <Input value={mediaLabel} onChange={e => setMediaLabel(e.target.value)} placeholder="Label / Alt text" className="bg-card"/>
                        <Input value={mediaUrl}   onChange={e => setMediaUrl(e.target.value)}   placeholder="URL or link" className="bg-card"/>
                        <DialogFooter>
                          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                          <Button onClick={() => {
                            if (mediaUrl.trim()) { addMedia(story.id, { type: "link", url: mediaUrl.trim(), label: mediaLabel.trim() || "Link" }); setMediaUrl(""); setMediaLabel(""); setMediaDialog(false); }
                          }}>Add</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <button onClick={() => mediaFileRef.current?.click()} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground border border-border flex items-center gap-1">
                      <Upload className="w-3 h-3"/>Photo
                    </button>
                    <input ref={mediaFileRef} type="file" accept="image/*" className="hidden" onChange={handleMediaFileUpload}/>
                  </div>
                </div>
                {(story.media || []).length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {story.media.map((m: any) => (
                      <div key={m.id} className="relative group aspect-square rounded-md overflow-hidden bg-secondary border border-border cursor-pointer" onClick={() => setMediaLightbox({ url: m.url, label: m.label || "", id: m.id })}>
                        {m.type === "image"
                          ? <img src={m.url} alt={m.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"/>
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2"><ExternalLink className="w-4 h-4 text-primary"/><span className="text-[9px] text-muted-foreground text-center line-clamp-2">{m.label}</span></div>}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </div>
                        <button onClick={e => { e.stopPropagation(); removeMedia(story.id, m.id); }} className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3"/></button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground italic">No media yet.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ NOTES / TIMELINE SECTION ══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 mt-10 sm:mt-8 mb-20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border">
              {(["notes", "timeline"] as const).map(tab => (
                <button key={tab} onClick={() => handleTabChange(tab)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab === "notes" ? "My Notes" : "Arc Timeline"}
                </button>
              ))}
            </div>
            {activeTab === "notes" && (
              <button onClick={() => { setEditingNote(null); setNoteContent(""); setNotesDialog(true); }} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium whitespace-nowrap">+ Add Note</button>
            )}
            {activeTab === "timeline" && (
              <button onClick={() => handleOpenArcDialog()} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium whitespace-nowrap">+ Add Arc</button>
            )}
          </div>

          {/* Notes tab */}
          {activeTab === "notes" && (
            story.notes && story.notes.length > 0
              ? <div className="space-y-4">
                  {story.notes.map((note: any) => (
                    <div key={note.id} className="p-5 rounded-xl bg-card/80 border border-border/50 group hover:border-border transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">{format(new Date(note.createdAt), "MMM d, yyyy")}</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingNote(note); setNoteContent(note.text); setNotesDialog(true); }} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
                          <button onClick={() => setDeleteNoteId(note.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </div>
                      <RichTextDisplay html={note.text} className="text-sm leading-relaxed [&_*]:text-justify [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:mb-0.5 [&_a]:text-primary [&_a]:underline [&_hr]:border-t [&_hr]:border-border [&_hr]:my-3"/>
                    </div>
                  ))}
                </div>
              : <div className="p-8 rounded-xl bg-card/50 border border-dashed border-border flex flex-col items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-muted-foreground/30"/>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Your notes live here</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Thoughts, reactions, theories, anything goes here.</p>
                  </div>
                  <button onClick={() => { setEditingNote(null); setNoteContent(""); setNotesDialog(true); }} className="text-xs text-primary hover:underline font-medium">Write your first note →</button>
                </div>
          )}

          {/* Timeline tab */}
          {activeTab === "timeline" && (
            arcs.length > 0
              ? <div className="relative">
                  <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border"/>
                  <div className="space-y-2">
                    {[...arcs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((arc, idx) => {
                      const isOngoing = arc.chapterEnd === null;
                      const isCurrent = story.currentChapter >= arc.chapterStart && (arc.chapterEnd === null || story.currentChapter <= arc.chapterEnd);
                      return (
                        <div key={arc.id} className="relative flex gap-4 group/arc">
                          <div className="relative z-10 shrink-0 mt-3.5">
                            <div
                              className={`w-9 h-9 rounded-full border-2 border-background flex items-center justify-center text-white text-[10px] font-bold shadow-md ${isCurrent ? "ring-2 ring-offset-1 ring-offset-background" : ""}`}
                              style={{ backgroundColor: arc.color }}
                            >
                              {isOngoing ? (
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"/>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"/>
                                </span>
                              ) : idx + 1}
                            </div>
                          </div>
                          <div className={`flex-1 mb-2 rounded-xl border p-4 transition-all ${isCurrent ? "bg-card border-primary/40 shadow-sm" : "bg-card/60 border-border/50 hover:border-border"}`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-sm text-foreground">{arc.name}</h4>
                                  {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">Reading now</span>}
                                  {isOngoing && !isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ongoing</span>}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: arc.color }}>Ch. {arc.chapterStart}</span>
                                  <span className="text-[10px] text-muted-foreground">→</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: isOngoing ? "#6b7280" : arc.color }}>{isOngoing ? "?" : `Ch. ${arc.chapterEnd}`}</span>
                                  {arc.chapterEnd && <span className="text-[10px] text-muted-foreground ml-1">({arc.chapterEnd - arc.chapterStart + 1} ch)</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/arc:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => handleMoveArc(arc.id, "up")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-3.5 h-3.5 rotate-90"/></button>
                                <button onClick={() => handleMoveArc(arc.id, "down")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="w-3.5 h-3.5 rotate-90"/></button>
                                <button onClick={() => handleOpenArcDialog(arc)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
                                <button onClick={() => setDeleteArcId(arc.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                            </div>
                            {arc.description && <p className="text-xs text-muted-foreground leading-relaxed mt-2 border-t border-border/50 pt-2" style={{ textAlign: "justify" }}>{arc.description}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              : <div className="p-8 rounded-xl bg-card/50 border border-dashed border-border flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center"><span className="text-muted-foreground/50 text-lg font-bold">1</span></div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">No arcs yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Add story arcs to track your reading progress per arc.</p>
                  </div>
                  <button onClick={() => handleOpenArcDialog()} className="text-xs text-primary hover:underline font-medium">Add your first arc →</button>
                </div>
          )}
        </section>       
      </main>

      {/* ═══ FLOATING UI ═══════════════════════════════════════════════════════ */}
      {prevStory && (
        <button onClick={() => handleNavigateStory(prevStory.id)} className="fixed left-2 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 opacity-40 sm:opacity-0 hover:opacity-100 transition-all duration-300 group shadow-xl" title={`Previous: ${prevStory.title}`}>
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform"/>
        </button>
      )}
      {nextStory && (
        <button onClick={() => handleNavigateStory(nextStory.id)} className="fixed right-2 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 opacity-40 sm:opacity-0 hover:opacity-100 transition-all duration-300 group shadow-xl" title={`Next: ${nextStory.title}`}>
          <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform"/>
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
            <BookOpen className="w-5 h-5"/>
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

      {/* Genre picker */}
      <GenrePickerModal
        open={genrePickerOpen}
        onClose={() => setGenrePickerOpen(false)}
        selectedGenres={story.genres || []}
        onToggleGenre={handleToggleGenre}
      />

    {/* ═══ IMAGE CROPPERS ═══════════════════════════════════════════ */}

      {/* Header Cropper */}
      {story.headerUrl && (
        <div onClick={(e) => e.stopPropagation()}>
          <ImageCropper
            open={headerCropOpen}
            onOpenChange={(open) => {
              if (!open) setHeaderCropOpen(false);
            }}            
            imageSrc={story.headerUrl}
            aspect={16 / 5}
            title="Reposition Header"
            onCropComplete={async (croppedBase64) => {
              try {
                const file = base64ToFile(croppedBase64, `header-crop-${Date.now()}.jpg`);
                const publicUrl = await uploadToStorage(file, "headers");
                updateStory(story.id, { headerUrl: publicUrl });
                setHeaderCropOpen(false);
              } catch (err) {
                console.error("Header Crop Error:", err);                
              }              
            }}
          />
        </div>
      )}

      {/* Cover Cropper */}
      {story.coverUrl && (
        <div onClick={(e) => e.stopPropagation()}>
          <ImageCropper
            open={coverCropOpen}
            onOpenChange={(open) => {
              if (!open) setCoverCropOpen(false);
            }}            
            imageSrc={story.coverUrl}
            aspect={3 / 4}
            title="Reposition Cover"
            onCropComplete={async (croppedBase64) => {
              try {
                const file = base64ToFile(croppedBase64, `cover-crop-${Date.now()}.jpg`);
                const publicUrl = await uploadToStorage(file, "covers");
                updateStory(story.id, { coverUrl: publicUrl });
                setCoverCropOpen(false);
              } catch (err) {
                console.error("Cover Crop Error:", err);                
              }
            }}
          />
        </div>
      )}

      {/* Country dialog */}
      <Dialog open={countryDialog} onOpenChange={setCountryDialog}>
        <DialogContent className="w-[92vw] max-w-md mx-auto">
          <DialogHeader><DialogTitle>Origin Country</DialogTitle></DialogHeader>
          <div className="relative mb-4">
            <Input placeholder="Search country (e.g. Japan, ID, USA)..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="pl-9"/>
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"/>
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
                        <span className={`fi fi-${country.code.toLowerCase()} w-8 h-6 rounded-sm inline-block`}/>
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
                      <span className={`fi fi-${country.code.toLowerCase()} w-8 h-6 rounded-sm inline-block shrink-0`}/>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{country.name}</p><p className="text-[10px] text-muted-foreground">{country.code}</p></div>
                      {story.originCountry === country.code && <CheckCircle2 className="w-4 h-4 text-primary shrink-0"/>}
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

      {/* Arc add/edit dialog */}
      <Dialog open={arcDialog} onOpenChange={open => { if (!open) { setArcDialog(false); setEditingArc(null); } }}>
        <DialogContent className="w-[92vw] max-w-md mx-auto">
          <DialogHeader><DialogTitle>{editingArc ? "Edit Arc" : "Add Arc"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={arcName} onChange={e => setArcName(e.target.value)} placeholder="Arc name (e.g. East Blue Arc)" className="bg-card" autoFocus/>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block">Chapter Start</label>
                <Input value={arcStart} onChange={e => setArcStart(e.target.value)} type="number" step="0.5" placeholder="1" className="bg-card"/>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block">Chapter End (blank = ongoing)</label>
                <Input value={arcEnd} onChange={e => setArcEnd(e.target.value)} type="number" step="0.5" placeholder="100" className="bg-card"/>
              </div>
            </div>

            {/* Color Selection Section */}
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Arc Color</label>
                <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 border border-border">
                  {(["auto","manual"] as const).map(m => (
                    <button key={m} onClick={() => {
                      setArcColorMode(m);
                      if (m === "auto") {
                        const palette = ARC_COLOR_PALETTES[arcColorPalette];
                        setArcColor(palette[arcs.length % palette.length]);
                      }
                    }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${arcColorMode === m ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {m === "auto" ? "Auto" : "Manual"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Palette Pills: Colorful & Mono */}  
              <div className="flex gap-1.5">
                {(["colorful", "mono"] as ArcColorPalette[]).map(p => (
                  <button key={p} onClick={() => {
                    setArcColorPalette(p);
                    if (arcColorMode === "auto") {
                      const palette = ARC_COLOR_PALETTES[p];
                      setArcColor(palette[arcs.length % palette.length]);
                    }
                  }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${arcColorPalette === p ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}>
                    {p === "colorful" ? "Colorful" : "Mono"}
                  </button>
                ))}
              </div>

              {/* Color Swatches Grid */}
              <div className="flex gap-1.5 flex-wrap">
                {ARC_COLOR_PALETTES[arcColorPalette].map((c, i) => {
                  const currentAutoColor = ARC_COLOR_PALETTES[arcColorPalette][arcs.length % ARC_COLOR_PALETTES[arcColorPalette].length];
                  const isSelected = arcColorMode === "manual"
                    ? arcColor === c
                    : currentAutoColor === c;
                  return (
                    <button
                      key={i}
                      onClick={() => { setArcColorMode("manual"); setArcColor(c); }}
                      className={`w-7 h-7 rounded-full transition-all shrink-0 ${isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "opacity-80 hover:opacity-100 hover:scale-105"}`}
                      style={{ backgroundColor: c }}
                    />
                  );
                })}
              </div>

              {/* Preview Strip */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-secondary/50">
                <div className="w-5 h-5 rounded-full shadow-md shrink-0 ring-1 ring-white/20"
                     style={{ backgroundColor: arcColorMode === "auto"
                       ? ARC_COLOR_PALETTES[arcColorPalette][arcs.length % ARC_COLOR_PALETTES[arcColorPalette].length]
                       : arcColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">
                    {arcColorMode === "auto"
                      ? `Auto • ${arcColorPalette} palette`
                      : "Manually picked"}
                  </p>
                </div>
                <div className="w-20 h-1.5 rounded-full overflow-hidden"
                     style={{ background: `linear-gradient(to right, ${(arcColorMode === "auto"
                       ? ARC_COLOR_PALETTES[arcColorPalette][arcs.length % ARC_COLOR_PALETTES[arcColorPalette].length]
                       : arcColor)}33, ${arcColorMode === "auto"
                       ? ARC_COLOR_PALETTES[arcColorPalette][arcs.length % ARC_COLOR_PALETTES[arcColorPalette].length]
                       : arcColor})` }}>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Description (optional)</label>
              <Textarea value={arcDesc} onChange={e => setArcDesc(e.target.value)} placeholder="What happens in this arc?" className="bg-card resize-none min-h-[80px] text-sm"/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={() => { haptic("medium"); handleSaveArc(); }} disabled={!arcName.trim() || !arcStart}>{editingArc ? "Update" : "Add Arc"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Arc delete confirm */}
      <Dialog open={!!deleteArcId} onOpenChange={open => { if (!open) setDeleteArcId(null); }}>
        <DialogContent className="w-[92vw] max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Delete arc?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This arc will be deleted permanently.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteArcId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteArcId) handleDeleteArc(deleteArcId); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    {/* Cover Lightbox */}
    {coverLightbox && story.coverUrl && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setCoverLightbox(false)}>
        <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={(e) => { e.stopPropagation(); setCoverLightbox(false); }}>
          <X className="w-5 h-5"/>
        </button>
        <img src={story.coverUrl} alt={story.title} className="h-[80vh] sm:h-screen w-auto max-w-[92vw] sm:max-w-[95vw] object-contain" onClick={e => e.stopPropagation()}/>
      </div>
    )}

    {/* Header Lightbox */}
    {headerLightbox && story.headerUrl && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setHeaderLightbox(false)}>
        <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={(e) => { e.stopPropagation(); setHeaderLightbox(false); }}>
          <X className="w-5 h-5"/>
        </button>
        <img src={story.headerUrl} alt="header" className="h-[80vh] sm:h-screen w-auto max-w-[92vw] sm:max-w-[95vw] object-contain" onClick={e => e.stopPropagation()}/>
      </div>
    )}

    </div>
  );

  function checkLink(sourceId: string, url: string) {
    setLinkStatuses(prev => ({ ...prev, [sourceId]: { ok: false, checking: true, statusText: "Checking..." } }));
    supabase.functions.invoke("check-link", { body: { url } }).then(({ data, error }) => {
      if (error) { setLinkStatuses(prev => ({ ...prev, [sourceId]: { ok: false, checking: false, statusText: "Error" } })); return; }
      setLinkStatuses(prev => ({ ...prev, [sourceId]: { ok: data.ok, checking: false, statusText: data.ok ? "Active" : `${data.status}` } }));
    });
  }
}
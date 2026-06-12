import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useStories } from "@/lib/StoryContext";
import {
  BookOpen, Check, CheckSquare, Square, Trash2, AlertCircle,
  Lock, LayoutGrid, AlignJustify, ChevronRight, Star,
  X, Globe, Eye,
} from "lucide-react";
import { StoryStatus, getGlobalTags } from "@/lib/types";
import { Dialog, DialogContent } from "@/component/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar, Filters, EMPTY_FILTERS, FilterPanel } from "@/component/Navbar";
import { VaultDialog } from "@/component/VaultDialog";
import { useAuth } from "@/component/Auth";
import { isVaultUnlocked, lockVault } from "@/lib/vaultUtils";
import "flag-icons/css/flag-icons.min.css";
import { ScrollToTop } from "./components/ScrollToTop";
import { SORT_OPTIONS, STATUS_COLORS, FORMAT_MAP } from "./constants";
import { getStatusInfo, highlightText, pickHeroStory } from "./utils";
import { usePullToVault } from "./hooks/usePullToVault";
import { useHiddenStories } from "./hooks/useHiddenStories";
import { useLibraryFilter } from "./hooks/useLibraryFilter";
import { VaultTopReveal } from "./components/VaultTopReveal";
import { VaultNavbar } from "./components/VaultNavbar";
import { VaultListPanel } from "./components/VaultListPanel";
import { HeroSection } from "./components/HeroSection";
import { BulkActionBar } from "./components/BulkActionBar";
import { QuickViewModal } from "./components/QuickViewModal";
import { PopupPermissionDialog } from "./components/PopupPermissionDialog";
import { Link } from "react-router-dom";

/* ---------- EmptyState ---------- */
function EmptyState({ isVault = false }: { isVault?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl opacity-50 animate-pulse" />
        <div className="relative bg-secondary/50 border border-border/50 rounded-full p-6">
          {isVault
            ? <Lock size={48} className="text-muted-foreground/40 mx-auto" strokeWidth={1.5} />
            : <BookOpen size={48} className="text-muted-foreground/40 mx-auto" strokeWidth={1.5} />}
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">
        {isVault ? "Vault is empty" : "Library is empty"}
      </h3>
      <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
        {isVault
          ? "No hidden stories yet. Add stories to a hidden list to show them here."
          : "Get started by adding your first story. Track your reading progress easily!"}
      </p>
    </div>
  );
}

/* ---------- GridView ---------- */
function GridView({
  displayedItems, search, vaultUnlocked, bulkMode, selectedIds, setSelectedIds, setQuickView,
}: {
  displayedItems: any[]; search: string; vaultUnlocked: boolean;
  bulkMode: boolean; selectedIds: Set<string>;
  setSelectedIds: (s: Set<string>) => void; setQuickView: (s: any) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-3">
      {displayedItems.map((story: any, index) => {
        const isSelected = selectedIds.has(story.id);
        const statusInfo = getStatusInfo(story.status);
        return (
          <div key={story.id}
            className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-secondary border border-border transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}>
            {!bulkMode && <Link to={`/story/${story.id}`} className="absolute inset-0 z-0" state={{ fromVault: vaultUnlocked }} />}
            {story.coverUrl
              ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              : <div className="w-full h-full flex items-center justify-center bg-card"><BookOpen className="w-10 h-10 text-muted-foreground/20" /></div>}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 pointer-events-none z-0" />
            <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/60 via-black/10 to-transparent flex items-center justify-between z-10 pointer-events-none">
              <div className="flex items-center gap-1 max-w-[55%]">
                {story.originCountry 
                  ? <span className={`fi fi-${story.originCountry.toLowerCase()} shadow-sm`} style={{ width: 16, height: 12, borderRadius: 2 }} />
                  : <Globe size={10} className="text-white/60" />
                }
                <span className="text-[9px] font-bold text-white/90 truncate" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)" }}>{FORMAT_MAP[(story.originCountry || "").toUpperCase()]}</span>
              </div>
              <div className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: STATUS_COLORS[story.status] }} />
                <span className="text-[9px] text-white/80 whitespace-nowrap">{statusInfo.label}</span>
              </div>
            </div>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickView(story); }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-black/60 border border-white/20">
              <Eye size={15} className="text-white drop-shadow-md" />
            </button>
            {bulkMode && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  const newSet = new Set(selectedIds);
                  if (newSet.has(story.id)) newSet.delete(story.id); else newSet.add(story.id);
                  setSelectedIds(newSet);
                }}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded bg-card/90 backdrop-blur border border-primary flex items-center justify-center shadow-md">
                {isSelected ? <Check size={14} className="text-primary" /> : null}
              </button>
            )}
            <div className="absolute inset-x-0 bottom-0 pt-10 pb-2 px-2 bg-gradient-to-t from-black/90 via-black/65 to-transparent z-10">
              <Link to={`/story/${story.id}`} state={{ fromVault: vaultUnlocked }} className="block">
                <h3 className="text-[11px] font-bold text-white leading-tight line-clamp-2 drop-shadow-md mb-1 hover:text-primary transition-colors">
                  {highlightText(story.title, search)}
                </h3>
              </Link>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-white/70">
                  <BookOpen size={10} /><span className="text-[10px] font-mono">{story.currentChapter}</span>
                </div>
                <div className="flex items-center gap-0.5 bg-amber-400/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                  <Star size={9} className="fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-300">{story.rating || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- TimelineView ---------- */
function TimelineView({
  displayedItems, vaultUnlocked, bulkMode, selectedIds, setSelectedIds,
}: {
  displayedItems: any[]; vaultUnlocked: boolean;
  bulkMode: boolean; selectedIds: Set<string>;
  setSelectedIds: (s: Set<string>) => void;
}) {
  return (
    <div className="space-y-3">
      {displayedItems.map((story: any, i: number) => {
        const updatedAt = new Date(story.chapterUpdatedAt);
        const now = new Date();
        const diffMs = now.getTime() - updatedAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        const timeAgo = diffMins < 1 ? "Just now"
          : diffMins < 60 ? `${diffMins}m ago`
          : diffHours < 24 ? `${diffHours}h ago`
          : diffDays < 365 ? `${diffDays}d ago`
          : `${Math.floor(diffDays / 365)}y ago`;

        return (
          <div key={story.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}>
            <Link to={`/story/${story.id}`} state={{ fromVault: vaultUnlocked }}
              className="flex gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-secondary hover:border-border transition-all group">
              {bulkMode && (
                <button onClick={e => {
                  e.preventDefault(); e.stopPropagation();
                  const newSet = new Set(selectedIds);
                  if (newSet.has(story.id)) newSet.delete(story.id); else newSet.add(story.id);
                  setSelectedIds(newSet);
                }} className="shrink-0 self-center">
                  {selectedIds.has(story.id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted-foreground" />}
                </button>
              )}

              {/* Cover */}
              <div className="w-16 sm:w-20 shrink-0 aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/50">
                {story.coverUrl
                  ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="text-muted-foreground/20" /></div>}
              </div>

              {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {story.originCountry 
                      ? <span className={`fi fi-${story.originCountry.toLowerCase()} shrink-0`} style={{ width: 14, height: 11, borderRadius: 2 }} />
                      : <Globe size={12} className="text-muted-foreground/60 shrink-0" />
                    }
                    <p className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{story.title}</p>
                  </div>
                  <span className="text-[10px] text-foreground/60 shrink-0 bg-secondary px-2 py-0.5 rounded-md border border-border/50 whitespace-nowrap">{timeAgo}</span>
                </div>

                {story.synopsis && (
                  <p className="text-[11px] text-foreground/60 line-clamp-2 leading-relaxed italic border-l-2 border-primary pl-2 w-full">
                    "{story.synopsis.slice(0, 500)}..."
                  </p>
                )}

                {story.genres && story.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {story.genres.map((g: string) => (
                      <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{g}</span>
                    ))}
                  </div>
                )}

                 <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[story.status] }} />
                      <span className="text-[10px] font-semibold" style={{ color: STATUS_COLORS[story.status] }}>{getStatusInfo(story.status).label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400">{story.rating || "—"}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-primary font-bold">Ch. {story.currentChapter}</span>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- SortMenu ---------- */
function SortMenu({
  sortBy, setSortBy, sortMenuOpen, setSortMenuOpen, advFilters,
}: {
  sortBy: string; setSortBy: (v: string) => void;
  sortMenuOpen: boolean; setSortMenuOpen: (v: boolean) => void;
  advFilters: Filters;
}) {
  const currentSortOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[0];
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button
          onClick={() => setSortMenuOpen(!sortMenuOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border text-xs font-medium text-foreground transition-all"
        >
          {currentSortOption.icon}
          <span>{currentSortOption.label}</span>
          <ChevronRight size={12} className={`transition-transform ${sortMenuOpen ? "rotate-90" : ""}`} />
        </button>
        {sortMenuOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 flex flex-col gap-0.5 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[170px]">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => { setSortBy(opt.value); setSortMenuOpen(false); }}
                className={`text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2 transition-colors ${sortBy === opt.value ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`}>
                {opt.icon}{opt.label}
                {sortBy === opt.value && <Check size={12} className="ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {advFilters.rating > 0 && (
          <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px] border border-amber-500/20">Rating {advFilters.rating}</span>
        )}
        {Object.keys(advFilters.status).length > 0 && (
          <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/20">{Object.keys(advFilters.status).length} Status</span>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN LIBRARY
   ================================================================ */
function Library() {
  const { stories, updateStory, deleteStory } = useStories();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  void user;

  /* --- UI state --- */
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">(() =>
    (localStorage.getItem("jejakbaca_view_mode") as "grid" | "timeline") || "grid"
  );
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadMoreMode, setLoadMoreMode] = useState(false);
  const [showAllSearchResults, setShowAllSearchResults] = useState(false);
  const [displayedItems, setDisplayedItems] = useState<any[]>([]);
  const isInitialized = useRef(false);

  /* --- CTA preference --- */
  const [ctaPreference, setCtaPreference] = useState<"floating" | "inside">(() => {
    const saved = localStorage.getItem("jejakbaca_cta_pref");
    return (saved === "inside" || saved === "floating") ? saved : "floating";
  });
  const handleCtaChange = (val: "floating" | "inside") => {
    setCtaPreference(val);
    localStorage.setItem("jejakbaca_cta_pref", val);
  };

  /* --- Vault state --- */
  const [listVersion, setListVersion] = useState(0);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(() => isVaultUnlocked());
  const [vaultListOpen, setVaultListOpen] = useState(false);
  const [vaultFilterOpen, setVaultFilterOpen] = useState(false);
  const [showVaultHint, setShowVaultHint] = useState(() => !localStorage.getItem("jejakbaca_vault_hint_shown"));

  /* --- Bulk & modals --- */
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [quickView, setQuickView] = useState<any | null>(null);
  const [popupDialog, setPopupDialog] = useState<{ open: boolean; urls: string[] }>({ open: false, urls: [] });

  /* --- Filters --- */
  const [advFilters, setAdvFilters] = useState<Filters>(EMPTY_FILTERS);

  /* --- Hero --- */
  const [heroStory, setHeroStory] = useState<any | null>(null);

  /* ---- Derived data ---- */
  const { hiddenListIds, hiddenStoriesMap, hiddenStoriesCount, hiddenStoriesArray } =
    useHiddenStories(stories, listVersion);

  const { filtered, advFilterCount } = useLibraryFilter({
    stories, search, sortBy, advFilters, vaultUnlocked, hiddenListIds,    
  });
  const { filtered: fullLibraryItems } = useLibraryFilter({
    stories, search: "", sortBy, advFilters, vaultUnlocked, hiddenListIds,
  });

  const PAGE_SIZE_GRID_MOBILE = 25;
  const PAGE_SIZE_GRID_DESKTOP = 50;
  const PAGE_SIZE_LIST_MOBILE = 10;
  const PAGE_SIZE_LIST_DESKTOP = 25;

  const pageSize = viewMode === "grid"
    ? (isMobile ? PAGE_SIZE_GRID_MOBILE : PAGE_SIZE_GRID_DESKTOP)
    : (isMobile ? PAGE_SIZE_LIST_MOBILE : PAGE_SIZE_LIST_DESKTOP);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const showAllResults = showAllSearchResults && search.trim().length > 0;
  const visibleItems = filtered;

  useEffect(() => {
    setPage(1);
    setLoadMoreMode(false);
    setDisplayedItems([]);
  }, [search, sortBy, viewMode, advFilters]);

  useEffect(() => {
    if (showAllResults) {
      setDisplayedItems(filtered);
    } else if (loadMoreMode) {
      setDisplayedItems(filtered.slice(0, page * pageSize));
    } else {
      setDisplayedItems(filtered.slice((page - 1) * pageSize, page * pageSize));
    }
  }, [page, filtered, pageSize, loadMoreMode, showAllResults]);

  /* ---- Pull-to-vault ---- */
  const pageRef = useRef<HTMLDivElement>(null);
  const { pullProgress, pullTriggered, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToVault({ vaultUnlocked, onTrigger: () => setVaultOpen(true) });

  /* ---- Touch listeners ---- */
  useEffect(() => {
    if (!isMobile) return;
    const el = pageRef.current ?? document;
    el.addEventListener("touchstart", handleTouchStart as any, { passive: true });
    el.addEventListener("touchmove", handleTouchMove as any, { passive: true });
    el.addEventListener("touchend", handleTouchEnd as any, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart as any);
      el.removeEventListener("touchmove", handleTouchMove as any);
      el.removeEventListener("touchend", handleTouchEnd as any);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  /* ---- Location state: open vault ---- */
  useEffect(() => {
    if (location.state?.openVault) {
      setVaultUnlocked(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  /* ---- Vault hint timeout ---- */
  useEffect(() => {
    if (!showVaultHint) return;
    const t = setTimeout(() => {
      localStorage.setItem("jejakbaca_vault_hint_shown", "1");
      setShowVaultHint(false);
    }, 30000);
    return () => clearTimeout(t);
  }, [showVaultHint]);

  /* ---- Tag filter sync with URL ---- */
  useEffect(() => {
    const tagsParam = searchParams.get("tags");
    if (tagsParam) {
      const tags = tagsParam.split(",").map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        setAdvFilters(prev => ({
          ...prev,
          tags: Object.fromEntries(tags.map(tag => [tag, "include" as const])),
        }));
      }
    }
    isInitialized.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!isInitialized.current) return;
    const tags = Object.keys(advFilters.tags).filter(tag => advFilters.tags[tag] === "include");
    if (tags.length === 0) searchParams.delete("tags");
    else searchParams.set("tags", tags.join(","));
    setSearchParams(searchParams, { replace: true });
  }, [advFilters.tags]);

  /* ---- Loading skeleton ---- */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  /* ---- Hero story ---- */
  useEffect(() => {
    const pool = vaultUnlocked
      ? hiddenStoriesArray
      : stories.filter((s: any) => {
          const lists: string[] = s.lists || [];
          return !lists.some((lid: string) => hiddenListIds.has(lid));
        });
    setHeroStory(pool.length > 0 ? pickHeroStory(pool) : null);
  }, [stories, vaultUnlocked, hiddenStoriesArray, hiddenListIds]);

  /* ---- Tags for filter panel ---- */
  const globalTags = getGlobalTags();
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    stories.forEach(s => s.tags?.forEach((t: string) => tags.add(t)));
    globalTags.forEach((t: string) => tags.add(t));
    return Array.from(tags).sort();
  }, [stories, globalTags]);

  /* ---- Stats for Navbar ---- */
  const totalChapters = stories.reduce((sum: number, s: any) => sum + (s.currentChapter || 0), 0);
  const completedCount = stories.filter((s: any) => s.status === "completed").length;
  const ratedStories = stories.filter((s: any) => s.rating > 0);
  const avgRating = ratedStories.length
    ? ratedStories.reduce((sum: number, s: any) => sum + s.rating, 0) / ratedStories.length : 0;

  /* ---- Bulk actions ---- */
  const toggleSelectAll = () => {
    if (selectedIds.size === visibleItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleItems.map((s: any) => s.id)));
  };

  const confirmBulkDelete = () => {
    selectedIds.forEach(id => deleteStory(id));
    setSelectedIds(new Set()); setBulkMode(false); setBulkDeleteConfirm(false);
  };

  const handleBulkStatus = (status: StoryStatus) => {
    selectedIds.forEach(id => updateStory(id, { status }));
    setSelectedIds(new Set()); setBulkMode(false);
  };

  const onOpenSources = (ids?: Set<string>) => {
    const targetIds = ids || selectedIds;
    const urls: string[] = [];
    Array.from(targetIds).forEach(id => {
      const story = stories.find(s => s.id === id);
      if (!story || !story.sources?.length) return;
      const maxSource = story.sources.reduce((max: any, src: any) =>
        (src.currentChapter || 0) > (max.currentChapter || 0) ? src : max);
      if (maxSource?.url) urls.push(maxSource.url);
    });
    if (urls.length === 0) return;
    if (urls.length > 3 && !window.confirm(`Open ${urls.length} tabs at once?`)) return;

    const seen = localStorage.getItem("jejakbaca_popup_guide_seen");
    if (!seen) {
      localStorage.setItem("jejakbaca_popup_guide_seen", "true");
      setPopupDialog({ open: true, urls });
      return;
    }
    
    urls.forEach(rawUrl => {
    const base = rawUrl.startsWith("http")
      ? rawUrl
      : "https://" + rawUrl;
    const isInfoSite =
      /myanimelist\.net|anilist\.co|mangaupdates\.com|kitsu\.io/.test(base);
    const cleanBase = base.replace(/\/+$/, "");
    const story = stories.find(s =>
      s.sources?.some(src => src.url === rawUrl)
    );
    const bestSource = story?.sources?.reduce((max: any, src: any) =>
      (src.currentChapter || 0) > (max.currentChapter || 0) ? src : max
    );
    const finalUrl =
      isInfoSite || cleanBase.includes("?")
        ? cleanBase
        : `${cleanBase}/chapter-${bestSource?.currentChapter || 0}/`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  });
    setSelectedIds(new Set()); setBulkMode(false);
  };

  const handlePlusOne = (id: string) => {
    const story = stories.find(s => s.id === id);
    if (!story) return;
    updateStory(id, {
      currentChapter: (story.currentChapter || 0) + 1,
      chapterUpdatedAt: new Date().toISOString(),
    });
    navigate(`/story/${id}`);
  };

  const handleSearchChange = (val: string) => {
    if (val === "##") { setSearch(""); setVaultOpen(true); return; }
    setShowAllSearchResults(false);
    setSearch(val);
  };

  const handleSearchCommit = (val: string) => {
    setSearch(val);
    setPage(1);
    setLoadMoreMode(false);
    setShowAllSearchResults(true);
  };

  const handleResetLibrary = () => {
    setSearch("");
    setAdvFilters(EMPTY_FILTERS);
    setShowAllSearchResults(false);
    setSearchParams({}, { replace: true });
  };

  const showPullOverlay = !vaultUnlocked && pullProgress > 0.02;

  /* ================================================================ */
  return (
    <div className="flex flex-col min-h-screen bg-background" ref={pageRef}>

      {/* Noise texture */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Navbar */}
      {!vaultUnlocked ? (
        <Navbar
          variant="library"
          search={search}
          onSearchChange={handleSearchChange}
          onSearchCommit={handleSearchCommit}
          filters={advFilters}
          onFiltersChange={setAdvFilters}
          filterCount={advFilterCount}
          onReset={handleResetLibrary}
          allTags={allTags}
          storiesCount={stories.length}
          totalChapters={totalChapters}
          completedCount={completedCount}
          avgRating={avgRating}
          ctaPreference={ctaPreference}
          onCtaChange={handleCtaChange}
        />
      ) : (
        <VaultNavbar
          hiddenCount={hiddenStoriesCount}
          search={search}
          onSearchChange={handleSearchChange}
          onSearchCommit={handleSearchCommit}
          onBack={() => { lockVault(); setVaultUnlocked(false); setSearch(""); }}
          filterCount={advFilterCount}
          onOpenFilter={() => setVaultFilterOpen(true)}
          onOpenLists={() => setVaultListOpen(true)}
          stories={filtered}
        />
      )}

      {/* Main content */}
      <main className={`relative z-10 flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-7xl w-full mx-auto ${isMobile ? "pb-32" : "pb-16"}`}>

        {/* Hero */}
        {heroStory && !loading && (
          <HeroSection story={heroStory} onPlusOne={handlePlusOne} isVault={vaultUnlocked} />
        )}

        {/* Toolbar */}
        {!loading && (
          <div className="flex items-center justify-between gap-4 pb-2 group">
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground font-medium">{visibleItems.length} results</span>
              <SortMenu
                sortBy={sortBy} setSortBy={setSortBy}
                sortMenuOpen={sortMenuOpen} setSortMenuOpen={setSortMenuOpen}
                advFilters={advFilters}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 transition-all whitespace-nowrap max-w-[140px]"
                >
                  <span className="truncate">"{search}"</span>
                  <X size={10} className="shrink-0" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center bg-secondary rounded-xl p-0.5 border border-border">
                <button onClick={() => { setViewMode("grid"); localStorage.setItem("jejakbaca_view_mode", "grid"); }}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${viewMode === "grid" ? "bg-primary/20 text-primary border border-primary/50 shadow-sm" : "text-muted-foreground hover:text-foreground active:scale-90"}`}>
                  <LayoutGrid size={15} />
                </button>
                <button onClick={() => { setViewMode("timeline"); localStorage.setItem("jejakbaca_view_mode", "timeline"); }}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${viewMode === "timeline" ? "bg-primary/20 text-primary border border-primary/50 shadow-sm" : "text-muted-foreground hover:text-foreground active:scale-90"}`}>
                  <AlignJustify size={15} />
                </button>
              </div>
              <button
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                className={`p-2 rounded-md border transition-all duration-200 ${bulkMode ? "bg-primary text-primary-foreground border-primary shadow-sm active:scale-90" : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground active:scale-90"}`}>
                <CheckSquare size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Select all row */}
        {bulkMode && visibleItems.length > 0 && (
          <div className="flex items-center justify-end text-xs text-muted-foreground pb-2">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 hover:text-foreground transition-colors">
              {selectedIds.size === visibleItems.length ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} />}
              {selectedIds.size === visibleItems.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && <EmptyState isVault={vaultUnlocked} />}

        {/* Grid */}
        {!loading && filtered.length > 0 && viewMode === "grid" && (
          <GridView
            displayedItems={displayedItems}search={search} vaultUnlocked={vaultUnlocked}
            bulkMode={bulkMode} selectedIds={selectedIds}
            setSelectedIds={setSelectedIds} setQuickView={setQuickView}
          />
        )}

        {/* Timeline */}
        {!loading && filtered.length > 0 && viewMode === "timeline" && (
          <TimelineView
            displayedItems={displayedItems}vaultUnlocked={vaultUnlocked}
            bulkMode={bulkMode} selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        )}

        {!loading && !showAllResults && filtered.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-between gap-4 pt-4">
            {page < totalPages ? (
              <button
                onClick={() => { setLoadMoreMode(true); setPage(p => p + 1); }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                <ChevronRight size={16} className="rotate-90" /> Load More 
              </button>
            ) : <div />}

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => { setLoadMoreMode(false); setPage(p => p - 1); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} className="rotate-180" />
              </button>
              {(() => {
                const pages: (number | "...")[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (page > 3) pages.push("...");
                  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                  if (page < totalPages - 2) pages.push("...");
                  pages.push(totalPages);
                }
                return pages.map((p, i) => p === "..."
                  ? <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-xs">…</span>
                  : <button key={p}
                      onClick={() => { setLoadMoreMode(false); setPage(p as number); }}
                      className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${page === p ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                      {p}
                    </button>
                );
              })()}
              <button
                disabled={page === totalPages}
                onClick={() => { setLoadMoreMode(false); setPage(p => p + 1); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Vault hint */}
        {!vaultUnlocked && showVaultHint && (
          <div className="flex flex-col items-center gap-2 pt-8 pb-4 opacity-20 select-none pointer-events-none">
            <Lock size={16} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
              {isMobile ? "Pull down from top" : "Scroll up from top"} to open vault
            </span>
          </div>
        )}
      </main>

      {/* Desktop footer */}
      {!isMobile && !vaultUnlocked && (
        <footer className="border-t border-border px-6 py-4 mt-auto relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <BookOpen size={12} className="text-primary" />
              <span className="font-bold text-foreground/70 tracking-widest">JEJAKBACA</span>
            </div>
            <span>{stories.length} stories saved</span>
          </div>
        </footer>
      )}

      {/* Pull overlay */}
      {showPullOverlay && <VaultTopReveal progress={pullProgress} triggered={pullTriggered} />}

      {/* Bulk action bar */}
      {bulkMode && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          selectedIds={selectedIds}
          onClose={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteConfirm(true)}
          onStatusChange={handleBulkStatus}
          onOpenSources={onOpenSources}
        />
      )}

      {/* Bulk delete confirm dialog */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-sm overflow-hidden w-[92vw] mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 to-background pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center pt-4 pb-2">
              <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4 shadow-lg shadow-destructive/10">
                <Trash2 className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Delete {selectedIds.size} {selectedIds.size === 1 ? "Story" : "Stories"}?</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Selected stories will be permanently deleted.</p>
              <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="text-[11px] text-destructive font-medium">You can't undo this action</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button className="w-full h-11 font-bold text-sm rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center gap-2 shadow-lg hover:bg-destructive/90 transition-all active:scale-95" onClick={confirmBulkDelete}>
                <Trash2 className="w-4 h-4" />Yes, delete all
              </button>
              <button className="w-full h-11 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground" onClick={() => setBulkDeleteConfirm(false)}>
                No, keep them
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick view */}
      <>
        {quickView && (
          <QuickViewModal
            story={quickView}
            onClose={() => setQuickView(null)}
            onNavigate={(id: string) => {
              navigate(`/story/${id}`, { state: { fromVault: vaultUnlocked } });
              setQuickView(null);
            }}
          />
        )}

        {/* Popup permission dialog */}
        <PopupPermissionDialog
          open={popupDialog.open}
          urls={popupDialog.urls}
          onClose={() => setPopupDialog({ open: false, urls: [] })}
          onDone={() => {
            setSelectedIds(new Set());
            setBulkMode(false);
          }}
        />
      </>

      {/* Vault unlock dialog */}
      <VaultDialog
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onUnlocked={() => { setVaultUnlocked(true); setVaultOpen(false); }}
      />

      {/* Vault list panel */}
      <VaultListPanel
        open={vaultListOpen}
        onClose={() => setVaultListOpen(false)}
        listsMap={hiddenStoriesMap}
        onCreated={() => setListVersion(v => v + 1)}
      />

      {/* Vault filter panel */}
      {vaultUnlocked && (
        <FilterPanel
          open={vaultFilterOpen}
          onClose={() => setVaultFilterOpen(false)}
          filters={advFilters}
          onChange={setAdvFilters}
          allTags={allTags}
        />
      )}
      <ScrollToTop />
    </div>
  );
}

export default Library;
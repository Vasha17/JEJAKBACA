import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useStories } from "@/lib/StoryContext";
import {
  BookOpen, X, ChevronRight, Flame, Clock, CheckCircle2, BookMarked, PauseCircle,
  LayoutGrid, AlignJustify, Star, Play, Layers, Eye, Check, CheckSquare,
  Square, Trash2, Settings, BookIcon, ExternalLink, ArrowUpDown, PlusCircle, Timer,
  AlertCircle, Lock, LockOpen, ArrowLeft, Search, FilterIcon,
} from "lucide-react"; // Added LockOpen import
import { StoryStatus, getGlobalTags } from "@/lib/types";
import { Dialog, DialogContent } from "@/component/ui/dialog";
import "flag-icons/css/flag-icons.min.css";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar, Filters, EMPTY_FILTERS, FilterPanel } from "@/component/Navbar";
import { VaultDialog } from "@/component/VaultDialog";
import { useAuth } from "@/component/Auth";
import { isVaultUnlocked, lockVault } from "@/lib/vaultUtils";

/* --- CONSTANTS --- */
const STATUS_OPTIONS = [
  { value: "reading",       label: "Reading",      icon: <Play size={13}/>,         color: "text-green-400" },
  { value: "completed",     label: "Completed",    icon: <CheckCircle2 size={13}/>, color: "text-blue-400" },
  { value: "on-hold",       label: "On Hold",      icon: <PauseCircle size={13}/>,  color: "text-yellow-400" },
  { value: "hiatus",        label: "Hiatus",       icon: <BookMarked size={13}/>,   color: "text-orange-400" },
  { value: "plan-to-read",  label: "Plan to Read", icon: <BookMarked size={13}/>,   color: "text-purple-400" },
  { value: "dropped",       label: "Dropped",      icon: <X size={13}/>,            color: "text-red-400" },
  { value: "re-reading",    label: "Re-reading",   icon: <Layers size={13}/>,       color: "text-pink-400" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Updated", icon: <Clock size={13} className="text-muted-foreground" /> },
  { value: "added",  label: "Recently Added",   icon: <PlusCircle size={13} className="text-muted-foreground" /> },
  { value: "rating", label: "Highest Rating",   icon: <Star size={13} className="text-muted-foreground" /> },
  { value: "title",  label: "Title A–Z",        icon: <ArrowUpDown size={13} className="text-muted-foreground" /> },
  { value: "unread", label: "Long Unread",      icon: <Timer size={13} className="text-muted-foreground" /> },
];

const STATUS_COLORS: Record<string, string> = {
  "reading": "#22c55e", "completed": "#3b82f6", "on-hold": "#eab308",
  "dropped": "#ef4444", "plan-to-read": "#6b7280", "re-reading": "#a855f7",
};

const FORMAT_MAP: Record<string, string> = {
  JP: "Manga", KR: "Manhwa", CN: "Manhua", TW: "Manhua", ID: "Komik", US: "Comic",
};

/* --- UTILS --- */
const getStatusInfo = (s: string) =>
  STATUS_OPTIONS.find(o => o.value === s) ?? STATUS_OPTIONS[3];

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((p, i) => p.toLowerCase() === query.toLowerCase()
    ? <span key={i} className="text-primary font-bold bg-primary/10 rounded px-0.5">{p}</span> : p)}</>;
};

/* --- HERO ROTATION --- */
function pickHeroStory(stories: any[]): any | null {
  if (!stories || stories.length === 0) return null;
  const candidates = stories.filter(
    (s: any) => s.status === "reading" || s.status === "re-reading"
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const sorted = [...candidates].sort((a: any, b: any) => {
    const tA = new Date(a.chapterUpdatedAt || a.updatedAt || 0).getTime();
    const tB = new Date(b.chapterUpdatedAt || b.updatedAt || 0).getTime();
    return tA - tB;
  });
  const LAST_KEY = "jejakbaca_hero_last_id";
  const lastId   = localStorage.getItem(LAST_KEY) ?? "";
  const lastIdx  = sorted.findIndex(s => s.id === lastId);
  const halfLen  = Math.max(1, Math.floor(sorted.length / 2));
  const longUnread = sorted.slice(0, halfLen).filter((_, i) => i !== lastIdx);
  let nextIdx: number;
  if (longUnread.length > 0 && Math.random() < 0.4) {
    nextIdx = sorted.indexOf(longUnread[Math.floor(Math.random() * longUnread.length)]);
  } else {
    nextIdx = (lastIdx + 1) % sorted.length;
  }
  const chosen = sorted[nextIdx] ?? sorted[0];
  localStorage.setItem(LAST_KEY, chosen.id);
  return chosen;
}

/* --- COMPONENTS --- */

/* 1. Top Reveal Vault */
function VaultTopReveal({ progress, triggered }: { progress: number; triggered: boolean }) {
  const translateY = -80 + progress * 80;
  const opacity = Math.min(1, progress * 1.5);
  return (
    <div
      className="fixed inset-x-0 z-50 flex flex-col items-center pointer-events-none"
      style={{
        top: 0,
        transform: `translateY(${translateY}px)`,
        opacity,
        transition: triggered ? "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
    >
      <div
        className="absolute top-0 inset-x-0 transition-all duration-300"
        style={{
          height: 120,
          background: triggered
            ? "radial-gradient(ellipse 70% 100px at 50% 0%, hsl(var(--primary) / 0.35), transparent)"
            : "radial-gradient(ellipse 70% 100px at 50% 0%, hsl(var(--primary) / 0.15), transparent)",
        }}
      />
      <div
        className="relative flex items-center gap-2.5 px-5 py-3 mt-2 rounded-2xl border backdrop-blur-md transition-all duration-200"
        style={{
          background: triggered ? "hsl(var(--primary) / 0.2)" : "hsl(var(--card) / 0.85)",
          borderColor: triggered ? "hsl(var(--primary) / 0.6)" : "hsl(var(--border) / 0.5)",
          boxShadow: triggered ? "0 8px 32px hsl(var(--primary) / 0.3)" : "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <Lock size={16} style={{ color: triggered ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
        <span
          className="text-[12px] font-bold tracking-wide transition-colors duration-200"
          style={{ color: triggered ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
        >
          {triggered ? "Release to open vault" : "Keep pulling…"}
        </span>
      </div>
    </div>
  );
}

/* 2. Vault Navbar */
function VaultNavbar({
  hiddenCount, search, onSearchChange, onBack, filterCount, onOpenFilter,
}: {
  hiddenCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  onBack: () => void;
  filterCount: number;
  onOpenFilter: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange("");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && searchOpen) closeSearch(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [searchOpen]);

  return (
    <div className="sticky top-0 z-20 w-full border-b border-border bg-background/90 backdrop-blur-sm">      
      <div className="flex items-center h-20 px-4 sm:px-6 max-w-7xl mx-auto gap-3 relative">
        
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Center: Badge */}        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-1.5 border border-border pointer-events-auto">
            <Lock size={12} className="text-primary font-bold" />
            <span className="text-sm font-bold text-foreground tracking-wide">Private Stories</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {hiddenCount} hidden {hiddenCount === 1 ? "story" : "stories"}
          </p>
        </div>

        {/* Right: search expand + filter + lock */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Expandable search */}
          <div
            className={`flex items-center overflow-hidden transition-all duration-300 rounded-xl border bg-secondary
              ${searchOpen ? "w-36 sm:w-52 border-border/80 px-2.5" : "w-9 border-transparent"}`}
            style={{ height: 36 }}
          >
            {searchOpen ? (
              <>
                <Search size={13} className="text-muted-foreground shrink-0 mr-2" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search vault…"
                  className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground min-w-0"
                />
                {search && (
                  <button onClick={() => onSearchChange("")} className="text-muted-foreground hover:text-foreground ml-1 shrink-0">
                    <X size={11} />
                  </button>
                )}
                <button onClick={closeSearch} className="text-muted-foreground hover:text-foreground ml-1.5 shrink-0">
                  <X size={13} />
                </button>
              </>
            ) : (
              <button
                onClick={openSearch}
                className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search size={16} />
              </button>
            )}
          </div>

          {/* Filter */}
          <button
            onClick={onOpenFilter}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all
              ${filterCount > 0
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
          >
            <FilterIcon size={16} />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-card" />
            )}
          </button>
          
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
            <LockOpen size={15} className="text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* 3. Quick View Modal */
function QuickViewModal({ story, onClose, onNavigate }: {
  story: any; onClose: () => void; onNavigate: (id: string) => void;
}) {
  const isMobile = useIsMobile();
  const si = getStatusInfo(story.status);
  const fmt = FORMAT_MAP[(story.originCountry || "").toUpperCase()] || null;
  const latestCh = story.sources?.length
    ? Math.max(...story.sources.map((s: any) => s.currentChapter || 0))
    : story.currentChapter || 0;

  const CoverBlock = ({ className = "" }: { className?: string }) => (
    <div className={`relative bg-secondary overflow-hidden ${className}`}>
      <div className="absolute inset-0">
        {story.coverUrl
          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-14 h-14 text-muted-foreground/15" /></div>}
      </div>
      <div className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: "75%", background: "linear-gradient(to top, rgba(0,0,0,0.90), transparent)" }} />
      <div className="absolute bottom-0 inset-x-0 p-4 space-y-2.5 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <Star size={13} className="fill-amber-400 text-amber-400 shrink-0 mb-0.5" />
          <span className="text-2xl font-black text-amber-400 leading-none">{story.rating || "—"}</span>
          <span className="text-[11px] text-white/40 self-end">/10</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <BookOpen size={11} className="text-white/60 shrink-0" />
            <span className="text-xs font-bold text-white">
              {story.currentChapter}
              {latestCh > story.currentChapter && <span className="text-white/40 font-normal"> / {latestCh}</span>}
              <span className="text-white/40 text-[10px] font-normal"> ch</span>
            </span>
          </div>
          {latestCh > 0 && (
            <div className="h-0.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                style={{ width: `${Math.min(100, (story.currentChapter / latestCh) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {story.originCountry && <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm`} style={{ width: 18, height: 13 }} />}
          {fmt && <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">{fmt}</span>}
        </div>
      </div>
    </div>
  );

  const DetailContent = () => (
    <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3 space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 pr-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
          style={{ backgroundColor: `${STATUS_COLORS[story.status]}15`, color: STATUS_COLORS[story.status], borderColor: `${STATUS_COLORS[story.status]}30` }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[story.status] }} />{si.label}
        </span>
        {story.demographic && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/80 text-muted-foreground border border-border">
            {story.demographic}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <h2 className="font-bold text-foreground leading-snug tracking-tight"
          style={{ fontSize: "clamp(1rem,2.4vw,1.25rem)" }}>{story.title}</h2>
        {story.altTitle && <p className="text-[12px] text-muted-foreground/60 italic line-clamp-1">{story.altTitle}</p>}
        {story.author && <p className="text-[12px] text-muted-foreground/50 font-medium">{story.author}</p>}
      </div>
      <div className="h-px bg-white/10" />
      <p className="leading-relaxed text-foreground/70 line-clamp-4" style={{ fontSize: "clamp(0.78rem,1.5vw,0.875rem)" }}>
        {story.synopsis || <span className="italic text-muted-foreground/40">No synopsis available.</span>}
      </p>
      {(story.genres?.length > 0 || story.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {story.genres?.slice(0, 5).map((g: string) => (
            <span key={g} className="px-2 py-[4px] rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">{g}</span>
          ))}
          {story.tags?.slice(0, 5).map((tag: string) => (
            <span key={tag} className="px-2 py-[4px] rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-400/20">{tag}</span>
          ))}
        </div>
      )}
      {story.sources?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/50 uppercase">Where to Read</p>
          <div className="grid grid-cols-3 gap-1.5">
            {story.sources.slice(0, 3).map((src: any) => (
              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex flex-col px-2.5 py-2 rounded-lg border bg-secondary/40 border-border/50 hover:bg-secondary hover:border-primary/40 transition-all">
                <span className="text-[11px] font-semibold text-foreground truncate">{src.name}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                  {src.language ? `${src.language} · ` : ""}Ch {src.currentChapter}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const CTABar = () => (
    <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
      <button onClick={() => onNavigate(story.id)}
        className="group w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl font-bold text-sm
          bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
        View Series
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </button>
    </div>
  );

  return (
    <>
      {!isMobile && (
        <Dialog open onOpenChange={onClose}>
          <DialogContent className="p-0 gap-0 border-0 bg-transparent shadow-none max-w-5xl w-[calc(100vw-2rem)]" style={{ borderRadius: 0 }}>
            <div className="relative overflow-hidden flex flex-row"
              style={{ height: "75vh", maxHeight: "75vh", borderRadius: "20px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 32px 80px rgba(0,0,0,0.45)" }}>
              <CoverBlock className="flex-shrink-0 w-[clamp(200px,30%,300px)]" />
              <div className="flex-1 flex flex-col min-w-0 h-full">
                <button onClick={onClose}
                  className="absolute top-4 right-4 z-50 w-7 h-7 rounded-full flex items-center justify-center bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <X size={13} />
                </button>
                <DetailContent />
                <CTABar />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {isMobile && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: "92vh", background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))", boxShadow: "0 -24px 60px rgba(0,0,0,0.4)" }}>
            <div className="flex justify-center pt-3 shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <button onClick={onClose}
              className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
              <X size={13} />
            </button>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="flex gap-3 items-stretch px-4 pt-4 pb-4">
                <div className="w-[88px] shrink-0 rounded-xl overflow-hidden bg-secondary shadow-lg" style={{ aspectRatio: "3/4" }}>
                  {story.coverUrl
                    ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookIcon className="w-8 h-8 text-muted-foreground/20" /></div>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{ backgroundColor: `${STATUS_COLORS[story.status]}15`, color: STATUS_COLORS[story.status], borderColor: `${STATUS_COLORS[story.status]}30` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[story.status] }} />{si.label}
                    </span>
                    {fmt && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">{fmt}</span>}
                    {story.demographic && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">{story.demographic}</span>}
                  </div>
                  <h2 className="text-[15px] font-black text-foreground leading-snug line-clamp-2">{story.title}</h2>
                  {story.altTitle && <p className="text-[11px] text-muted-foreground/60 italic line-clamp-1 mt-0.5">{story.altTitle}</p>}
                  {story.author && <p className="text-[11px] text-muted-foreground/50 mt-0.5">{story.author}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-sm font-black text-amber-400">{story.rating || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen size={11} />
                      <span className="text-xs font-semibold">
                        {story.currentChapter}
                        {latestCh > story.currentChapter && <span className="text-muted-foreground/40"> / {latestCh}</span>}
                        <span className="text-muted-foreground/40"> ch</span>
                      </span>
                    </div>
                    {story.originCountry && (
                      <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm`} style={{ width: 16, height: 11 }} />
                    )}
                  </div>
                </div>
              </div>
              <div className="h-px bg-border/60 mx-4" />
              <div className="px-4 pt-4 pb-6 space-y-4">
                <p className="text-[13px] text-foreground/70 leading-relaxed">
                  {story.synopsis || <span className="italic text-muted-foreground/40">No synopsis available.</span>}
                </p>
                {(story.genres?.length > 0 || story.tags?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {story.genres?.map((g: string) => (
                      <span key={g} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">{g}</span>
                    ))}
                    {story.tags?.map((tag: string) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-400/20">{tag}</span>
                    ))}
                  </div>
                )}
                {story.sources?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">Where to Read</p>
                    <div className="grid grid-cols-3 gap-2">
                      {story.sources.slice(0, 3).map((src: any) => (
                        <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="flex flex-col px-3 py-2.5 rounded-xl border bg-secondary/50 border-border/60 hover:border-primary/40 transition-all">
                          <span className="text-[12px] font-bold text-foreground truncate">{src.name}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                            {src.language ? `${src.language} · ` : ""}Ch {src.currentChapter}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
              <button onClick={() => onNavigate(story.id)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm
                  bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
                View Series
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* 4. Hero Section */
function HeroSection({ story }: { story: any }) {
  if (!story) return null;
  const daysSinceUpdate = useMemo(() => {
    const ts = new Date(story.chapterUpdatedAt || story.updatedAt || 0).getTime();
    return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  }, [story]);
  const isLongUnread = daysSinceUpdate >= 7;
  return (
    <div className="relative rounded-2xl overflow-hidden mb-6 group border border-border/50 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      {story.headerUrl
        ? <div className="absolute inset-0 scale-110 blur-2xl opacity-40 transition-transform duration-700 group-hover:scale-125" style={{ backgroundImage: `url(${story.headerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        : <div className="absolute inset-0 scale-110 blur-2xl opacity-40 bg-primary/20" />}
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent backdrop-blur-[2px]" />
      <div className="relative flex items-center gap-5 p-5 sm:p-7">
        <div className="flex-shrink-0 w-20 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 z-10 bg-secondary transition-transform duration-500 group-hover:scale-[1.03]">
          {story.coverUrl
            ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-muted-foreground/30" /></div>}
        </div>
        <div className="flex-1 min-w-0 space-y-2 z-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/80 flex items-center gap-1.5">
            {isLongUnread
              ? <><Timer size={11} className="text-amber-400" /><span className="text-amber-400">Haven't read in {daysSinceUpdate}d</span></>
              : <><Flame size={11} className="text-orange-400" /> Continue Reading</>}
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight line-clamp-2">{story.title}</h2>
          {story.author && <p className="text-xs text-muted-foreground">{story.author}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star size={11} className="fill-yellow-400 text-yellow-400" />{story.rating || "—"}</span>
            <span>Ch. {story.currentChapter}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Link to={`/story/${story.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
              <Play size={13} fill="currentColor" /> Continue Reading
            </Link>
            <Link to={`/story/${story.id}`}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-all active:scale-95">
              <BookOpen size={13} />
              <span className="hidden sm:inline">+1 Chapter</span>
              <span className="sm:hidden">+1</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 5. Bulk Action Bar */
function BulkActionBar({ count, onClose, onDelete, onStatusChange, onOpenSources }: {
  count: number; onClose: () => void; onDelete: () => void;
  onStatusChange: (status: StoryStatus) => void; onOpenSources: (ids?: Set<string>) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  return (
    <div className="fixed bottom-24 left-3 right-3 sm:bottom-8 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 z-20 bg-card border border-border rounded-2xl shadow-2xl p-2 flex items-center gap-1 animate-in slide-in-from-bottom-4">
      <span className="text-xs font-bold text-foreground px-1 mx-0.5 shrink-0">{count} Selected</span>
      <div className="h-4 w-px bg-border mx-0.5 shrink-0" />
      <div className="relative shrink-0">
        <button onClick={() => setStatusOpen(prev => !prev)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:bg-secondary text-foreground transition-colors shrink min-w-0">
          <Settings size={14} className="shrink-0" /><span className="truncate">Status</span>
          <ChevronRight size={12} className={`transition-transform ${statusOpen ? "rotate-90" : ""} shrink-0`} />
        </button>
        {statusOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-0.5 bg-card border border-border rounded-lg shadow-xl overflow-hidden w-[40vw] max-w-[200px] p-1 z-[100]">
            {STATUS_OPTIONS.map(s => (
              <button key={s.value}
                onClick={() => { onStatusChange(s.value as StoryStatus); setStatusOpen(false); }}
                className="text-left px-2 py-1.5 text-xs hover:bg-secondary rounded flex items-center gap-2 text-muted-foreground hover:text-foreground whitespace-nowrap">
                <span className={s.color}>{s.icon}</span> {s.label}
              </button>
            ))}
            <button onClick={() => { onOpenSources(); setStatusOpen(false); }}
              className="text-left px-2 py-1.5 text-xs hover:bg-blue-500/10 rounded flex items-center gap-2 text-muted-foreground hover:text-blue-500 border-t border-border/50 whitespace-nowrap">
              <ExternalLink size={14} className="text-blue-500" /> Open Sources
            </button>
          </div>
        )}
      </div>
      <button onClick={() => onOpenSources()}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:bg-blue-500/10 text-blue-400 transition-colors shrink min-w-0">
        <ExternalLink size={14} className="shrink-0" /><span className="truncate">Open Tabs</span>
      </button>
      <button onClick={onDelete} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-500/10 text-red-500 transition-colors shrink min-w-0">
        <Trash2 size={14} className="shrink-0" /><span className="truncate">Delete</span>
      </button>
      <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

/* 6. Empty State */
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
          ? "No hidden stories yet. Mark stories as hidden from their detail page."
          : "Get started by adding your first story. Track your reading progress easily!"}
      </p>
    </div>
  );
}

/* --- MAIN LIBRARY COMPONENT --- */
function Library() {
  const { stories, updateStory, deleteStory } = useStories();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const SCROLL_THRESHOLD = isMobile ? 80 : 1500;
  const SCROLL_START_ZONE = 20;
  const { user } = useAuth();
  void user;
  
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [ctaPreference, setCtaPreference] = useState<"floating" | "inside">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jejakbaca_cta_pref");
      return (saved === "inside" || saved === "floating") ? saved : "floating";
    }
    return "floating";
  });
  const handleCtaChange = (val: "floating" | "inside") => {
    setCtaPreference(val); localStorage.setItem("jejakbaca_cta_pref", val);
  };

  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(() => isVaultUnlocked());
  const [showVaultHint, setShowVaultHint] = useState(() => {
    return !localStorage.getItem("jejakbaca_vault_hint_shown");
  });

  const [pullProgress, setPullProgress] = useState(0);
  const [pullTriggered, setPullTriggered] = useState(false);
  const pullTriggeredRef = useRef(false);
  const vaultUnlockedRef = useRef(vaultUnlocked);
  const wheelAccum = useRef(0);
  const wheelTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { vaultUnlockedRef.current = vaultUnlocked; }, [vaultUnlocked]);
  useEffect(() => {
    if (!showVaultHint) return;
    const t = setTimeout(() => {
      localStorage.setItem("jejakbaca_vault_hint_shown", "1");
      setShowVaultHint(false);
    }, 30000);
    return () => clearTimeout(t);
  }, [showVaultHint]);
  useEffect(() => { pullTriggeredRef.current = pullTriggered; }, [pullTriggered]);
  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overscrollBehavior = "none";
    return () => { document.body.style.overscrollBehavior = ""; };
  }, [isMobile]);

  const setPull = useCallback((progress: number) => {
    const triggered = progress >= 1;
    setPullProgress(progress);
    setPullTriggered(triggered);
    pullTriggeredRef.current = triggered;
  }, []);

  const resetPull = useCallback(() => {
    setPullProgress(0);
    setPullTriggered(false);
    pullTriggeredRef.current = false;
  }, []);
  
  const handleWheel = useCallback((e: WheelEvent) => {
    if (vaultUnlockedRef.current) return;
    if (window.scrollY > SCROLL_START_ZONE) { wheelAccum.current = 0; return; }
    if (e.deltaY < 0) {
      wheelAccum.current += Math.abs(e.deltaY);
      const progress = Math.min(1, wheelAccum.current / SCROLL_THRESHOLD);
      setPull(progress);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        if (pullTriggeredRef.current) setVaultOpen(true);
        wheelAccum.current = 0;
        resetPull();
      }, 400);
    } else {
      wheelAccum.current = 0;
      resetPull();
      if (wheelTimer.current) { clearTimeout(wheelTimer.current); wheelTimer.current = null; }
    }
  }, [setPull, resetPull, SCROLL_THRESHOLD, SCROLL_START_ZONE]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (vaultUnlockedRef.current) return;
    if (window.scrollY > SCROLL_START_ZONE) return; 
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = false;
  }, [SCROLL_START_ZONE]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (vaultUnlockedRef.current) return;
    
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY.current;

    // Hanya aktif kalau di paling atas halaman
    if (window.scrollY > SCROLL_START_ZONE) {
      if (isPulling.current) { isPulling.current = false; resetPull(); }
      return;
    }

    if (delta > 10) {
      isPulling.current = true;
      const progress = Math.min(1, (delta - 10) / SCROLL_THRESHOLD);
      setPull(progress);
    } else if (delta <= 0 && isPulling.current) {
      isPulling.current = false;
      resetPull();
    }
  }, [setPull, resetPull, SCROLL_START_ZONE, SCROLL_THRESHOLD]);

  const handleTouchEnd = useCallback(() => {
    if (vaultUnlockedRef.current) return;
    if (isPulling.current && pullTriggeredRef.current) setVaultOpen(true);
    isPulling.current = false;
    resetPull();
  }, [resetPull]);

  useEffect(() => {
    if (isMobile) return;
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => { window.removeEventListener("wheel", handleWheel); if (wheelTimer.current) clearTimeout(wheelTimer.current); };
  }, [isMobile, handleWheel]);

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

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [advFilters, setAdvFilters] = useState<Filters>(EMPTY_FILTERS);
  const [vaultFilterOpen, setVaultFilterOpen] = useState(false);
  const [quickView, setQuickView] = useState<any | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [heroStory, setHeroStory] = useState<any | null>(null);

  const hiddenStories = useMemo(() => stories.filter((s: any) => s.hidden), [stories]);

  useEffect(() => {
    const pool = vaultUnlocked ? hiddenStories : stories.filter((s: any) => !s.hidden);
    setHeroStory(pool.length > 0 ? pickHeroStory(pool) : null);
  }, [stories, vaultUnlocked, hiddenStories]);

  useEffect(() => {
    const tagsParam = searchParams.get("tags");
    if (tagsParam) {
      const tags = tagsParam.split(",").map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        setAdvFilters(prev => ({
          ...prev,
          tags: Object.fromEntries(tags.map(tag => [tag, "include" as const]))
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

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  const globalTags = getGlobalTags();
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    stories.forEach(s => s.tags?.forEach(t => tags.add(t)));
    globalTags.forEach(t => tags.add(t));
    return Array.from(tags).sort();
  }, [stories, globalTags]);

  type ItemState = "include" | "exclude";
  const applyAdvFilter = (dict: Record<string, ItemState>, val: string | string[]) => {
    const inc = Object.entries(dict).filter(([, v]) => v === "include").map(([k]) => k);
    const exc = Object.entries(dict).filter(([, v]) => v === "exclude").map(([k]) => k);
    const isArr = Array.isArray(val);
    if (inc.length) {
      if (isArr) { if (!inc.every(i => (val as string[]).includes(i))) return false; }
      else { if (!inc.includes(val as string)) return false; }
    }
    if (exc.length) {
      if (isArr) { if (exc.some(e => (val as string[]).includes(e))) return false; }
      else { if (exc.includes(val as string)) return false; }
    }
    return true;
  };

  const filtered = useMemo(() => {
    let result = stories.filter((s: any) => {
      const q = search.toLowerCase();
      const matchSearch = s.title.toLowerCase().includes(q) || s.author?.toLowerCase().includes(q);
      const matchStatus = Object.keys(advFilters.status).length === 0 || applyAdvFilter(advFilters.status, s.status ?? "");
      const matchTag = Object.keys(advFilters.tags).length === 0 || applyAdvFilter(advFilters.tags, s.tags ?? []);
      const matchRating = advFilters.rating === 0 || s.rating === advFilters.rating;
      return matchSearch && matchStatus && matchTag && matchRating;
    });
    if (Object.keys(advFilters.country).length) result = result.filter((s: any) => applyAdvFilter(advFilters.country, (s.originCountry || "").toUpperCase()));
    if (Object.keys(advFilters.demographic).length) result = result.filter((s: any) => applyAdvFilter(advFilters.demographic, s.demographic ?? ""));
    if (Object.keys(advFilters.genres).length) result = result.filter((s: any) => applyAdvFilter(advFilters.genres, s.genres ?? []));
    if (vaultUnlocked) result = result.filter((s: any) => s.hidden === true);
    else result = result.filter((s: any) => !s.hidden);
    if (sortBy === "recent") result.sort((a: any, b: any) => new Date(b.chapterUpdatedAt).getTime() - new Date(a.chapterUpdatedAt).getTime());
    else if (sortBy === "added") result.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else if (sortBy === "rating") result.sort((a: any, b: any) => b.rating - a.rating);
    else if (sortBy === "title") result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    else if (sortBy === "unread") result.sort((a: any, b: any) => new Date(a.chapterUpdatedAt || 0).getTime() - new Date(b.chapterUpdatedAt || 0).getTime());
    return result;
  }, [stories, search, sortBy, advFilters, vaultUnlocked]);

  const advFilterCount =
    Object.keys(advFilters.status).length + Object.keys(advFilters.country).length +
    Object.keys(advFilters.genres).length + Object.keys(advFilters.tags).length +
    (advFilters.rating > 0 ? 1 : 0);

  const totalChapters = stories.reduce((sum: number, s: any) => sum + (s.currentChapter || 0), 0);
  const completedCount = stories.filter((s: any) => s.status === "completed").length;
  const ratedStories = stories.filter((s: any) => s.rating > 0);
  const avgRating = ratedStories.length
    ? ratedStories.reduce((sum: number, s: any) => sum + s.rating, 0) / ratedStories.length : 0;

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((s: any) => s.id)));
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
    urls.forEach((url, i) => {
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      setTimeout(() => { a.click(); document.body.removeChild(a); }, i * 300);
    });
    setSelectedIds(new Set()); setBulkMode(false);
  };

  const currentSortOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[0];

  const handleSearchChange = (val: string) => {
    if (val === "##") { setSearch(""); setVaultOpen(true); return; }
    setSearch(val);
  };

  const showPullOverlay = !vaultUnlocked && pullProgress > 0.02;

  return (
    <div className="flex flex-col min-h-screen bg-background" ref={pageRef}>

      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {!vaultUnlocked ? (
        <Navbar
          variant="library"
          search={search}
          onSearchChange={handleSearchChange}
          filters={advFilters}
          onFiltersChange={setAdvFilters}
          filterCount={advFilterCount}
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
          hiddenCount={hiddenStories.length}
          search={search}
          onSearchChange={handleSearchChange}
          onBack={() => { lockVault(); setVaultUnlocked(false); setSearch(""); }}
          filterCount={advFilterCount}
          onOpenFilter={() => setVaultFilterOpen(true)}
        />
      )}

      <main className={`relative z-10 flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-7xl w-full mx-auto ${isMobile ? "pb-32" : "pb-16"}`}>

        {heroStory && !loading && <HeroSection story={heroStory} />}

        {!loading && (
          <div className="flex items-center justify-between gap-4 pb-2 group">
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground font-medium">{filtered.length} results</span>
              <div className="relative">
                <button
                  onClick={() => setSortMenuOpen(!sortMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border text-xs font-medium text-foreground transition-all"
                >
                  {currentSortOption.icon}
                  <span>{currentSortOption.label}</span>
                  <ChevronRight size={12} className={`transition-transform group-hover:translate-x-0.5 ${sortMenuOpen ? "rotate-90" : ""}`} />
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
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center bg-secondary rounded-xl p-0.5 border border-border">
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${viewMode === "grid" ? "bg-primary/20 text-primary border border-primary/50 shadow-sm" : "text-muted-foreground hover:text-foreground active:scale-90"}`}>
                  <LayoutGrid size={15} />
                </button>
                <button onClick={() => setViewMode("timeline")}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${viewMode === "timeline" ? "bg-primary/20 text-primary border border-primary/50 shadow-sm" : "text-muted-foreground hover:text-foreground active:scale-90"}`}>
                  <AlignJustify size={15} />
                </button>
              </div>
              <button title="Bulk Mode"
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                className={`p-2 rounded-md border transition-all duration-200 ${bulkMode ? "bg-primary text-primary-foreground border-primary shadow-sm active:scale-90" : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground active:scale-90"}`}>
                <CheckSquare size={15} />
              </button>
            </div>
          </div>
        )}

        {bulkMode && filtered.length > 0 && (
          <div className="flex items-center justify-end text-xs text-muted-foreground pb-2">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 hover:text-foreground transition-colors">
              {selectedIds.size === filtered.length ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} />}
              {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && <EmptyState isVault={vaultUnlocked} />}

        {!loading && filtered.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-3">
            {filtered.map((story: any, index) => {
              const isSelected = selectedIds.has(story.id);
              const statusInfo = getStatusInfo(story.status);
              return (
                <div key={story.id}
                  className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-secondary border border-border transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}>
                  {!bulkMode && <Link to={`/story/${story.id}`} className="absolute inset-0 z-0" />}
                  {story.coverUrl
                    ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    : <div className="w-full h-full flex items-center justify-center bg-card"><BookOpen className="w-10 h-10 text-muted-foreground/20" /></div>}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 pointer-events-none z-0" />
                  <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-1 max-w-[55%]">
                      {story.originCountry && <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm shadow-sm`} style={{ width: 14, height: 10 }} />}
                      <span className="text-[9px] font-bold text-white/80 truncate">{FORMAT_MAP[(story.originCountry || "").toUpperCase()]}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-full border border-white/10">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${story.status === 'reading' ? 'animate-pulse' : ''}`} style={{ backgroundColor: STATUS_COLORS[story.status] }} />
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
                    <Link to={`/story/${story.id}`} className="block">
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
        )}

        {!loading && filtered.length > 0 && viewMode === "timeline" && (
          <div className="space-y-1">
            {filtered.map((story: any, i: number) => {
              const date = new Date(story.chapterUpdatedAt);
              const prevDate = i > 0 ? new Date(filtered[i - 1].chapterUpdatedAt) : null;
              const showDate = !prevDate || date.toDateString() !== prevDate.toDateString();
              return (
                <div key={story.id} className="relative animate-fade-in-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                  {showDate && (
                    <div className="flex items-center gap-3 py-3 sticky top-0 bg-background/95 backdrop-blur z-10">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                        {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary transition-all group">
                    {bulkMode && (
                      <button onClick={() => {
                        const newSet = new Set(selectedIds);
                        if (newSet.has(story.id)) newSet.delete(story.id); else newSet.add(story.id);
                        setSelectedIds(newSet);
                      }} className="shrink-0">
                        {selectedIds.has(story.id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted-foreground" />}
                      </button>
                    )}
                    <Link to={`/story/${story.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-secondary group-hover:shadow-md transition-shadow">
                        {story.coverUrl
                          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                          : <BookOpen size={16} className="m-auto mt-4 text-muted-foreground/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{story.title}</p>
                        <p className="text-xs text-muted-foreground">Ch. {story.currentChapter} · {story.author}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star size={11} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">{story.rating || "—"}</span>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!vaultUnlocked && showVaultHint && (
          <div className="flex flex-col items-center gap-2 pt-8 pb-4 opacity-20 select-none pointer-events-none">
            <Lock size={16} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
              {isMobile ? "Pull down from top" : "Scroll up from top"} to open vault
            </span>
          </div>
        )}
      </main>

      {showVaultDialog && (
        <VaultDialog
          open={true}
          onClose={() => setShowVaultDialog(false)}
          onUnlocked={() => { setVaultUnlocked(true); setShowVaultDialog(false); }}
        />
      )}

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

      {showPullOverlay && (
        <VaultTopReveal progress={pullProgress} triggered={pullTriggered} />
      )}

      {bulkMode && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onClose={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteConfirm(true)}
          onStatusChange={handleBulkStatus}
          onOpenSources={() => onOpenSources(selectedIds)}
        />
      )}

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

      {quickView && (
        <QuickViewModal
          story={quickView}
          onClose={() => setQuickView(null)}
          onNavigate={(id) => { navigate(`/story/${id}`); setQuickView(null); }}
        />
      )}

      <VaultDialog
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onUnlocked={() => { setVaultUnlocked(true); setVaultOpen(false); }}
      />

      {vaultUnlocked && (
        <FilterPanel
          open={vaultFilterOpen}
          onClose={() => setVaultFilterOpen(false)}
          filters={advFilters}
          onChange={setAdvFilters}
          allTags={allTags}
        />
      )}
    </div>
  );
}

export default Library;
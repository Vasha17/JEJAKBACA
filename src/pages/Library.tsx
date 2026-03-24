import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useStories } from "@/lib/StoryContext";
import { AddStoryDialog } from "@/component/AddStoryDialog";
import {
  Search, BookOpen, Home, List, Download, Upload, Settings, User, X,
  ChevronRight, Flame, Clock, CheckCircle2, BookMarked, PauseCircle,
  LayoutGrid, AlignJustify, Star, Play, Layers, Eye, Check, CheckSquare,
  Square, MoreHorizontal, Trash2, Edit, Filter as FilterIcon,
  BookIcon, Sun, Moon, Palette, Keyboard, HardDrive, FileDown, FileUp,
  Camera, Plus, ExternalLink,
} from "lucide-react";
import { StoryStatus, getGlobalTags } from "@/lib/types";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/component/ui/dialog";
import "flag-icons/css/flag-icons.min.css";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemePicker } from "@/component/ThemePicker";
import { MemberCard } from "@/component/MemberCard";

/* ─── Constants ──────────────────────────────────────── */
type StatusFilter = StoryStatus | "all";

const STATUS_OPTIONS = [
  { value: "reading",      label: "Reading",      icon: <Play size={13}/>,         color: "text-green-400" },
  { value: "completed",    label: "Completed",    icon: <CheckCircle2 size={13}/>, color: "text-blue-400" },
  { value: "on-hold",      label: "On Hold",      icon: <PauseCircle size={13}/>,  color: "text-yellow-400" },
  { value: "plan-to-read", label: "Plan to Read", icon: <BookMarked size={13}/>,   color: "text-purple-400" },
  { value: "dropped",      label: "Dropped",      icon: <X size={13}/>,            color: "text-red-400" },
  { value: "re-reading",   label: "Re-reading",   icon: <Layers size={13}/>,       color: "text-pink-400" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Updated" },
  { value: "rating", label: "Highest Rating" },
  { value: "title",  label: "Title A–Z" },
];

const STATUS_COLORS: Record<string, string> = {
  "reading": "#22c55e", "completed": "#3b82f6", "on-hold": "#eab308",
  "dropped": "#ef4444", "plan-to-read": "#6b7280", "re-reading": "#a855f7"
};

const FORMAT_MAP: Record<string, string> = {
  JP: "Manga", KR: "Manhwa", CN: "Manhua", TW: "Manhua", ID: "Komik", US: "Comic",
};
const COUNTRY_OPTIONS = ["JP", "KR", "CN", "TW", "ID", "US"];
const DEMOGRAPHIC_OPTIONS = ["Shounen", "Shoujo", "Seinen", "Josei"];

const ALL_GENRES = [
  "Action","Adventure","Comedy","Drama","Ecchi","Fantasy","Gender Bender",
  "Gore","Historical","Horror","Isekai","LGBTQIA+","Magical Girls","Medical",
  "Mystery","Philosophical","Psychological","Romance","Sci-Fi","Shoujo Ai",
  "Shounen Ai","Slice of Life","Sports","Thriller","Tragedy","Wuxia","Yaoi","Yuri",
  "Coming of Age","Cooking","Crime","Demons","Harem","Magic","Martial Arts",
  "Mecha","Military","Monsters","Music","Omegaverse","Post-Apocalyptic",
  "Reincarnation","Reverse Harem","School Life","Supernatural","Survival",
  "Time Travel","Vampires","Video Games","Villainess",
];

const ACCENT_COLORS = [
  { name: "Amber",   value: "#f59e0b" },
  { name: "Blue",    value: "#3b82f6" },
  { name: "Green",   value: "#22c55e" },
  { name: "Purple",  value: "#a855f7" },
  { name: "Pink",    value: "#ec4899" },
  { name: "Red",     value: "#ef4444" },
  { name: "Cyan",    value: "#06b6d4" },
  { name: "Orange",  value: "#f97316" },
];

const getStatusInfo = (s: string) =>
  STATUS_OPTIONS.find(o => o.value === s) ?? STATUS_OPTIONS[3];

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"));
  return <>{parts.map((p,i) => p.toLowerCase()===query.toLowerCase()
    ? <span key={i} className="text-primary font-bold bg-primary/10 rounded px-0.5">{p}</span> : p)}</>;
};

/* ─── Filter Types ───────────────────────────────────── */
type ItemState = "include" | "exclude";
type Filters = {
  status:      Record<string, ItemState>;
  country:     Record<string, ItemState>;
  demographic: Record<string, ItemState>;
  genres:      Record<string, ItemState>;
  tags:        Record<string, ItemState>;
  rating:      number;
};
const EMPTY_FILTERS: Filters = { status:{}, country:{}, demographic:{}, genres:{}, tags:{}, rating: 0 };

function cycleState(cur: ItemState | undefined): ItemState | undefined {
  if (!cur) return "include";
  if (cur === "include") return "exclude";
  return undefined;
}

function pillStyle(state: ItemState | undefined, baseColor?: string) {
  if (state === "include") return {
    backgroundColor: baseColor ? `${baseColor}22` : "hsl(var(--primary) / 0.15)",
    color: baseColor ?? "hsl(var(--primary))",
    borderColor: baseColor ? `${baseColor}50` : "hsl(var(--primary) / 0.4)",
  };
  if (state === "exclude") return {
    backgroundColor: "#ef444420", color: "#ef4444", borderColor: "#ef444450",
  };
  return {};
}

/* ─── Filter Summary Chips ───────────────────────────── */
function FilterSummary({ filters, onRemove }: {
  filters: Filters; onRemove: (key: keyof Filters, val: string) => void;
}) {
  const includes: { key: keyof Filters; val: string; label: string }[] = [];
  const excludes: { key: keyof Filters; val: string; label: string }[] = [];
  const labelOf = (key: keyof Filters, val: string) => {
    if (key === "status") return STATUS_OPTIONS.find(s => s.value === val)?.label ?? val;
    if (key === "country") return FORMAT_MAP[val] ?? val;
    return val;
  };
  (Object.keys(filters) as (keyof Filters)[]).forEach(key => {
    if(key === "rating") return;
    Object.entries(filters[key]).forEach(([val, state]) => {
      const entry = { key, val, label: labelOf(key, val) };
      if (state === "include") includes.push(entry);
      else excludes.push(entry);
    });
  });

  if (!includes.length && !excludes.length && filters.rating === 0) return null;

  return (
    <div className="px-4 py-2 border-t border-border/50 space-y-1.5">
      {filters.rating > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black tracking-widest text-amber-400 uppercase shrink-0">Rating</span>
          <button onClick={() => onRemove("rating", "0")}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            {filters.rating} <X size={9}/>
          </button>
        </div>
      )}
      {includes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase shrink-0">Include</span>
          {includes.map(e => (
            <button key={`${e.key}-${e.val}`} onClick={() => onRemove(e.key, e.val)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400/60 transition-all">
              {e.label} <X size={9}/>
            </button>
          ))}
        </div>
      )}
      {excludes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black tracking-widest text-red-400 uppercase shrink-0">Exclude</span>
          {excludes.map(e => (
            <button key={`${e.key}-${e.val}`} onClick={() => onRemove(e.key, e.val)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:border-red-400/60 transition-all">
              {e.label} <X size={9}/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Pill Group ─────────────────────────────────────── */
function PillGroup({ label, items, filterKey, filters, onToggle }: {
  label: string;
  items: { val: string; display: React.ReactNode; color?: string }[];
  filterKey: keyof Filters;
  filters: Filters;
  onToggle: (key: keyof Filters, val: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(({ val, display, color }) => {
          const state = (filters[filterKey] as Record<string, ItemState>)[val];
          return (
            <button key={val} onClick={() => onToggle(filterKey, val)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-secondary text-muted-foreground border-border hover:border-border/80 hover:text-foreground transition-all duration-150"
              style={pillStyle(state, color)}>
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Filter Panel ───────────────────────────────────── */
function FilterPanel({ open, onClose, filters, onChange, allTags }: {
  open: boolean; onClose: () => void;
  filters: Filters; onChange: (f: Filters) => void;
  allTags: string[];
}) {
  const [tab, setTab] = useState<"status"|"genres"|"tags">("status");
  const [genreSearch, setGenreSearch] = useState("");
  const [tagSearch, setTagSearch] = useState(""); 

  const toggle = (key: keyof Filters, val: string) => {
    const cur = (filters[key] as Record<string, ItemState>)[val];
    const next = cycleState(cur);
    const updated = { ...(filters[key] as Record<string, ItemState>) };
    if (next) updated[val] = next; else delete updated[val];
    onChange({ ...filters, [key]: updated });
  };

  const clearOtherSearches = (currentTab: "status" | "genres" | "tags") => {
    if (currentTab === "genres") {
      setTagSearch("");
    } else if (currentTab === "tags") {
      setGenreSearch("");
    } else {
      setGenreSearch("");
      setTagSearch("");
    }
  }; 

  const removeChip = (key: keyof Filters, val: string) => {
    if (key === "rating") {
      onChange({ ...filters, rating: 0 });
    } else {
      const updated = { ...(filters[key] as Record<string, ItemState>) };
      delete updated[val];
      onChange({ ...filters, [key]: updated });
    }
  };

  const clearAll = () => onChange(EMPTY_FILTERS);

  const totalActive = (Object.keys(filters.status).length + Object.keys(filters.country).length + Object.keys(filters.genres).length + Object.keys(filters.tags).length) + (filters.rating > 0 ? 1 : 0);

  const filteredGenres = ALL_GENRES.filter(g =>
    g.toLowerCase().includes(genreSearch.toLowerCase())
  );

  if (!open) return null;

  const panelContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <FilterIcon size={14} className="text-primary"/>
          <span className="font-bold text-sm">Filter</span>
          {totalActive > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">{totalActive}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalActive > 0 && (
            <button onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
              Clear all
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={14} className="text-muted-foreground"/>
          </button>
        </div>
      </div>

      <div className="px-4 pt-2.5 pb-1 shrink-0">
        <p className="text-[10px] text-muted-foreground/50">
          Tap once = <span className="text-emerald-400 font-semibold">include</span> · Tap twice = <span className="text-red-400 font-semibold">exclude</span> · Tap again = reset
        </p>
      </div>

      <div className="flex border-b border-border shrink-0">
        {(["status","genres","tags"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); clearOtherSearches(t); }}
            className={`flex-1 py-2 text-xs font-bold capitalize transition-colors
              ${tab===t ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "status" ? "Details" : t}
          </button>
        ))} 
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "status" && (
          <>
            <div className="space-y-3">
               <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase">Rating</p>
               <div className="flex items-center gap-3">
                 <span className="text-xs font-bold text-foreground">{filters.rating}</span>
                 <input
                   type="range" min="0" max="10" step="1"
                   value={filters.rating}
                   onChange={(e) => onChange({...filters, rating: parseInt(e.target.value)})}
                   className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                 />
                 <span className="text-xs text-muted-foreground">10</span>
               </div>
            </div>
            <div className="h-px bg-border/50 my-4"/>
            <PillGroup label="Status" filterKey="status" filters={filters} onToggle={toggle}
              items={STATUS_OPTIONS.map(s => ({ val: s.value, display: s.label, color: STATUS_COLORS[s.value] }))}/>
            <PillGroup label="Country / Format" filterKey="country" filters={filters} onToggle={toggle}
              items={COUNTRY_OPTIONS.map(c => ({
                val: c,
                display: (
                  <span className="flex items-center gap-1.5">
                    <span className={`fi fi-${c.toLowerCase()} rounded-sm`} style={{ width:14, height:10 }}/>
                    {FORMAT_MAP[c] || c}
                  </span>
                ),
              }))}/>
            <PillGroup label="Demographic" filterKey="demographic" filters={filters} onToggle={toggle}
              items={DEMOGRAPHIC_OPTIONS.map(d => ({ val: d, display: d }))}/>
          </>
        )}
        {tab === "genres" && (
          <div>
            <div className="relative mb-3">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input placeholder="Search genres..." value={genreSearch} onChange={e => setGenreSearch(e.target.value)}
                className="w-full bg-secondary text-xs pl-8 pr-3 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"/>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredGenres.map(g => {
                const state = (filters.genres)[g];
                return (
                  <button key={g} onClick={() => toggle("genres", g)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-secondary text-muted-foreground border-border hover:border-border/80 transition-all duration-150"
                    style={pillStyle(state)}>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {tab === "tags" && (
          <div>
            <div className="relative mb-3">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input placeholder="Search tags..." 
                value={tagSearch} 
                onChange={e => setTagSearch(e.target.value)}
                className="w-full bg-secondary text-xs pl-8 pr-3 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"/>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.length > 0 ? allTags
                .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
                .map(t => {
                  const state = (filters.tags)[t];
                  return (
                    <button key={t} onClick={() => toggle("tags", t)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-secondary text-muted-foreground border-border transition-all duration-150"
                      style={pillStyle(state)}>
                      {t}
                    </button>
                  );
                }) : <p className="text-xs text-muted-foreground/50 italic">No tags yet.</p>}
            </div>
          </div>
        )}
      </div> 

      <FilterSummary filters={filters} onRemove={removeChip}/>

      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        <button onClick={onClose}
          className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all">
          Apply
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}>
          {panelContent}
        </div>
      </div>
      <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-start" onClick={onClose}>
        <div className="w-full bg-card border-b border-x border-border shadow-2xl flex flex-col rounded-b-3xl overflow-hidden animate-in slide-in-from-top duration-300"
          style={{ maxHeight: "60vh" }} onClick={e => e.stopPropagation()}>
          {panelContent}
        </div>
        <div className="flex-1"/>
      </div>
    </>
  );
}

/* ─── Quick View Modal ───────────────────────────────── */
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
          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-14 h-14 text-muted-foreground/15"/></div>}
      </div>
      <div className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height:"55%", background:"linear-gradient(to top, rgba(0,0,0,0.90), transparent)" }}/>
      <div className="absolute bottom-0 inset-x-0 p-4 space-y-2.5 pointer-events-none">
        <div className="flex items-baseline gap-1.5">
          <Star size={13} className="fill-amber-400 text-amber-400 shrink-0 mb-0.5"/>
          <span className="text-2xl font-black text-amber-400 leading-none">{story.rating || "—"}</span>
          <span className="text-[11px] text-white/40 self-end">/10</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <BookOpen size={11} className="text-white/60 shrink-0"/>
            <span className="text-xs font-bold text-white">
              {story.currentChapter}
              {latestCh > story.currentChapter && <span className="text-white/40 font-normal"> / {latestCh}</span>}
              <span className="text-white/40 text-[10px] font-normal"> ch</span>
            </span>
          </div>
          {latestCh > 0 && (
            <div className="h-0.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                style={{ width:`${Math.min(100,(story.currentChapter/latestCh)*100)}%` }}/>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {story.originCountry && <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm`} style={{ width:18, height:13 }}/>}
          {fmt && <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">{fmt}</span>}
        </div>
      </div>
    </div>
  );

  const DetailContent = () => (
    <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3 space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 pr-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
          style={{ backgroundColor:`${STATUS_COLORS[story.status]}15`, color:STATUS_COLORS[story.status], borderColor:`${STATUS_COLORS[story.status]}30` }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor:STATUS_COLORS[story.status] }}/>{si.label}
        </span>
        {story.demographic && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/80 text-muted-foreground border border-border">
            {story.demographic}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <h2 className="font-bold text-foreground leading-snug tracking-tight"
          style={{ fontSize:"clamp(1rem,2.4vw,1.25rem)" }}>{story.title}</h2>
        {story.altTitle && <p className="text-[12px] text-muted-foreground/60 italic line-clamp-1">{story.altTitle}</p>}
        {story.author   && <p className="text-[12px] text-muted-foreground/50 font-medium">{story.author}</p>}
      </div>
      <div className="h-px bg-white/10"/>
      <p className="leading-relaxed text-foreground/70 line-clamp-4" style={{ fontSize:"clamp(0.78rem,1.5vw,0.875rem)" }}>
        {story.synopsis || <span className="italic text-muted-foreground/40">No synopsis available.</span>}
      </p>
      {(story.genres?.length > 0 || story.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {story.genres?.slice(0,5).map((g:string) => (
            <span key={g} className="px-2 py-[4px] rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">{g}</span>
          ))}
          {story.tags?.slice(0,5).map((tag:string) => (
            <span key={tag} className="px-2 py-[4px] rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-400/20">{tag}</span>
          ))}
        </div>
      )}
      {story.sources?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/50 uppercase">Where to Read</p>
          <div className="grid grid-cols-3 gap-1.5">
            {story.sources.slice(0,3).map((src:any) => (
              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
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
    <div className="px-5 py-4 shrink-0" style={{ borderTop:"1px solid hsl(var(--border) / 0.5)" }}>
      <button onClick={() => onNavigate(story.id)}
        className="group w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl font-bold text-sm
          bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
        View Series
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  );

  return (
    <>
      {!isMobile && (
        <Dialog open onOpenChange={onClose}>
          <DialogContent className="p-0 gap-0 border-0 bg-transparent shadow-none max-w-5xl w-[calc(100vw-2rem)]" style={{ borderRadius:0 }}>
            <div className="relative overflow-hidden flex flex-row"
              style={{ height:"75vh", maxHeight:"75vh", borderRadius:"20px", background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", boxShadow:"0 32px 80px rgba(0,0,0,0.45)" }}>
              <CoverBlock className="flex-shrink-0 w-[clamp(200px,30%,300px)]"/>
              <div className="flex-1 flex flex-col min-w-0 h-full">
                <button onClick={onClose}
                  className="absolute top-4 right-4 z-50 w-7 h-7 rounded-full flex items-center justify-center bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <X size={13}/>
                </button>
                <DetailContent/>
                <CTABar/>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isMobile && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
          <div className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: "92vh", background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))", boxShadow: "0 -24px 60px rgba(0,0,0,0.4)" }}>
            <div className="flex justify-center pt-3 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border"/>
            </div>
            <button onClick={onClose}
              className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
              <X size={13}/>
            </button>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="flex gap-3 px-4 pt-4 pb-4">
                <div className="w-[88px] shrink-0 rounded-xl overflow-hidden bg-secondary shadow-lg" style={{ aspectRatio: "3/4" }}>
                  {story.coverUrl
                    ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center"><BookIcon className="w-8 h-8 text-muted-foreground/20"/></div>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{ backgroundColor: `${STATUS_COLORS[story.status]}15`, color: STATUS_COLORS[story.status], borderColor: `${STATUS_COLORS[story.status]}30` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[story.status] }}/>{si.label}
                    </span>
                    {fmt && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">{fmt}</span>}
                    {story.demographic && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">{story.demographic}</span>}
                  </div>
                  <h2 className="text-[15px] font-black text-foreground leading-snug line-clamp-2">{story.title}</h2>
                  {story.altTitle && <p className="text-[11px] text-muted-foreground/60 italic line-clamp-1 mt-0.5">{story.altTitle}</p>}
                  {story.author   && <p className="text-[11px] text-muted-foreground/50 mt-0.5">{story.author}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400"/>
                      <span className="text-sm font-black text-amber-400">{story.rating || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen size={11}/>
                      <span className="text-xs font-semibold">
                        {story.currentChapter}
                        {latestCh > story.currentChapter && <span className="text-muted-foreground/40"> / {latestCh}</span>}
                        <span className="text-muted-foreground/40"> ch</span>
                      </span>
                    </div>
                    {story.originCountry && (
                      <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm`} style={{ width: 16, height: 11 }}/>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-px bg-border/60 mx-4"/>
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
                        <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Hero Section ───────────────────────────────────── */
function HeroSection({ story }: { story: any }) {
  if (!story) return null;
  return (
    <div className="relative rounded-2xl overflow-hidden mb-6 group border border-border/50">
      {story.headerUrl && (
        <div className="absolute inset-0 scale-110 blur-1xl opacity-60"
          style={{ backgroundImage: `url(${story.headerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}/>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent backdrop-blur-[2px]"/>
      <div className="relative flex items-center gap-5 p-5 sm:p-7">
        <div className="flex-shrink-0 w-20 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 z-10">
          {story.coverUrl
            ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover"/>
            : <div className="w-full h-full bg-secondary flex items-center justify-center"><BookOpen className="w-8 h-8 text-muted-foreground/30"/></div>}
        </div>
        <div className="flex-1 min-w-0 space-y-2 z-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/80 flex items-center gap-1.5">
            <Flame size={11} className="text-orange-400"/> Continue Reading
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight line-clamp-2">{story.title}</h2>
          {story.author && <p className="text-xs text-muted-foreground">{story.author}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star size={11} className="fill-yellow-400 text-yellow-400"/>{story.rating || "—"}</span>
            <span>Ch. {story.currentChapter}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Link to={`/story/${story.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:scale-105 active:scale-95">
              <Play size={13} fill="currentColor"/> Continue Reading
            </Link>
              <Link to={`/story/${story.id}`}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-all">
              <BookOpen size={13}/>
              <span className="hidden sm:inline">+1 Chapter</span>
              <span className="sm:hidden">+1</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Import Dialog ──────────────────────────────────── */
function ImportDialog({ open, onClose, onImport }: {
  open: boolean; onClose: () => void; onImport: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".json") || f.name.endsWith(".csv"))) setFile(f);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileDown size={15} className="text-primary"/>
            <span className="font-bold text-sm">Import Progress</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={14} className="text-muted-foreground"/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <FileDown size={28} className="mx-auto mb-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors"/>
              <p className="text-sm font-semibold text-foreground mb-1">Drag & drop file here</p>
              <p className="text-xs text-muted-foreground mb-4">or</p>
              <span className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                Choose File
              </span>
              <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}/>
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-mono">JSON</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-mono">CSV</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileDown size={18} className="text-primary"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-xs text-muted-foreground hover:text-foreground underline">Change</button>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all">
            Cancel
          </button>
          <button
            disabled={!file}
            onClick={() => { onImport(); onClose(); setFile(null); }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Export Dialog ──────────────────────────────────── */
function ExportDialog({ open, onClose, onExport }: {
  open: boolean; onClose: () => void; onExport: (fmt: string) => void;
}) {
  const [format, setFormat] = useState("json");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileUp size={15} className="text-primary"/>
            <span className="font-bold text-sm">Export Progress</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={14} className="text-muted-foreground"/>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase">Select Format</p>
          {[
            { val: "json", label: "JSON", desc: "Full backup, restoreable" },
            { val: "csv",  label: "CSV",  desc: "Spreadsheet compatible" },
            { val: "pdf",  label: "PDF",  desc: "Share & print library" },
          ].map(opt => (
            <button key={opt.val} onClick={() => setFormat(opt.val)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                ${format === opt.val ? "border-primary/60 bg-primary/8" : "border-border hover:border-border/70 hover:bg-secondary/50"}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                ${format === opt.val ? "border-primary" : "border-muted-foreground/40"}`}>
                {format === opt.val && <div className="w-2 h-2 rounded-full bg-primary"/>}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all">
            Cancel
          </button>
          <button onClick={() => { onExport(format); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shortcuts Dialog ───────────────────────────────── */
function ShortcutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const shortcuts = [
    { group: "Library", keys: ["F", "Cmd/Ctrl + K"], desc: ["Open Filter", "Focus Search"] },
    { group: "Story Detail", keys: ["N", "S", "R", "← / →", "ESC"], desc: ["Next Chapter (+1)", "Edit Notes", "Edit Rating", "Prev / Next Story", "Back to Library"] },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-primary"/>
            <span className="font-bold text-lg">Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <X size={18}/>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {shortcuts.map((section) => (
            <div key={section.group}>
              <h3 className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">
                {section.group}
              </h3>
              <div className="space-y-3">
                {section.keys.map((key, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <span className="text-sm text-foreground/80">{section.desc[idx]}</span>
                    <div className="flex items-center gap-1">
                      {key.split(" / ").map((k, i) => (
                        <span key={i} className="px-2 py-1 min-w-[2rem] text-center text-xs font-bold font-mono bg-secondary border border-amber-400/30 rounded-md text-amber-400 shadow-sm">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Hint */}
        <div className="bg-muted/30 px-6 py-3 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground">
            Press <span className="font-bold text-foreground">?</span> anywhere to toggle this menu
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Panel ──────────────────────────────────── */
function ProfilePanel({ open, onClose, storiesCount, onExport, onImport, onOpenShortcuts, ctaPreference, handleCtaChange }: {
  open: boolean; onClose: () => void; storiesCount: number;
  onExport: () => void; onImport: () => void; onOpenShortcuts: () => void;
  ctaPreference: "floating" | "inside";
  handleCtaChange: (val: "floating" | "inside") => void;
}) {
  // States untuk accordion
  const [backupOpen, setBackupOpen]     = useState(false);    
  const [ctaOpen, setCtaOpen]           = useState(false); 
  const [appearanceOpen, setAppearanceOpen] = useState(false); // State khusus accordion Appearance
  
  // States untuk dialog/popup
  const [importOpen, setImportOpen]     = useState(false);
  const [exportOpen, setExportOpen]     = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [themePickerDialogOpen, setThemePickerDialogOpen] = useState(false); // State khusus Dialog Warna
  
  const [username, setUsername]         = useState(() => localStorage.getItem("jejakbaca_username") || "username");
  const [editUsername, setEditUsername] = useState(() => localStorage.getItem("jejakbaca_username") || "username");  
  const [avatarUrl, setAvatarUrl]       = useState(() => localStorage.getItem("jejakbaca_avatar") || "");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const { mode, setMode, currentTheme } = useTheme();
  const { stories } = useStories();
 
  const totalChapters = stories.reduce((sum: number, s: any) => sum + (s.currentChapter || 0), 0);
  const completedCount = stories.filter((s: any) => s.status === "completed").length;
  const ratedStories = stories.filter((s: any) => s.rating > 0);
  const avgRating = ratedStories.length
    ? ratedStories.reduce((sum: number, s: any) => sum + s.rating, 0) / ratedStories.length
    : 0;

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose}/>}

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 z-50 bg-card border-l border-border shadow-2xl flex flex-col
        transform transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="font-bold text-sm">Profile</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={15} className="text-muted-foreground"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Member Card */}
          <div className="m-4">
            <MemberCard
              username={username}
              avatarUrl={avatarUrl}
              memberSince="Feb 2024"
              storiesCount={storiesCount}
              totalChapters={totalChapters}
              completedCount={completedCount}
              avgRating={avgRating}
            />
          </div>

          {/* Tombol Edit Profile (Trigger) */}
          <div className="px-4 pb-4">
            <button
              onClick={() => setEditProfileOpen(true)}
              className="w-full py-2 rounded-xl border border-border bg-secondary/50 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-all flex items-center justify-center gap-2">
              <Edit size={13} /> Edit Profile
            </button>
          </div>

          {/* Edit Profile (inline expand) */}
          {editProfileOpen && (
            <div className="mx-4 mb-4 rounded-xl border border-border bg-secondary/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-xs font-bold">Edit Profile</span>
                <button onClick={() => setEditProfileOpen(false)} className="p-1 rounded hover:bg-secondary transition-colors">
                  <X size={12} className="text-muted-foreground"/>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase block mb-1.5">Username</label>
                  <input
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase block mb-1.5">Avatar</label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden">
                      {avatarUrl
                        ? <img src={avatarUrl} className="w-full h-full object-cover"/>
                        : <User size={20} className="text-muted-foreground/40"/>}
                    </div>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                      <Camera size={12}/> Upload
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setAvatarUrl(URL.createObjectURL(f));
                      }}/>
                  </div>
                  <input
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  onClick={() => { 
                    const newUsername = editUsername;
                    const newAvatarUrl = avatarUrl;

                    // 1. Update State React
                    setUsername(newUsername); 
                    setAvatarUrl(newAvatarUrl); 
                    
                    // 2. Simpan ke LocalStorage agar tidak hilang saat refresh
                    localStorage.setItem("jejakbaca_username", newUsername);
                    localStorage.setItem("jejakbaca_avatar", newAvatarUrl);

                    // 3. Tutup form edit
                    setEditProfileOpen(false); 
                  }}
                  className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="px-4 space-y-2 pb-4">

            {/* Appearance */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20 mb-2">
              <button
                onClick={() => setAppearanceOpen(!appearanceOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <Palette size={15} className="text-primary shrink-0"/>
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Appearance</span>
                <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform duration-200 ${appearanceOpen ? "rotate-90" : ""}`}/>
              </button>

              {appearanceOpen && (
                <div className="border-t border-border p-4 space-y-4 bg-secondary/30">
                  {/* Light / Dark toggle */}
                  <div>
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase mb-2">Mode</p>
                    <div className="flex gap-2 p-1 bg-secondary rounded-xl border border-border">
                      <button
                        onClick={() => setMode("light")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
                          ${mode === "light" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <Sun size={13}/> Light
                      </button>
                      <button
                        onClick={() => setMode("dark")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
                          ${mode === "dark" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <Moon size={13}/> Dark
                      </button>
                    </div>
                  </div>
                  {/* Theme Colors */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase">Theme Colors</p>
                      <button 
                        onClick={() => setThemePickerDialogOpen(true)} 
                        className="text-[11px] text-primary hover:underline font-semibold">
                        Change
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        currentTheme.dark.background,
                        currentTheme.dark.card,
                        currentTheme.dark.primary,
                        currentTheme.dark.secondary,
                      ].map((color, i) => (
                        <div key={i}
                          className="w-6 h-6 rounded-full border-2 border-white/30"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Style */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20 mb-2">
              <button
                onClick={() => setCtaOpen(!ctaOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <BookOpen size={15} className="text-primary shrink-0"/>
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Continue Reading Button</span>
                <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform duration-200 ${ctaOpen ? "rotate-90" : ""}`}/>
              </button>

              {ctaOpen && (
                <div className="border-t border-border p-4 bg-secondary/30">
                  <p className="text-[10px] text-muted-foreground/50 mb-3">Where to show the button</p>
                  <div className="flex gap-2 p-1 bg-secondary rounded-xl border border-border">
                    <button
                      onClick={() => handleCtaChange("inside")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
                        ${ctaPreference === "inside" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      In Card
                    </button>
                    <button
                      onClick={() => handleCtaChange("floating")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
                        ${ctaPreference === "floating" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      Floating
                    </button>
                  </div>
                </div>
              )}
            </div>   

            {/* Backup */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20 mb-2">
              <button
                onClick={() => setBackupOpen(!backupOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <HardDrive size={15} className="text-primary shrink-0"/>
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Backup</span>
                <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform duration-200 ${backupOpen ? "rotate-90" : ""}`}/>
              </button>

              {backupOpen && (
                <div className="border-t border-border">
                  <button onClick={() => setImportOpen(true)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/50 transition-colors">
                    <FileDown size={13} className="text-muted-foreground shrink-0"/>
                    <span className="text-sm text-foreground">Import Progress</span>
                  </button>
                  <button onClick={() => setExportOpen(true)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/50 transition-colors border-t border-border/50">
                    <FileUp size={13} className="text-muted-foreground shrink-0"/>
                    <span className="text-sm text-foreground">Export Progress</span>
                  </button>
                </div>
              )}
            </div>

            {/* Shortcuts with Dialog */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20">
              <button 
                onClick={() => onOpenShortcuts?.()}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <Keyboard size={15} className="text-primary shrink-0"/>
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Shortcuts</span>
                <ChevronRight size={14} className="text-muted-foreground/50"/>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 border-t border-border shrink-0">
          <button className="w-full py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors font-medium border border-transparent hover:border-red-500/20">
            Sign Out
          </button>
        </div>
      </div>

      {/* Sub-dialogs */}
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport}/>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} onExport={(fmt) => {
        if (fmt === "json") onExport();
      }}/>
      {/* Dialog Pemilihan Warna Lengkap */}
      <ThemePicker open={themePickerDialogOpen} onClose={() => setThemePickerDialogOpen(false)}/> 
    </>
  );
}

/* ─── Bulk Action Bar ───────────────────────────────── */
function BulkActionBar({ count, onClose, onDelete, onStatusChange, onOpenSources }: {
  count: number;
  onClose: () => void;
  onDelete: () => void;
  onStatusChange: (status: StoryStatus) => void;  
  onOpenSources: (ids?: Set<string>) => void;  
}) {
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-2xl p-2 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <span className="text-xs font-bold text-foreground pl-2">{count} Selected</span>
      <div className="h-4 w-px bg-border"/>

      <div className="relative">
        <button
          onClick={() => setStatusOpen(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary text-foreground transition-colors">
          <Settings size={14}/>
          Status
          <ChevronRight size={12} className={`transition-transform ${statusOpen ? "rotate-90" : ""}`}/>
        </button>
        {statusOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden w-40 p-1 z-50">
            {STATUS_OPTIONS.map(s => (
              <button key={s.value}
                onClick={() => { onStatusChange(s.value as StoryStatus); setStatusOpen(false); }}
                className="text-left px-2 py-1.5 text-xs hover:bg-secondary rounded flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <span className={s.color}>{s.icon}</span> {s.label}
              </button>
            ))}
            <button             
              onClick={() => { onOpenSources(); setStatusOpen(false); }}
              className="text-left px-2 py-1.5 text-xs hover:bg-blue-500/10 rounded flex items-center gap-2 text-muted-foreground hover:text-blue-500 border-t border-border/50">
              <ExternalLink size={14} className="text-blue-500"/>
              Open Sources (Max Chapter)
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onOpenSources()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-500/10 text-blue-400 transition-colors">
        <ExternalLink size={14}/> Open Tabs
      </button>

      <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/10 text-red-500 transition-colors">
        <Trash2 size={14}/> Delete
      </button>

      <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
        <X size={14}/>
      </button>
    </div>
  );
}

/* ─── Main Library ───────────────────────────────────── */
function Library() {
  const { stories } = useStories();
const [searchParams, setSearchParams] = useSearchParams();
const navigate = useNavigate();
  const { updateStory, deleteStory } = useStories();
  const isMobile = useIsMobile();

  // ── UI State ──
  const [search, setSearch]           = useState("");
  const [sortBy, setSortBy]           = useState("recent");
  const [viewMode, setViewMode]       = useState<"grid"|"timeline">("grid");
  const [profileOpen, setProfileOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [searchOpen, setSearchOpen]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // ── CTA Preference ──
  const [ctaPreference, setCtaPreference] = useState<"floating" | "inside">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jejakbaca_cta_pref");
      return (saved === "inside" || saved === "floating") ? saved : "floating";
    }
    return "floating";
  });

  const handleCtaChange = (val: "floating" | "inside") => {
    setCtaPreference(val);
    localStorage.setItem("jejakbaca_cta_pref", val);
  };

  // ── Bulk & Filters State ──
  const [bulkMode, setBulkMode]       = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen]   = useState(false);
  const [advFilters, setAdvFilters]   = useState<Filters>(EMPTY_FILTERS);
  const [quickView, setQuickView]     = useState<any | null>(null);

  
  // ── URL param sync for tags (READ ONLY) ──
  useEffect(() => {
    const tagsParam = searchParams.get('tags');
    
    if (tagsParam) {
      const tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        setAdvFilters(prev => ({
          ...prev,
          tags: Object.fromEntries(tags.map(tag => [tag, 'include']))
        }));
      }
    }
    
    isInitialized.current = true;
  }, [searchParams]);

  // ── Update URL saat filter berubah (WRITE ONLY) ──
  useEffect(() => {
    if (!isInitialized.current) return;

    const tags = Object.keys(advFilters.tags).filter(tag => advFilters.tags[tag] === 'include');
    
    if (tags.length === 0) {
      searchParams.delete('tags');
    } else {
      searchParams.set('tags', tags.join(','));
    }
    
    setSearchParams(searchParams, { replace: true });
  }, [advFilters.tags, searchParams, setSearchParams]);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const key = e.key.toLowerCase();

      // Toggle Shortcuts Dialog
      if (key === '?') {
        e.preventDefault();
        setShortcutOpen(prev => !prev);
        return;
      }

      // Shortcut Library
      if (key === 'f' && !filterOpen) {
        e.preventDefault();
        setFilterOpen(true);
      }
      
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filterOpen]); 

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const globalTags = getGlobalTags();
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    stories.forEach(s => s.tags?.forEach(t => tags.add(t)));
    globalTags.forEach(t => tags.add(t));
    return Array.from(tags).sort();
  }, [stories, globalTags]);

  const applyAdvFilter = (dict: Record<string, ItemState>, val: string | string[]) => {
    const inc = Object.entries(dict).filter(([,v])=>v==="include").map(([k])=>k);
    const exc = Object.entries(dict).filter(([,v])=>v==="exclude").map(([k])=>k);
    const isArr = Array.isArray(val);
    if (inc.length) {
      if (isArr) { if (!inc.every(i=>(val as string[]).includes(i))) return false; }
      else        { if (!inc.includes(val as string)) return false; }
    }
    if (exc.length) {
      if (isArr) { if (exc.some(e=>(val as string[]).includes(e))) return false; }
      else        { if (exc.includes(val as string)) return false; }
    }
    return true;
  };

  const filtered = useMemo(() => {
    let result = stories.filter((s: any) => {
      const q = search.toLowerCase();
      const matchSearch = s.title.toLowerCase().includes(q) || s.author?.toLowerCase().includes(q);
      const matchStatus = Object.keys(advFilters.status).length === 0 || applyAdvFilter(advFilters.status, s.status??"");
      const matchTag    = Object.keys(advFilters.tags).length === 0 || applyAdvFilter(advFilters.tags, s.tags??[]);
      const matchRating = advFilters.rating === 0 || s.rating === advFilters.rating;
      return matchSearch && matchStatus && matchTag && matchRating;
    });
    if (Object.keys(advFilters.country).length)     result = result.filter((s:any)=>applyAdvFilter(advFilters.country, (s.originCountry||"").toUpperCase()));
    if (Object.keys(advFilters.demographic).length) result = result.filter((s:any)=>applyAdvFilter(advFilters.demographic, s.demographic??""));
    if (Object.keys(advFilters.genres).length)      result = result.filter((s:any)=>applyAdvFilter(advFilters.genres, s.genres??[]));

    if (sortBy === "recent") result.sort((a:any,b:any) => new Date(b.chapterUpdatedAt).getTime() - new Date(a.chapterUpdatedAt).getTime());
    else if (sortBy === "rating") result.sort((a:any,b:any) => b.rating - a.rating);
    else if (sortBy === "title") result.sort((a:any,b:any) => a.title.localeCompare(b.title));
    return result;
  }, [stories, search, sortBy, advFilters]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    return filtered.slice(0, 5);
  }, [search, filtered]);

  const advFilterCount = (Object.keys(advFilters.status).length + Object.keys(advFilters.country).length + Object.keys(advFilters.genres).length + Object.keys(advFilters.tags).length) + (advFilters.rating > 0 ? 1 : 0);

  const heroStory = useMemo(() =>
    [...stories].filter((s:any) => s.status==="reading")
      .sort((a:any,b:any) => new Date(b.chapterUpdatedAt).getTime() - new Date(a.chapterUpdatedAt).getTime())[0]
  , [stories]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(stories, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="jejakbaca-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type="file"; input.accept=".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (Array.isArray(data)) { localStorage.setItem("jejakbaca_stories", JSON.stringify(data)); window.location.reload(); }
        } catch { alert("Invalid backup file."); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((s: any) => s.id)));
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteStory(id));
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  const handleBulkStatus = (status: StoryStatus) => {
    selectedIds.forEach(id => updateStory(id, { status }));
    setSelectedIds(new Set());
    setBulkMode(false);
  };

    const onOpenSources = (ids?: Set<string>) => {    
    const targetIds = ids || selectedIds;

    const urls: string[] = [];
    
    Array.from(targetIds).forEach(id => {
      const story = stories.find(s => s.id === id);
      if (!story || !story.sources?.length) return;
      
      const maxSource = story.sources.reduce((max: any, src: any) => 
        (src.currentChapter || 0) > (max.currentChapter || 0) ? src : max
      );
      if (maxSource?.url) urls.push(maxSource.url);
    });

    if (urls.length === 0) return;

    if (urls.length > 3) {
      const confirmed = window.confirm(`Open ${urls.length} tabs at once?`);
      if (!confirmed) return;
    }

    // Buka semua sekaligus lewat anchor click (bypass popup blocker)
    urls.forEach((url, i) => {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      setTimeout(() => { a.click(); document.body.removeChild(a); }, i * 300);
    });

    setSelectedIds(new Set());
    setBulkMode(false);
  };

  /* ── Shared search box ── */
  const SearchBox = () => (
    <div className="relative flex items-center" ref={searchRef}>
      <div className={`flex items-center bg-secondary border border-border rounded-xl transition-all duration-300 overflow-hidden
        ${searchOpen ? "w-56 md:w-72 px-3 py-1.5" : "w-8 h-8 justify-center px-0"}`}>
        <Search size={16} className={`text-muted-foreground shrink-0 cursor-pointer ${searchOpen ? "mr-2" : ""}`}
          onClick={() => setSearchOpen(true)}/>
        {searchOpen && (
          <input autoFocus placeholder="Search library..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-xs w-full outline-none text-foreground placeholder:text-muted-foreground"/>
        )}
        {searchOpen && search && (
          <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X size={12}/></button>
        )}
      </div>
      {searchOpen && search && suggestions.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {suggestions.map((s: any) => (
            <Link key={s.id} to={`/story/${s.id}`} onClick={() => setSearchOpen(false)}
              className="flex items-center gap-3 p-2 hover:bg-secondary border-b border-border last:border-0">
              <img src={s.coverUrl} className="w-8 h-10 object-cover rounded bg-muted" alt=""/>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{s.title}</p>
                <p className="text-[10px] text-muted-foreground">{s.author}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const FilterButton = () => (
    <button onClick={() => setFilterOpen(true)}
      className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all
        ${advFilterCount > 0 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
      <FilterIcon size={16}/>
      {advFilterCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-400 border-2 border-card rounded-full"/>}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── DESKTOP TOP NAV ── */}
      {!isMobile && (
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-2 px-6 py-0 h-14 max-w-screen-2xl mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-8">
              <BookOpen size={18} className="text-primary"/>
              <span className="font-black text-sm tracking-widest">JEJAK<span className="text-primary">BACA</span></span>
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              <Link to="/"
                className="px-3 py-1.5 text-sm font-bold text-primary transition-colors">
                Home
              </Link>
              <Link to="/lists"
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Lists
              </Link>
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto">
              <SearchBox/>
              <FilterButton/>
              <AddStoryDialog showLabel/> 
              {/* Profile button */}
              <button onClick={() => setProfileOpen(true)}
                className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <User size={15} className="text-muted-foreground"/>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ── MOBILE HEADER ── */}
      {isMobile && (
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary"/>
              <span className="font-black text-sm tracking-widest">JEJAK<span className="text-primary">BACA</span></span>
            </div>
            <div className="flex-1"/>
            {/* Right: search + filter + profile */}
            <SearchBox/>
            <FilterButton/>
            <button onClick={() => setProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <User size={15} className="text-muted-foreground"/>
            </button>
          </div>
        </header>
      )}

      {/* Page body */}
      <main className={`flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-7xl w-full mx-auto ${isMobile ? "pb-24" : ""}`}>

        {heroStory && !loading && <HeroSection story={heroStory}/>}

        {/* Filter Row */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span className="text-foreground">{filtered.length} results</span>
            {advFilters.rating > 0 && (
              <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px] border border-amber-500/20">
                Rating {advFilters.rating}
              </span>
            )}
            {Object.keys(advFilters.status).length > 0 && (
              <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/20">
                {Object.keys(advFilters.status).length} Status
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center bg-secondary rounded-xl p-0.5 border border-border">
              <button onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${viewMode==="grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid size={15}/>
              </button>
              <button onClick={() => setViewMode("timeline")}
                className={`p-1.5 rounded-lg transition-all ${viewMode==="timeline" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <AlignJustify size={15}/>
              </button>
            </div>
            <button title="Bulk Mode"
              onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
              className={`p-2 rounded-md border transition-all
                ${bulkMode ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}>
              <CheckSquare size={15}/>
            </button>
          </div>
        </div>

        {/* Bulk Select All */}
        {bulkMode && filtered.length > 0 && (
          <div className="flex items-center justify-end text-xs text-muted-foreground pb-2">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 hover:text-foreground transition-colors">
              {selectedIds.size === filtered.length ? <CheckSquare size={14} className="text-primary"/> : <Square size={14}/>}
              {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}

        {/* Grid / Timeline */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-4">
            {Array.from({length:16}).map((_,i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-secondary animate-pulse"/>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-4">
            {filtered.map((story: any) => {
              const isSelected = selectedIds.has(story.id);
              const statusInfo = getStatusInfo(story.status);
              return (
                <div key={story.id}
                  className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-secondary border border-border transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 cursor-pointer">
                  {!bulkMode && <Link to={`/story/${story.id}`} className="absolute inset-0 z-0"/>}
                  {story.coverUrl
                    ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                    : <div className="w-full h-full flex items-center justify-center bg-card"><BookOpen className="w-10 h-10 text-muted-foreground/20"/></div>}

                  <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-1 max-w-[55%]">
                      {story.originCountry && (
                        <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm shadow-sm`} style={{ width:14, height:10 }}/>
                      )}
                      <span className="text-[9px] font-bold text-white/80 truncate">
                        {FORMAT_MAP[(story.originCountry||"").toUpperCase()]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-full border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor:STATUS_COLORS[story.status] }}/>
                      <span className="text-[9px] text-white/80 whitespace-nowrap">{statusInfo.label}</span>
                    </div>
                  </div>

                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickView(story); }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-70 transition-all hover:scale-110 hover:bg-black/60 border border-white/20">
                    <Eye size={15} className="text-white drop-shadow-md"/>
                  </button>

                  {bulkMode && (
                    <button
                      onClick={e => { e.stopPropagation();
                        const newSet = new Set(selectedIds);
                        if(newSet.has(story.id)) newSet.delete(story.id); else newSet.add(story.id);
                        setSelectedIds(newSet);
                      }}
                      className="absolute top-2 right-2 z-30 w-6 h-6 rounded bg-card/90 backdrop-blur border border-primary flex items-center justify-center shadow-md">
                      {isSelected ? <Check size={14} className="text-primary"/> : null}
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
                        <BookOpen size={10}/><span className="text-[10px] font-mono">{story.currentChapter}</span>
                      </div>
                      <div className="flex items-center gap-0.5 bg-amber-400/20 px-1.5 py-0.5 rounded-full">
                        <Star size={9} className="fill-amber-400 text-amber-400"/>
                        <span className="text-[10px] font-bold text-amber-300">{story.rating||"—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.length > 0 ? filtered.map((story: any, i: number) => {
              const date = new Date(story.chapterUpdatedAt);
              const prevDate = i > 0 ? new Date(filtered[i-1].chapterUpdatedAt) : null;
              const showDate = !prevDate || date.toDateString() !== prevDate.toDateString();
              return (
                <div key={story.id} className="relative">
                  {showDate && (
                    <div className="flex items-center gap-3 py-3 sticky top-0 bg-background/95 backdrop-blur z-10">
                      <div className="h-px flex-1 bg-border"/>
                      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                        {date.toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}
                      </span>
                      <div className="h-px flex-1 bg-border"/>
                    </div>
                  )}
                  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary transition-all group">
                    {bulkMode && (
                      <button onClick={() => {
                        const newSet = new Set(selectedIds);
                        if(newSet.has(story.id)) newSet.delete(story.id); else newSet.add(story.id);
                        setSelectedIds(newSet);
                      }} className="shrink-0">
                        {selectedIds.has(story.id) ? <CheckSquare size={18} className="text-primary"/> : <Square size={18} className="text-muted-foreground"/>}
                      </button>
                    )}
                    <Link to={`/story/${story.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
                        {story.coverUrl
                          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover"/>
                          : <BookOpen size={16} className="m-auto mt-4 text-muted-foreground/30"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{story.title}</p>
                        <p className="text-xs text-muted-foreground">Ch. {story.currentChapter} · {story.author}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star size={11} className="fill-yellow-400 text-yellow-400"/>
                        <span className="text-xs font-bold text-yellow-400">{story.rating||"—"}</span>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            }) : (
              <p className="text-center text-sm text-muted-foreground py-16">No results found.</p>
            )}
          </div>
        )}
      </main>

      {/* Footer (desktop only) */}
      {!isMobile && (
        <footer className="border-t border-border px-6 py-4 mt-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <BookOpen size={12} className="text-primary"/>
              <span className="font-bold text-foreground/70 tracking-widest">JEJAKBACA</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{stories.length} stories saved</span>
              <button onClick={handleExport} className="hover:text-foreground transition-colors">Export</button>
            </div>
          </div>
        </footer>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border">
          <div className="flex items-center justify-around px-4 h-16">
            {/* Home */}
            <Link to="/" className="flex flex-col items-center gap-1 text-primary">
              <Home size={22}/>
              <span className="text-[10px] font-semibold">Home</span>
            </Link>

            {/* Add — center elevated button */}
            <div className="flex flex-col items-center gap-1">
              <AddStoryDialog trigger={
              <button className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/35 hover:brightness-110 active:scale-95 transition-all -mt-5">
                <Plus size={22} className="text-primary-foreground" strokeWidth={2.5}/>
              </button>
            }/>
             <span className="text-[10px] font-semibold">Add</span>
            </div>

            {/* Lists */}
            <Link to="/lists" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <List size={22}/>
              <span className="text-[10px] font-semibold">Lists</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Bulk Action Bar */}
      {bulkMode && selectedIds.size > 0 && (
      <BulkActionBar
          count={selectedIds.size}
          onClose={() => setSelectedIds(new Set())}
          onDelete={handleBulkDelete}
          onStatusChange={handleBulkStatus}          
          onOpenSources={() => onOpenSources(selectedIds)} 
        />
      )}

      {/* Profile Panel */}
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        storiesCount={stories.length}
        onExport={handleExport}
        onImport={handleImport}
        onOpenShortcuts={() => setShortcutOpen(true)} 
        ctaPreference={ctaPreference}         
        handleCtaChange={handleCtaChange}    
      />

      {/* Shortcut Dialog */}
      <ShortcutDialog open={shortcutOpen} onClose={() => setShortcutOpen(false)}/>

      {/* Filter Panel */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={advFilters}
        onChange={setAdvFilters}
        allTags={allTags}
      />

      {/* Quick View */}
      {quickView && (
        <QuickViewModal
          story={quickView}
          onClose={() => setQuickView(null)}
          onNavigate={(id) => { navigate(`/story/${id}`); setQuickView(null); }}
        />
      )}
    </div>
  );
}

export default Library;
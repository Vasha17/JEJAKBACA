import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen, Search, X, Plus, User, Filter as FilterIcon,
  Palette, HardDrive, Keyboard, FileDown, FileUp, Edit,
  Camera, ChevronRight, Sun, Moon, Settings, Home, List,
  LogIn, LogOut, Eye,
} from "lucide-react";
import { AddStoryDialog } from "@/component/AddStoryDialog";
import { useStories } from "@/lib/StoryContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemePicker } from "@/component/ThemePicker";
import { NewListDialogTrigger } from "@/component/NewListDialogTrigger";
import { useAuth } from "@/component/Auth";
import { dexieAPI } from "@/lib/DexieDB";
import QRCode from "qrcode";

/* ─── Filter Types ───────────────────────────────────── */
type ItemState = "include" | "exclude";
export type Filters = {
  status:      Record<string, ItemState>;
  country:     Record<string, ItemState>;
  demographic: Record<string, ItemState>;
  genres:      Record<string, ItemState>;
  tags:        Record<string, ItemState>;
  rating:      number;
};
export const EMPTY_FILTERS: Filters = { status:{}, country:{}, demographic:{}, genres:{}, tags:{}, rating: 0 };

const STATUS_OPTIONS = [
  { value: "reading",      label: "Reading",      color: "#22c55e" },
  { value: "completed",    label: "Completed",    color: "#3b82f6" },
  { value: "on-hold",      label: "On Hold",      color: "#eab308" },
  { value: "plan-to-read", label: "Plan to Read", color: "#6b7280" },
  { value: "dropped",      label: "Dropped",      color: "#ef4444" },
  { value: "re-reading",   label: "Re-reading",   color: "#a855f7" },
];

const COUNTRY_OPTIONS = ["JP", "KR", "CN", "TW", "ID", "US"];
const FORMAT_MAP: Record<string, string> = {
  JP: "Manga", KR: "Manhwa", CN: "Manhua", TW: "Manhua", ID: "Komik", US: "Comic",
};
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

/* ─── Prop Types ─────────────────────────────────────── */
interface LibraryNavbarProps {
  variant: "library";
  search: string;
  onSearchChange: (v: string) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  filterCount: number;
  allTags?: string[];
}

interface ListsNavbarProps {
  variant: "lists";
  listSearch: string;
  onListSearchChange: (v: string) => void;
  onNewList: (name: string, color: string, visibility: string) => void;
}

type BaseProps = {
  storiesCount: number;
  totalChapters: number;
  completedCount: number;
  avgRating: number;
  ctaPreference?: "floating" | "inside";
  onCtaChange?: (val: "floating" | "inside") => void;
  onOpenShortcuts?: () => void;
};

type NavbarProps = (LibraryNavbarProps | ListsNavbarProps) & BaseProps;

/* ─── Logo ───────────────────────────────────────────── */
function Logo() {
  return (
    <div className="flex items-center gap-2 mr-8 shrink-0">
      <BookOpen size={18} className="text-primary" />
      <span className="font-black text-sm tracking-widest">
        JEJAK<span className="text-primary">BACA</span>
      </span>
    </div>
  );
}

/* ─── Profile Button ─────────────────────────────────── */
function ProfileButton({ onClick }: { onClick: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState(
    () => localStorage.getItem("jejakbaca_avatar") || ""
  );
  useEffect(() => {
    const sync = () => setAvatarUrl(localStorage.getItem("jejakbaca_avatar") || "");
    window.addEventListener("storage", sync);
    const t = setInterval(sync, 1000);
    return () => { window.removeEventListener("storage", sync); clearInterval(t); };
  }, []);
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted hover:border-primary/40 transition-all overflow-hidden"
    >
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
        : <User size={15} className="text-muted-foreground" />}
    </button>
  );
}

/* ─── Library Search ─────────────────────────────────── */
function LibrarySearch({ search, onSearchChange, stories }: {
  search: string; onSearchChange: (v: string) => void; stories: any[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    return stories
      .filter((s: any) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.author?.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 5);
  }, [search, stories]);

  return (
    <div className="relative flex items-center" ref={ref}>
      <div className={`flex items-center bg-secondary border border-border rounded-xl transition-all duration-300 overflow-hidden ${open ? "w-56 md:w-72 px-3 py-1.5" : "w-8 h-8 justify-center px-0"}`}>
        <Search size={16} className={`text-muted-foreground shrink-0 cursor-pointer ${open ? "mr-2" : ""}`} onClick={() => setOpen(true)} />
        {open && (
          <input autoFocus placeholder="Search library…" value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent text-xs w-full outline-none text-foreground placeholder:text-muted-foreground" />
        )}
        {open && search && (
          <button onClick={() => onSearchChange("")} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
        )}
      </div>
      {open && search && suggestions.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {suggestions.map((s: any) => (
            <Link key={s.id} to={`/story/${s.id}`} onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-2 hover:bg-secondary border-b border-border last:border-0">
              {s.coverUrl
                ? <img src={s.coverUrl} className="w-8 h-10 object-cover rounded bg-muted" alt="" />
                : <div className="w-8 h-10 rounded bg-secondary flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground/40" /></div>}
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
}

/* ─── Lists Search ───────────────────────────────────── */
function ListsSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative flex items-center" ref={ref}>
      <div className={`flex items-center bg-secondary border border-border rounded-xl transition-all duration-300 overflow-hidden ${open ? "w-56 md:w-72 px-3 py-1.5" : "w-8 h-8 justify-center px-0"}`}>
        <Search size={16} className={`text-muted-foreground shrink-0 cursor-pointer ${open ? "mr-2" : ""}`} onClick={() => setOpen(true)} />
        {open && (
          <input autoFocus placeholder="Search lists…" value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent text-xs w-full outline-none text-foreground placeholder:text-muted-foreground" />
        )}
        {open && value && (
          <button onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
        )}
      </div>
    </div>
  );
}

/* ─── Filter Panel ───────────────────────────────────── */
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
    if (key === "rating") return;
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
            ≥{filters.rating} <X size={9}/>
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

function FilterPanel({ open, onClose, filters, onChange, allTags }: {
  open: boolean; onClose: () => void;
  filters: Filters; onChange: (f: Filters) => void;
  allTags: string[];
}) {
  const [tab, setTab] = useState<"status" | "genres" | "tags">("status");
  const [genreSearch, setGenreSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const toggle = (key: keyof Filters, val: string) => {
    const cur = (filters[key] as Record<string, ItemState>)[val];
    const next = cycleState(cur);
    const updated = { ...(filters[key] as Record<string, ItemState>) };
    if (next) updated[val] = next; else delete updated[val];
    onChange({ ...filters, [key]: updated });
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

  const totalActive =
    Object.keys(filters.status).length +
    Object.keys(filters.country).length +
    Object.keys(filters.genres).length +
    Object.keys(filters.tags).length +
    (filters.rating > 0 ? 1 : 0);

  const filteredGenres = ALL_GENRES.filter(g =>
    g.toLowerCase().includes(genreSearch.toLowerCase())
  );

  if (!open) return null;

  const panelContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <FilterIcon size={14} className="text-primary" />
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
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-2.5 pb-1 shrink-0">
        <p className="text-[10px] text-muted-foreground/50">
          Tap once = <span className="text-emerald-400 font-semibold">include</span> · Tap twice = <span className="text-red-400 font-semibold">exclude</span> · Tap again = reset
        </p>
      </div>

      <div className="flex border-b border-border shrink-0">
        {(["status", "genres", "tags"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-bold capitalize transition-colors
              ${tab === t ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}>
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
                <span className="text-xs font-bold text-foreground w-4">{filters.rating}</span>
                <input
                  type="range" min="0" max="10" step="1"
                  value={filters.rating}
                  onChange={(e) => onChange({ ...filters, rating: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">10</span>
              </div>
            </div>
            <div className="h-px bg-border/50" />
            <PillGroup label="Status" filterKey="status" filters={filters} onToggle={toggle}
              items={STATUS_OPTIONS.map(s => ({ val: s.value, display: s.label, color: s.color }))} />
            <PillGroup label="Country / Format" filterKey="country" filters={filters} onToggle={toggle}
              items={COUNTRY_OPTIONS.map(c => ({
                val: c,
                display: (
                  <span className="flex items-center gap-1.5">
                    <span className={`fi fi-${c.toLowerCase()} rounded-sm`} style={{ width: 14, height: 10 }} />
                    {FORMAT_MAP[c] || c}
                  </span>
                ),
              }))} />
            <PillGroup label="Demographic" filterKey="demographic" filters={filters} onToggle={toggle}
              items={DEMOGRAPHIC_OPTIONS.map(d => ({ val: d, display: d }))} />
          </>
        )}
        {tab === "genres" && (
          <div>
            <div className="relative mb-3">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search genres..." value={genreSearch} onChange={e => setGenreSearch(e.target.value)}
                className="w-full bg-secondary text-xs pl-8 pr-3 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredGenres.map(g => {
                const state = filters.genres[g];
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
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search tags..."
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
                className="w-full bg-secondary text-xs pl-8 pr-3 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.length > 0 ? allTags
                .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
                .map(t => {
                  const state = filters.tags[t];
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

      <FilterSummary filters={filters} onRemove={removeChip} />

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
        <div className="flex-1" />
      </div>
    </>
  );
}

/* ─── Shortcut Dialog ────────────────────────────────── */
function ShortcutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const groups = [
    { title: "LIBRARY", items: [{ label: "Open Filter", keys: ["F"] }, { label: "Focus Search", keys: ["Cmd/Ctrl + K"] }] },
    {
      title: "STORY DETAIL", items: [
        { label: "Next Chapter (+1)", keys: ["N"] },
        { label: "Edit Notes", keys: ["S"] },
        { label: "Edit Rating", keys: ["R"] },
        { label: "Prev / Next Story", keys: ["←", "→"] },
        { label: "Back to Library", keys: ["ESC"] },
      ]
    },
  ];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2"><Keyboard size={18} className="text-primary" /><span className="font-bold text-lg">Keyboard Shortcuts</span></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase mb-3 pl-1">{group.title}</h3>
              <div className="space-y-3">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-foreground/90 font-medium">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      {item.keys.map((key, i) => (
                        <kbd key={i} className="inline-flex items-center justify-center px-2.5 py-1 min-w-[2.5rem] text-xs font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">{key}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-muted/30 px-6 py-3 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground">Press <span className="font-bold text-foreground mx-1">?</span> anywhere to toggle</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Import / Export Dialogs ────────────────────────── */
function ImportDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2"><FileDown size={15} className="text-primary" /><span className="font-bold text-sm">Import Progress</span></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X size={14} className="text-muted-foreground" /></button>
        </div>
        <div className="p-5">
          {!file ? (
            <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <FileDown size={28} className="mx-auto mb-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
              <p className="text-sm font-semibold text-foreground mb-1">Drag & drop file here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to choose</p>
              <span className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold">Choose File</span>
              <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-mono">JSON</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-mono">CSV</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><FileDown size={18} className="text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-xs text-muted-foreground hover:text-foreground underline">Change</button>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all">Cancel</button>
          <button disabled={!file} onClick={() => { if (file) { onImport(); onClose(); setFile(null); } }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all">Import</button>
        </div>
      </div>
    </div>
  );
}

function ExportDialog({ open, onClose, onExport }: { open: boolean; onClose: () => void; onExport: (fmt: string) => void }) {
  const [format, setFormat] = useState("json");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2"><FileUp size={15} className="text-primary" /><span className="font-bold text-sm">Export Progress</span></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X size={14} className="text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase">Select Format</p>
          {[
            { val: "json", label: "JSON", desc: "Full backup — can be re-imported" },
            { val: "csv", label: "CSV", desc: "Spreadsheet compatible" },
          ].map(opt => (
            <button key={opt.val} onClick={() => setFormat(opt.val)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${format === opt.val ? "border-primary/60 bg-primary/8" : "border-border hover:bg-secondary/50"}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${format === opt.val ? "border-primary" : "border-muted-foreground/40"}`}>
                {format === opt.val && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all">Cancel</button>
          <button onClick={() => { onExport(format); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">Export</button>
        </div>
      </div>
    </div>
  );
}

/* ─── QR Canvas ──────────────────────────────────────── */
function QRCanvas({ value, size = 54 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 0,
      color: { dark: "#0d0d18", light: "#ffffff" },
    });
  }, [value, size]);
  return (
    <canvas ref={canvasRef} width={size} height={size} style={{ display: "block", borderRadius: 4 }} />
  );
}

/* ─── Member Card ────────────────────────────────────── */
interface MemberCardProps {
  username: string;
  avatarUrl?: string;
  memberSince?: string;
  storiesCount: number;
  totalChapters: number;
  completedCount: number;
  avgRating: number;
  memberId?: string;
  email?: string;
  issueDate?: string;
}

function MemberCard({
  username,
  avatarUrl,
  memberSince = "2026",
  storiesCount,
  totalChapters,
  completedCount,
  avgRating,
  memberId,
  email,
  issueDate,
}: MemberCardProps) {
  const { currentTheme, mode } = useTheme();
  const primary = currentTheme?.[mode]?.primary ?? "#f59e0b";
  const bg = currentTheme?.[mode]?.background ?? "#0d0d18";
  const card = currentTheme?.[mode]?.card ?? "#16213e";

  const cardId = useMemo(() => {
    if (memberId) return memberId;
    let h = 0;
    for (let i = 0; i < username.length; i++) h = Math.imul(31, h) + username.charCodeAt(i) | 0;
    return `JB-2026-${String(Math.abs(h) % 90000 + 10000)}`;
  }, [username, memberId]);

  const displayDate = issueDate || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, ". ");

  return (
      <div
        style={{
           maxWidth: "400px",
          width: "100%",
          margin: "0 auto",
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`,
          background: bg,
        }}
        className="group"
      >
        {/* gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(135deg, ${primary}cc 0%, ${primary}88 35%, ${card}dd 100%)`,
          pointerEvents: "none",
        }}/>

        {/* noise texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.055, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}/>

        {/* glossy sheen */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 40%, transparent 65%)",
        }}/>

        {/* decorative circles */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox="0 0 320 180" fill="none" preserveAspectRatio="none">
          <circle cx="290" cy="15" r="70" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
          <circle cx="290" cy="15" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          <circle cx="-10" cy="170" r="65" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          <circle cx="175" cy="25" r="1.5" fill="rgba(255,255,255,0.5)"/>
          <circle cx="275" cy="70" r="1" fill="rgba(255,255,255,0.4)"/>
          <line x1="190" y1="48" x2="190" y2="54" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          <line x1="187" y1="51" x2="193" y2="51" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          <line x1="270" y1="110" x2="270" y2="116" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
          <line x1="267" y1="113" x2="273" y2="113" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
        </svg>

        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          {/* TOP CONTENT (Avatar + Info) */}
          <div style={{ display: "flex" }}>
            {/* LEFT STRIP */}
            <div style={{
              width: 100,
              flexShrink: 0,
              padding: "12px 10px 10px 12px",
              borderRight: "0.5px solid rgba(255,255,255,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}>
              <div style={{
                width: "100%",
                aspectRatio: "3/4",
                borderRadius: 8,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                }
              </div>
              <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase" }}>Photo</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                {[
                  { label: "Stories",  val: storiesCount },
                  { label: "Chapters", val: totalChapters },
                  { label: "Done",     val: completedCount },
                  { label: "Avg ★",    val: avgRating > 0 ? avgRating.toFixed(1) : "—" },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>{label}</span>
                    <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT MAIN */}
            <div style={{ flex: 1, padding: "12px 12px 10px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <BookOpen size={11} color="rgba(255,255,255,0.9)"/>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.95)", textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                      JEJAKBACA
                    </span>
                  </div>
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginTop: 1 }}>
                    Reader Card
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", display: "block" }}>Date of issue</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>{displayDate}</span>
                </div>
              </div>

              <div style={{ height: "0.5px", background: "rgba(255,255,255,0.18)", marginBottom: 6 }}/>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 8px", flex: 1 }}>
                {[
                  { label: "Name",   val: `@${username}`,  big: true },
                  { label: "Since",  val: memberSince },
                  { label: "Status", val: "Active" },
                  { label: "Tier",   val: "★ Reader", gold: true },
                ].map(({ label, val, big, gold }) => (
                  <div key={label}>
                    <span style={{ fontSize: 7, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 1 }}>
                      {label}
                    </span>
                    <span style={{
                      fontSize: big ? 15 : 12,
                      fontWeight: 500,
                      color: gold ? "rgba(255,230,100,0.95)" : "#fff",
                      textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      lineHeight: 1.1,
                      display: "block",
                    }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ height: "0.5px", background: "rgba(255,255,255,0.18)", margin: "6px 0" }}/>

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
                <div>
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 1 }}>
                    Member ID
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", fontFamily: "monospace", letterSpacing: "0.07em" }}>
                    {cardId}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <div style={{
                    background: "rgba(255,255,255,0.93)",
                    borderRadius: 6,
                    padding: 3,
                    border: "0.5px solid rgba(255,255,255,0.4)",
                  }}>
                    <QRCanvas value={cardId} size={44}/>
                  </div>
                  <span style={{ fontSize: 6, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Scan ID
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── NEW: EMAIL SECTION (BLURRED) ── */}
          {email && (
            <div style={{
              position: "relative",
              background: "rgba(0,0,0,0.2)",
              borderTop: "0.5px solid rgba(255,255,255,0.1)",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <p
                  className="text-[10px] text-amber-100/80 blur-sm group-hover:blur-0 group-active:blur-0 select-none transition-all duration-300 cursor-pointer text-center"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {email}
                </p>
                <Eye size={8} className="text-amber-500/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div style={{
            position: "relative",
            background: "rgba(0,0,0,0.15)",
            borderTop: "0.5px solid rgba(255,255,255,0.1)",
            padding: "4px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}>
            {["Your reading journey, tracked", "JejakBaca © 2026"].map((t, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {i > 0 && <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "inline-block" }}/>}
                <span style={{ fontSize: 6, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
  );
}

/* ─── Profile Panel ──────────────────────────────────── */
function ProfilePanel({
  open, onClose,
  storiesCount, totalChapters, completedCount, avgRating,
  onExport, onImport, onOpenShortcuts,
  ctaPreference, onCtaChange,
}: {
  open: boolean; onClose: () => void;
  storiesCount: number; totalChapters: number; completedCount: number; avgRating: number;
  onExport: (fmt: string) => void;
  onImport: () => void;
  onOpenShortcuts?: () => void;
  ctaPreference?: "floating" | "inside";
  onCtaChange?: (val: "floating" | "inside") => void;
}) {
  const [backupOpen, setBackupOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [ctaOpen, setCtaOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { user, signInWithGoogle, signOut, memberSince } = useAuth();
  const isGuest = !user || localStorage.getItem("jejakbaca_skip_login") === "true";

  const [localCta, setLocalCta] = useState<"floating" | "inside">(() => {
    const saved = localStorage.getItem("jejakbaca_cta_pref");
    return saved === "floating" || saved === "inside" ? saved : "floating";
  });
  const currentCta = ctaPreference ?? localCta;
  const handleCtaChange = (val: "floating" | "inside") => {
    if (onCtaChange) onCtaChange(val);
    else { setLocalCta(val); localStorage.setItem("jejakbaca_cta_pref", val); }
  };

  const [username, setUsername] = useState(() => localStorage.getItem("jejakbaca_username") || "User");
  const [editUsername, setEditUsername] = useState(username);
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("jejakbaca_avatar") || "");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [issueDate, setIssueDate] = useState<string | undefined>(undefined);

  // ── Pull dari tabel profiles dulu, fallback ke user_metadata, lalu localStorage ──
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        // Pull dari tabel profiles (sumber kebenaran utama)
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url, issue_date") // Ambil issue_date
          .eq("user_id", user.id)
          .single();

        // Fallback ke user_metadata
        const metaName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name;
        const metaAvatar =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture;

        // Tentukan Issue Date
        let finalIssueDate = profile?.issue_date;
        if (!finalIssueDate) {
            const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, ". ");
            finalIssueDate = today;
        }

        const resolvedName  = profile?.username    || metaName  || localStorage.getItem("jejakbaca_username") || "User";
        const resolvedAvatar = profile?.avatar_url || metaAvatar || localStorage.getItem("jejakbaca_avatar")  || "";

        setUsername(resolvedName);
        setEditUsername(resolvedName);
        setAvatarUrl(resolvedAvatar);
        setIssueDate(finalIssueDate);

        // Simpan ke localStorage
        localStorage.setItem("jejakbaca_username", resolvedName);
        if (resolvedAvatar) localStorage.setItem("jejakbaca_avatar", resolvedAvatar);
        localStorage.setItem("jejakbaca_issue_date", finalIssueDate);
        window.dispatchEvent(new Event("storage"));

        // Upsert ke Database jika issue_date belum ada
        if (!profile?.issue_date) {
             await supabase
              .from("profiles")
              .upsert(
                { 
                  user_id: user.id, 
                  username: resolvedName, 
                  avatar_url: resolvedAvatar,
                  issue_date: finalIssueDate
                },
                { onConflict: "user_id" }
              );
        }

      } catch (e) {
        console.error("Failed to load profile:", e);
      }
    })();
  }, [user]);

  // ── Listen storage changes ──
  useEffect(() => {
    const h = () => {
      const u = localStorage.getItem("jejakbaca_username");
      const a = localStorage.getItem("jejakbaca_avatar");
      const i = localStorage.getItem("jejakbaca_issue_date");
      if (u) { setUsername(u); setEditUsername(u); }
      if (a !== null) setAvatarUrl(a);
      if (i) setIssueDate(i);
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  // ── Save profile ──
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      localStorage.setItem("jejakbaca_username", editUsername);
      localStorage.setItem("jejakbaca_avatar", avatarUrl);
      setUsername(editUsername);
      window.dispatchEvent(new Event("storage"));

      if (user && !isGuest) {
        const { supabase } = await import("@/integrations/supabase/client");

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            { user_id: user.id, username: editUsername, avatar_url: avatarUrl },
            { onConflict: "user_id" }
          );

        if (profileError) console.error("Failed to save profile:", profileError);
        else console.log("✅ Profile saved");
      }
    } catch (e) {
      console.error("handleSaveProfile error:", e);
    } finally {
      setSaving(false);
      setEditProfileOpen(false);
    }
  };

  const handleAuthAction = async () => {
    if (isGuest) {
      localStorage.removeItem("jejakbaca_skip_login");
      await signInWithGoogle();
    } else {
      await signOut();
      localStorage.removeItem("jejakbaca_username");
      localStorage.removeItem("jejakbaca_avatar");
      localStorage.removeItem("jejakbaca_issue_date");
      localStorage.removeItem("jejakbaca_skip_login");
      onClose();
    }
  };

  const { mode, setMode, currentTheme } = useTheme();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-96 z-50 bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="font-bold text-sm">Profile</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X size={15} className="text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="m-4 mb-3">
            <MemberCard
              username={username}
              avatarUrl={avatarUrl}
              memberSince={memberSince}
              storiesCount={storiesCount}
              totalChapters={totalChapters}
              completedCount={completedCount}
              avgRating={avgRating}
              email={user?.email}
              issueDate={issueDate}
            />
          </div>

          {/* HANYA UNTUK GUEST: Strip Peringatan tetap di luar */}
          {isGuest && (
            <div className="mx-4 mb-4">
              <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 animate-pulse" />
                <div>
                  <p className="text-[12px] font-semibold text-amber-300">Guest Mode</p>
                  <p className="text-[11px] text-amber-400/70 mt-0.5 leading-relaxed">
                    Sign in to sync your library across devices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Edit Profile button */}
          <div className="px-4 mb-4">
            <button
              onClick={() => setEditProfileOpen(true)}
              className="w-full py-2 rounded-xl border border-border bg-secondary/50 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <Edit size={13} /> Edit Profile
            </button>
          </div>

          {/* Edit Profile form */}
          {editProfileOpen && (
            <div className="mx-4 mb-4 rounded-xl border border-border bg-secondary/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-xs font-bold">Edit Profile</span>
                <button onClick={() => setEditProfileOpen(false)} className="p-1 rounded hover:bg-secondary">
                  <X size={12} className="text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase block mb-1.5">Username</label>
                  <input
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase block mb-1.5">Avatar</label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border overflow-hidden flex items-center justify-center">
                      {avatarUrl
                        ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                        : <User size={20} className="text-muted-foreground/40" />}
                    </div>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      <Camera size={12} /> Upload
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = ev => setAvatarUrl(ev.target?.result as string);
                        r.readAsDataURL(f);
                      }}
                    />
                  </div>
                  <input
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Saving...
                    </>
                  ) : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          <div className="px-4 space-y-2 pb-4">
            {/* Appearance */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20">
              <button onClick={() => setAppearanceOpen(!appearanceOpen)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <Palette size={15} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Appearance</span>
                <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform ${appearanceOpen ? "rotate-90" : ""}`} />
              </button>
              {appearanceOpen && (
                <div className="border-t border-border p-4 space-y-4 bg-secondary/30">
                  <div>
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase mb-2">Mode</p>
                    <div className="flex gap-2 p-1 bg-secondary rounded-xl border border-border">
                      <button onClick={() => setMode("light")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === "light" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Sun size={13} /> Light</button>
                      <button onClick={() => setMode("dark")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === "dark" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Moon size={13} /> Dark</button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase">Theme Colors</p>
                      <button onClick={() => setThemePickerOpen(true)} className="text-[11px] text-primary hover:underline font-semibold">Change</button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[currentTheme.dark.background, currentTheme.dark.card, currentTheme.dark.primary, currentTheme.dark.secondary].map((color, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white/30" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20">
              <button onClick={() => setCtaOpen(!ctaOpen)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <Settings size={15} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Continue Reading Button</span>
                <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform ${ctaOpen ? "rotate-90" : ""}`} />
              </button>
              {ctaOpen && (
                <div className="border-t border-border p-4 bg-secondary/30">
                  <p className="text-[10px] text-muted-foreground/50 mb-3">Where to show the button</p>
                  <div className="flex gap-2 p-1 bg-secondary rounded-xl border border-border">
                    <button onClick={() => handleCtaChange("inside")} className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${currentCta === "inside" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>In Card</button>
                    <button onClick={() => handleCtaChange("floating")} className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${currentCta === "floating" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Floating</button>
                  </div>
                </div>
              )}
            </div>

            {/* Backup */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20">
              <button onClick={() => setBackupOpen(!backupOpen)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <HardDrive size={15} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Backup</span>
                <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform ${backupOpen ? "rotate-90" : ""}`} />
              </button>
              {backupOpen && (
                <div className="border-t border-border">
                  <button onClick={() => setImportOpen(true)} className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/50 transition-colors">
                    <FileDown size={13} className="text-muted-foreground shrink-0" /><span className="text-sm text-foreground">Import Progress</span>
                  </button>
                  <button onClick={() => setExportOpen(true)} className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/50 transition-colors border-t border-border/50">
                    <FileUp size={13} className="text-muted-foreground shrink-0" /><span className="text-sm text-foreground">Export Progress</span>
                  </button>
                </div>
              )}
            </div>

            {/* Shortcuts */}
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/20">
              <button
                onClick={() => { if (onOpenShortcuts) onOpenShortcuts(); else setShortcutsOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <Keyboard size={15} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Shortcuts</span>
                <ChevronRight size={14} className="text-muted-foreground/50" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom action */}
        <div className="px-4 pb-5 pt-3 border-t border-border shrink-0">
          {isGuest ? (
            <button
              onClick={handleAuthAction}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-primary border border-primary/40 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={14} /> Sign In / Login
            </button>
          ) : (
            <button
              onClick={handleAuthAction}
              className="w-full py-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors font-semibold border border-transparent hover:border-red-500/20 flex items-center justify-center gap-2"
            >
              <LogOut size={14} /> Sign Out
            </button>
          )}
        </div>
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} onExport={onExport} />
      <ThemePicker open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />
      <ShortcutDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}

/* ─── Main Navbar ────────────────────────────────────── */
export function Navbar(props: NavbarProps) {
  const { stories } = useStories();
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── KEYBOARD SHORTCUTS ──
  const filterOpenRef = useRef(false);
  const onOpenShortcutsRef = useRef(props.onOpenShortcuts);
  useEffect(() => { filterOpenRef.current = filterOpen; }, [filterOpen]);
  useEffect(() => { onOpenShortcutsRef.current = props.onOpenShortcuts; }, [props.onOpenShortcuts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
        return;
      }

      if (props.variant === "library") {
        if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
          if (!filterOpenRef.current) { e.preventDefault(); setFilterOpen(true); }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [props.variant]);

  const isLibrary = location.pathname === "/" || location.pathname === "/home";
  const isLists = location.pathname === "/lists" || location.pathname.startsWith("/list/");

  const handleExport = async (fmt: string = "json") => {
    try {
      const allStories = await dexieAPI.getAll();
      if (allStories.length === 0) { alert("Your library is empty — nothing to export."); return; }

      if (fmt === "json") {
        const blob = new Blob([JSON.stringify(allStories, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `jejakbaca-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      } else if (fmt === "csv") {
        const headers = ["ID", "Title", "Author", "Status", "Rating", "Current Chapter", "Total Chapters", "Genres", "Tags", "Synopsis", "Updated At"];
        const rows = [headers.join(",")];
        const esc = (v: any) => {
          if (v === null || v === undefined) return '""';
          const str = Array.isArray(v) ? v.join("; ") : String(v);
          return `"${str.replace(/"/g, '""')}"`;
        };
        allStories.forEach(s => {
          rows.push([esc(s.id), esc(s.title), esc(s.author), esc(s.status), s.rating ?? 0, s.currentChapter ?? 0,
            (s as any).totalChapters ?? 0, esc((s as any).genres), esc(s.tags), esc(s.synopsis), esc(s.updatedAt)].join(","));
        });
        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `jejakbaca-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Check the console for details.");
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json,.csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const content = ev.target?.result as string;
          const ext = file.name.split(".").pop()?.toLowerCase();
          if (ext === "json") {
            let data: any;
            try { data = JSON.parse(content); } catch { alert("Invalid JSON file."); return; }
            if (!Array.isArray(data) || data.length === 0) { alert("JSON must be a non-empty array of stories."); return; }
            const ok = confirm(`Found ${data.length} stories. Import and merge into your library?`);
            if (!ok) return;
            let added = 0, failed = 0;
            for (const raw of data) {
              try {
                await dexieAPI.add({
                  id: raw.id || crypto.randomUUID(), title: raw.title || "Untitled",
                  altTitle: raw.altTitle || "", author: raw.author || "",
                  status: raw.status || "plan-to-read", rating: raw.rating ?? 0,
                  tags: raw.tags || [], currentChapter: raw.currentChapter ?? 1,
                  chapterUpdatedAt: raw.chapterUpdatedAt || new Date().toISOString(),
                  updatedAt: raw.updatedAt || new Date().toISOString(),
                  synopsis: raw.synopsis || "", notes: raw.notes || [],
                  bookmarks: raw.bookmarks || [], sources: raw.sources || [],
                  media: raw.media || [], coverUrl: raw.coverUrl || "",
                  headerUrl: raw.headerUrl || "", createdAt: raw.createdAt || new Date().toISOString(),
                  lists: raw.lists || [], relations: raw.relations || [],
                  history: raw.history || [], genres: raw.genres || [],
                  originCountry: raw.originCountry || "",
                });
                added++;
              } catch (err) { console.error("Failed to import:", raw, err); failed++; }
            }
            alert(`Import complete! Added ${added} new stories.${failed > 0 ? ` Failed: ${failed}` : ""}`);
            window.location.reload();
          }
        } catch (err) { console.error("Import error:", err); alert("Import failed."); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const totalChapters = props.totalChapters;
  const completedCount = props.completedCount;
  const avgRating = props.avgRating;

  return (
    <>
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2 px-4 sm:px-6 py-0 h-14 max-w-screen-2xl mx-auto">
          <Logo />

          <nav className="hidden sm:flex items-center gap-1 shrink-0">
            <Link to="/" className={`px-3 py-1.5 text-sm font-bold transition-colors ${isLibrary ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>Home</Link>
            <Link to="/lists" className={`px-3 py-1.5 text-sm font-bold transition-colors ${isLists ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>Lists</Link>
          </nav>

          {props.variant === "library" && (
            <div className="flex items-center gap-2 ml-auto">
              <LibrarySearch search={props.search} onSearchChange={props.onSearchChange} stories={stories} />
              <button onClick={() => setFilterOpen(true)}
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all ${props.filterCount > 0 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                <FilterIcon size={16} />
                {props.filterCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-400 border-2 border-card rounded-full" />}
              </button>
              <div className="hidden sm:block">
                <AddStoryDialog showLabel />
              </div>
              <ProfileButton onClick={() => setProfileOpen(true)} />
            </div>
          )}

          {props.variant === "lists" && (
            <div className="flex items-center gap-2 ml-auto">
              <ListsSearch value={props.listSearch} onChange={props.onListSearchChange} />
              <div className="hidden sm:block">
                <NewListDialogTrigger showLabel existingCount={0}
                  onCreate={(name, color, visibility) => props.onNewList(name, color, visibility)} />
              </div>
              <ProfileButton onClick={() => setProfileOpen(true)} />
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile Bottom Nav ── */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border">
          <div className="flex items-center justify-around px-2 h-16">
            <Link to="/" className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${isLibrary ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              <Home size={22} strokeWidth={2} />
              <span className="text-[10px] font-medium">Home</span>
            </Link>

            <div className="flex flex-col items-center gap-1">
              {props.variant === "lists" ? (
                <>
                  <NewListDialogTrigger showLabel={false} existingCount={0}
                    onCreate={(name, color, visibility) => (props as ListsNavbarProps).onNewList(name, color, visibility)}
                    trigger={
                      <button className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/35 hover:brightness-110 active:scale-95 transition-all -mt-5">
                        <Plus size={22} className="text-primary-foreground" strokeWidth={2.5} />
                      </button>
                    }
                  />
                  <span className="text-[10px] font-semibold text-muted-foreground">Add List</span>
                </>
              ) : (
                <>
                  <AddStoryDialog trigger={
                    <button className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/35 hover:brightness-110 active:scale-95 transition-all -mt-5">
                      <Plus size={22} className="text-primary-foreground" strokeWidth={2.5} />
                    </button>
                  } />
                  <span className="text-[10px] font-semibold text-muted-foreground">Add Story</span>
                </>
              )}
            </div>

            <Link to="/lists" className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${isLists ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              <List size={22} strokeWidth={2} />
              <span className="text-[10px] font-medium">Lists</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Profile Panel */}
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        storiesCount={props.storiesCount}
        totalChapters={totalChapters}
        completedCount={completedCount}
        avgRating={avgRating}
        onExport={handleExport}
        onImport={handleImport}
        onOpenShortcuts={() => {
          if (props.onOpenShortcuts) props.onOpenShortcuts();
          else setShortcutsOpen(true);
        }}
        ctaPreference={props.ctaPreference}
        onCtaChange={props.onCtaChange}
      />

      {props.variant === "library" && (
        <FilterPanel
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={props.filters}
          onChange={props.onFiltersChange}
          allTags={props.allTags ?? []}
        />
      )}

      <ShortcutDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}

export default Navbar;
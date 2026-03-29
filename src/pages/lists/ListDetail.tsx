import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Pencil, Search, LayoutGrid, AlignJustify,
  Check, X, BookOpen, Lock, PlusCircle, Trash2
} from "lucide-react";
import { StoryRow } from "@/component/StoryRow";
import { StoryGrid } from "@/component/StoryGrid";
import { RichTextEditor } from "@/component/RichTextEditor";
import { useState, useRef, useEffect } from "react";
import type React from "react";
import { Navbar } from "@/component/Navbar";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useStories } from "@/lib/StoryContext";

/* ─── Toast ─────────────────────────────────────────────── */
let toastEmitter: ((item: any) => void) | null = null;
function useIphoneToast() {
  const [toasts, setToasts] = useState<any[]>([]);
  useEffect(() => {
    toastEmitter = (item) => {
      setToasts((prev) => [...prev, item]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== item.id)), 3000);
    };
    return () => { toastEmitter = null; };
  }, []);
  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, dismiss };
}
function toast(title: string, description?: string, icon?: React.ReactNode) {
  toastEmitter?.({ id: Date.now() + Math.random(), title, description, icon });
}
function ToastContainer() {
  const { toasts, dismiss } = useIphoneToast();
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse items-center gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl animate-in fade-in slide-in-from-bottom-4 min-w-[240px] max-w-[340px]"
          style={{
            background: "hsl(var(--card) / 0.97)",
            borderColor: "hsl(var(--primary) / 0.35)",
            boxShadow: "0 8px 32px hsl(var(--primary) / 0.18), 0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {/* Icon */}
          {t.icon && (
            <div
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}
            >
              {t.icon}
            </div>
          )}
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{t.title}</p>
            {t.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Select ─────────────────────────────────────────────── */
interface SelectOption { value: string; label: string }
function CustomSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SelectOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((p) => !p)} className="flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-xl px-3 py-2 text-foreground outline-none hover:border-primary/40 transition-colors min-w-[120px]">
        <span className="flex-1 text-left font-medium">{selected?.label ?? "Select"}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 min-w-full">
          {options.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs hover:bg-secondary transition-colors flex items-center gap-2 ${opt.value === value ? "text-primary font-bold bg-primary/5" : "text-foreground"}`}>
              {opt.value === value && <Check size={11} className="text-primary shrink-0" />}
              {opt.value !== value && <span className="w-[11px]" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */
function formatTimeAgo(iso?: string) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Constants ──────────────────────────────────────────── */
const SORT_OPTIONS: SelectOption[] = [
  { value: "custom", label: "Custom Order" },
  { value: "rating", label: "By Rating" },
  { value: "title", label: "Title A–Z" },
];
const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "All Status" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
  { value: "plan-to-read", label: "Plan to Read" },
  { value: "dropped", label: "Dropped" },
];

/* ─── Edit Modal ─────────────────────────────────────────── */
function EditListModal({
  open,
  onClose,
  listConfig,
  descHtml,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  listConfig: any;
  descHtml: string;
  onSave: (desc: string) => void;
}) {
  const [draftDesc, setDraftDesc] = useState(descHtml);

  useEffect(() => {
    if (open) setDraftDesc(descHtml);
  }, [open, descHtml]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md md:max-w-xl rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Edit List</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">List Name</label>
          <input
            value={listConfig?.name ?? ""}
            disabled
            className="w-full text-sm bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-foreground/50 outline-none cursor-not-allowed"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description <span className="normal-case font-normal">(optional)</span>
          </label>
          <div className="rounded-xl border border-border focus-within:border-primary/50 overflow-hidden transition-colors">
            <RichTextEditor content={draftDesc} onChange={setDraftDesc} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(draftDesc); onClose(); }}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function ListDetail() {
  const { id } = useParams();
  const { stories: allStories, updateStory } = useStories();

  const [listConfig, setListConfig] = useState<any>(null);
  const [listStories, setListStories] = useState<any[]>([]);

  useEffect(() => {
    const savedLists = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    const found = savedLists.find((l: any) => l.id === id);
    if (found) {
      setListConfig(found);
      setListStories(allStories.filter((s: any) => s.lists?.includes(id)));
    }
  }, [id, allStories]);

  const [descHtml, setDescHtml] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("custom");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (listConfig) {
      setDescHtml(listConfig.description || "");
    }
  }, [listConfig]);

  if (!listConfig) return (
    <div className="min-h-screen bg-background">
      <Navbar variant="lists" listSearch="" onListSearchChange={() => {}} onNewList={() => {}} storiesCount={allStories.length} totalChapters={0} completedCount={0} avgRating={0} />
      <div className="container px-4 py-20 text-center">
        <p className="text-muted-foreground">List not found</p>
        <Link to="/lists" className="text-primary text-sm mt-2 inline-block">← Back to lists</Link>
      </div>
    </div>
  );

  /* ── Stats ── */
  const completedCount = listStories.filter((s) => s.status === "completed").length;
  const readingCount   = listStories.filter((s) => s.status === "reading").length;
  const planCount      = listStories.filter((s) => s.status === "plan-to-read").length;
  const droppedCount   = listStories.filter((s) => s.status === "dropped").length;

  /* ── Filter & sort ── */
  let filtered = listStories.filter((s) => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });
  if (sortBy === "rating") filtered = [...filtered].sort((a, b) => b.rating - a.rating);
  else if (sortBy === "title") filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));

  /* ── Handlers ── */
  const handleLogChapter = (storyId: string) => {
    const story = listStories.find((s) => s.id === storyId);
    if (story) {
      updateStory(storyId, { currentChapter: (story.currentChapter || 0) + 1, chapterUpdatedAt: new Date().toISOString() });
      toast(`+1 Chapter`, `${story.title} → Ch.${(story.currentChapter || 0) + 1}`, <PlusCircle size={15} />);
    }
  };

  const handleRemove = (storyId: string) => {
    const s = listStories.find((s) => s.id === storyId);
    if (!s) return;
    if (confirm(`Remove "${s.title}" from this list?`)) {
      updateStory(storyId, { lists: (s.lists || []).filter((lId: string) => lId !== id) });
      toast("Removed", `${s.title} removed from list`, <Trash2 size={15} />);
    }
  };

  const handleSaveDesc = (newDesc: string) => {
    const now = new Date().toISOString();
    const savedLists = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    localStorage.setItem("my_reading_lists", JSON.stringify(
      savedLists.map((l: any) => l.id === id ? { ...l, description: newDesc, updatedAt: now } : l)
    ));
    setDescHtml(newDesc);
    setListConfig((prev: any) => ({ ...prev, description: newDesc, updatedAt: now }));
    toast("Saved", "Description updated", <Check size={15} />);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(listStories);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setListStories(items);
  };

  /* ── Global stats for Navbar ── */
  const globalTotalChapters  = allStories.reduce((sum: number, s: any) => sum + (s.currentChapter || 0), 0);
  const globalCompletedCount = allStories.filter((s: any) => s.status === "completed").length;
  const globalRatedStories   = allStories.filter((s: any) => s.rating > 0);
  const globalAvgRating      = globalRatedStories.length
    ? globalRatedStories.reduce((sum: number, s: any) => sum + s.rating, 0) / globalRatedStories.length
    : 0;

  const updatedAgo = formatTimeAgo(listConfig.updatedAt);

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer />

      <EditListModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        listConfig={listConfig}
        descHtml={descHtml}
        onSave={handleSaveDesc}
      />

      <Navbar
        variant="lists"
        listSearch=""
        onListSearchChange={() => {}}
        onNewList={() => {}}
        storiesCount={allStories.length}
        totalChapters={globalTotalChapters}
        completedCount={globalCompletedCount}
        avgRating={globalAvgRating}
      />

      <div className="px-4 md:px-8 py-6 max-w-screen-xl mx-auto space-y-6 pb-24 md:pb-32">

        {/* Back */}
        <Link to="/lists" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={12} /> Back to Lists
        </Link>

        {/* ── Header — clean layout like screenshot ── */}
        <div className="relative">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <h1 className="text-3xl md:text-4xl font-black text-foreground leading-none tracking-tight truncate">
                {listConfig.name}
              </h1>
              {/* Private badge */}
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground shrink-0">
                <Lock size={11} />
                Private
              </span>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditModalOpen(true)}
              className="shrink-0 p-2.5 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              title="Edit list"
            >
              <Pencil size={15} />
            </button>
          </div>

          {/* Description */}
          {descHtml ? (
            <div
              className="mt-2 text-sm text-muted-foreground prose prose-sm max-w-none line-clamp-2 cursor-pointer hover:text-foreground/70 transition-colors"
              dangerouslySetInnerHTML={{ __html: descHtml }}
              onClick={() => setEditModalOpen(true)}
              title="Click to edit"
            />
          ) : (
            <button
              onClick={() => setEditModalOpen(true)}
              className="mt-2 text-xs text-muted-foreground/50 italic hover:text-muted-foreground transition-colors"
            >
              + Add a description
            </button>
          )}

          {/* Meta: updated time only */}
          {updatedAgo && (
            <p className="mt-2 text-xs text-muted-foreground">Updated {updatedAgo}</p>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          <CustomSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <div className="relative flex-1 min-w-[140px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories..."
              className="w-full text-xs bg-secondary border border-border rounded-xl pl-8 pr-3 py-2 text-foreground outline-none placeholder:text-muted-foreground hover:border-primary/30 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="flex items-center gap-0.5 ml-auto">
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}><AlignJustify size={14} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}><LayoutGrid size={14} /></button>
          </div>
        </div>

        {/* ── Stories ── */}
        {filtered.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl opacity-40 animate-pulse" />
                <div className="relative bg-secondary/60 border border-border/50 rounded-full p-6">
                  <BookOpen size={40} className="text-muted-foreground/40" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-foreground">No stories yet</p>
                <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                  {search || statusFilter !== "all"
                    ? "No stories match your current filters."
                    : "Add stories to this list to start tracking your reading."}
                </p>
              </div>
            </div>
          )
          : viewMode === "grid"
            ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pb-4">
                {filtered.map((story) => (
                  <StoryGrid key={story.id} story={story} onLogChapter={handleLogChapter} onRemove={handleRemove} listId={id ?? ""} />
                ))}
              </div>
            )
            : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="stories">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5 pb-4">
                      {filtered.map((story, i) => (
                        <Draggable key={story.id} draggableId={story.id} index={i}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-80" : ""}
                            >
                              <StoryRow story={story} index={i} onLogChapter={handleLogChapter} onRemove={handleRemove} listId={id ?? ""} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )
        }
      </div>
    </div>
  );
}
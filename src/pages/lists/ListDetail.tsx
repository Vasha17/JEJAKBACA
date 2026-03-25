import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Share2, Pencil, Search, LayoutGrid, AlignJustify,
  Star, Check, X, BookOpen, Bold, Italic, List, Heading2, Plus
} from "lucide-react";
import { StoryRow } from "@/component/StoryRow"; 
import { StoryGrid } from "@/component/StoryGrid"; 
import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/component/Navbar";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useStories } from "@/lib/StoryContext"; // <--- PASTIKAN IMPORT INI ADA

/* --- Toast System --- */
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
function toast(title: string, description?: string) {
  toastEmitter?.({ id: Date.now(), title, description });
}
function ToastContainer() {
  const { toasts, dismiss } = useIphoneToast();
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-top-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
            {t.description && <p className="text-[10px] text-muted-foreground truncate">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-muted-foreground"><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

/* --- Select Component --- */
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
      <button onClick={() => setOpen((p) => !p)} className="flex items-center gap-1.5 text-[11px] bg-secondary border border-border rounded-xl px-3 py-1.5 text-foreground outline-none hover:border-primary/40 transition-colors min-w-[110px]">
        <span className="flex-1 text-left">{selected?.label ?? "Select"}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 min-w-full">
          {options.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-secondary transition-colors flex items-center gap-2 ${opt.value === value ? "text-primary font-semibold bg-primary/5" : "text-foreground"}`}>
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

/* --- Rich Text Editor --- */
function RichDescEditor({ value, onChange, onSave, onCancel }: { value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || ""; }, [value]);
  const exec = (cmd: string, val?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); onChange(editorRef.current?.innerHTML ?? ""); };
  const toolbarBtn = (icon: React.ReactNode, cmd: string, label: string) => (
    <button onMouseDown={(e) => { e.preventDefault(); exec(cmd); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title={label}>{icon}</button>
  );
  return (
    <div className="rounded-xl border border-primary/30 bg-secondary/30 overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/60 bg-secondary/50">
        {toolbarBtn(<Bold size={13} />, "bold", "Bold")}
        {toolbarBtn(<Italic size={13} />, "italic", "Italic")}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onCancel} className="px-2 py-1 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={onSave} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all flex items-center gap-1"><Check size={11} /> Save</button>
        </div>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={() => onChange(editorRef.current?.innerHTML ?? "")} className="min-h-[80px] px-4 py-3 text-xs text-foreground outline-none prose prose-sm max-w-none prose-invert" style={{ lineHeight: 1.6 }} />
    </div>
  );
}

/* --- Main Component --- */
const SORT_OPTIONS: SelectOption[] = [{ value: "custom", label: "Custom Order" }, { value: "rating", label: "By Rating" }, { value: "title", label: "Title A–Z" }];
const STATUS_OPTIONS: SelectOption[] = [{ value: "all", label: "All Status" }, { value: "reading", label: "Reading" }, { value: "completed", label: "Completed" }, { value: "plan-to-read", label: "Plan to Read" }, { value: "dropped", label: "Dropped" }];

export default function ListDetail() {
  const { id } = useParams();
  const { stories: allStories, updateStory } = useStories();
  
  // 1. State konfigurasi List (dari LocalStorage)
  const [listConfig, setListConfig] = useState<any>(null);
  
  // 2. State untuk stories yang ada DI DALAM list ini (di-filter dari allStories)
  const [listStories, setListStories] = useState<any[]>([]);

  // Load list config & filter stories saat ID berubah
  useEffect(() => {
    // A. Ambil data List dari LocalStorage
    const savedLists = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    const found = savedLists.find((l: any) => l.id === id);
    
    if (found) {
      setListConfig(found);
      // B. Filter stories yang mengandung ID list ini
      const storiesInList = allStories.filter((s: any) => 
        s.lists && s.lists.includes(id)
      );
      setListStories(storiesInList);
    }
  }, [id, allStories]); // Dependency allStories penting agar update otomatis

  // States UI
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [descHtml, setDescHtml] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("custom");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Sync title/desc ketika listConfig berubah
  useEffect(() => {
    if (listConfig) {
      setTitle(listConfig.name);
      setDescHtml(listConfig.description || "");
    }
  }, [listConfig]);

  useEffect(() => { if (editingTitle && titleInputRef.current) { titleInputRef.current.focus(); titleInputRef.current.select(); } }, [editingTitle]);

  if (!listConfig) return <div className="min-h-screen bg-background"><Navbar /><div className="container px-4 py-20 text-center"><p className="text-muted-foreground">List not found</p><Link to="/lists" className="text-primary text-sm mt-2 inline-block">← Back to lists</Link></div></div>;

  // Hitung statistik berdasarkan listStories
  const completedCount = listStories.filter((s) => s.status === "completed").length;
  const readingCount = listStories.filter((s) => s.status === "reading").length;
  const totalChRead = listStories.reduce((sum, s) => sum + (s.currentChapter || 0), 0);
  const ratedStories = listStories.filter((s) => s.rating > 0);
  const avgRating = ratedStories.length ? (ratedStories.reduce((sum, s) => sum + s.rating, 0) / ratedStories.length).toFixed(1) : "—";

  let filtered = listStories.filter((s) => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  if (sortBy === "rating") filtered = [...filtered].sort((a, b) => b.rating - a.rating);
  else if (sortBy === "title") filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));

  const handleLogChapter = (storyId: string) => {
    // Update global story
    const story = listStories.find((s) => s.id === storyId);
    if (story) {
      updateStory(storyId, { currentChapter: (story.currentChapter || 0) + 1, chapterUpdatedAt: new Date().toISOString() });
      toast(`+1 Chapter`, `${story.title} → Ch.${(story.currentChapter || 0) + 1}`);
    }
  };

  const handleRemove = (storyId: string) => {
    const s = listStories.find((s) => s.id === storyId);
    if (!s) return;
    
    if (confirm(`Remove "${s.title}" from this list?`)) {
        // Hapus ID list dari array 'lists' di story tersebut
        const updatedLists = (s.lists || []).filter((lId: string) => lId !== id);
        updateStory(storyId, { lists: updatedLists });
        toast("Removed", `${s.title} removed from list`);
    }
  };

  const saveTitle = () => { 
    if (draftTitle.trim()) { 
        // Simpan perubahan nama ke LocalStorage juga (opsional)
        const savedLists = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
        const updatedLists = savedLists.map((l: any) => l.id === id ? { ...l, name: draftTitle.trim() } : l);
        localStorage.setItem("my_reading_lists", JSON.stringify(updatedLists));
        
        setTitle(draftTitle.trim()); 
        toast("Title updated"); 
    } 
    setEditingTitle(false); 
  };
  
  const saveDesc = () => { 
    // Simpan deskripsi ke LocalStorage
    const savedLists = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    const updatedLists = savedLists.map((l: any) => l.id === id ? { ...l, description: draftDesc } : l);
    localStorage.setItem("my_reading_lists", JSON.stringify(updatedLists));
    
    setDescHtml(draftDesc); 
    setEditingDesc(false); 
    toast("Description updated"); 
  };

  const handleDragEnd = (result: DropResult) => { 
    if (!result.destination) return; 
    const items = Array.from(listStories); 
    const [moved] = items.splice(result.source.index, 1); 
    items.splice(result.destination.index, 0, moved); 
    // NOTE: Drag and drop order biasanya butuh penyimpanan custom order.
    // Di sini kita hanya update UI visual sementara karena pakai array lokal.
    setListStories(items); 
  };

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer />
      <Navbar />
      <div className="px-4 md:px-8 py-6 max-w-screen-xl mx-auto space-y-5">
        <Link to="/lists" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={12} /> Back to Lists
        </Link>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* GANTI 'list' MENJADI 'listConfig' */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider" style={{ color: listConfig.color, borderColor: `${listConfig.color}40`, backgroundColor: `${listConfig.color}10` }}>{listConfig.status}</span>
              
              {editingTitle ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <input ref={titleInputRef} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }} className="flex-1 text-xl md:text-2xl font-bold bg-secondary border border-primary/30 rounded-xl px-3 py-1 text-foreground outline-none focus:ring-1 focus:ring-primary/30" />
                  <button onClick={saveTitle} className="p-1.5 rounded-lg border border-border bg-card text-primary hover:bg-primary/10 transition-colors shrink-0"><Check size={14} /></button>
                  <button onClick={() => { setEditingTitle(false); setDraftTitle(title); }} className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1.5 group/title">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
                  <button onClick={() => { setEditingTitle(true); setDraftTitle(title); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover/title:opacity-100 transition-all" title="Edit title"><Pencil size={14} /></button>
                </div>
              )}

              <div className="mt-2 w-full">
                {editingDesc ? (
                  <RichDescEditor value={draftDesc} onChange={setDraftDesc} onSave={saveDesc} onCancel={() => { setEditingDesc(false); setDraftDesc(descHtml); }} />
                ) : (
                  <div onClick={() => { setEditingDesc(true); setDraftDesc(descHtml); }} className="w-full min-h-[32px] cursor-pointer hover:bg-secondary/40 rounded-lg px-1 py-0.5 -mx-1 transition-colors group/desc">
                    {descHtml ? <div className="text-xs text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: descHtml }} /> : <p className="text-xs text-muted-foreground/40 italic group-hover/desc:text-muted-foreground transition-colors">Add a description...</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-7">
              <button className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors" title="Share"><Share2 size={14} /></button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {[{ label: "Stories", value: listStories.length }, { label: "Reading", value: readingCount }, { label: "Done", value: completedCount }, { label: "Ch. Read", value: totalChRead }].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 text-xs"><span className="font-bold text-primary">{stat.value}</span><span className="text-muted-foreground text-[10px]">{stat.label}</span></div>
            ))}
            <div className="flex items-center gap-1 text-xs"><Star size={12} className="text-primary fill-primary" /><span className="font-bold text-foreground">{avgRating}</span><span className="text-muted-foreground text-[10px]">Avg</span></div>
          </div>
          
          <div className="h-0.5 rounded-full w-full" style={{ backgroundColor: `${listConfig.color}40` }}><div className="h-full rounded-full transition-all duration-700" style={{ width: listStories.length > 0 ? `${Math.round((completedCount / listStories.length) * 100)}%` : "0%", backgroundColor: listConfig.color }} /></div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          <CustomSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <div className="relative flex-1 min-w-[120px]"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full text-[11px] bg-secondary border border-border rounded-xl pl-7 pr-3 py-1.5 text-foreground outline-none placeholder:text-muted-foreground hover:border-primary/30 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors" /></div>
          <div className="flex items-center gap-0.5 ml-auto">
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}><AlignJustify size={13} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}><LayoutGrid size={13} /></button>
          </div>
        </div>

        {filtered.length === 0 ? <div className="text-center py-12 text-muted-foreground text-xs">No stories found</div> : viewMode === "grid" ? <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">{filtered.map((story) => <StoryGrid key={story.id} story={story} onLogChapter={handleLogChapter} onRemove={handleRemove} />)}</div> : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stories">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                  {filtered.map((story, i) => (
                    <Draggable key={story.id} draggableId={story.id} index={i}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? "opacity-80" : ""}>
                          <StoryRow story={story} index={i} onLogChapter={handleLogChapter} onRemove={handleRemove} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
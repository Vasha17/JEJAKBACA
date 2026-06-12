import { FileText, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { RichTextDisplay } from "@/component/RichTextEditor";
import type { Arc } from "../utils/helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotesTimelineProps {
  story: any;
  activeTab: "notes" | "timeline";
  handleTabChange: (tab: "notes" | "timeline") => void;
  arcs: Arc[];
  setNotesDialog: (v: boolean) => void;
  setEditingNote: (v: any) => void;
  setNoteContent: (v: string) => void;
  setDeleteNoteId: (v: string | null) => void;
  handleOpenArcDialog: (arc?: Arc) => void;
  handleMoveArc: (arcId: string, direction: "up" | "down") => void;
  setDeleteArcId: (v: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotesTimeline({
  story, activeTab, handleTabChange,
  arcs,
  setNotesDialog, setEditingNote, setNoteContent, setDeleteNoteId,
  handleOpenArcDialog, handleMoveArc, setDeleteArcId,
}: NotesTimelineProps) {
  return (
    <section className="px-4 sm:px-6 mt-10 sm:mt-8 mb-20 space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="relative flex items-center rounded-2xl bg-secondary/40 border border-border/50 backdrop-blur-xl p-1 overflow-hidden w-full max-w-[180px] sm:max-w-[330px]">
        <div
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-primary/10 border border-primary/25 shadow-sm transition-all duration-300 ${
          activeTab === "notes"
            ? "left-1"
            : "left-[calc(50%+2px)]"
        }`}
      />

          {(["notes", "timeline"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 relative z-10 py-2 font-medium text-center transition-colors duration-300 whitespace-nowrap ${tab === "notes" ? "px-4" : "px-5"} sm:px-5 ${
              tab === "notes" ? "text-[11px] sm:text-[13px]" : "text-[11px] sm:text-[13px]"
            } ${activeTab === tab ? "text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "notes" ? "My Notes" : "Arc Timeline"}
          </button>
        ))}
        </div>
        {activeTab === "notes" && (
          <button
            onClick={() => { setEditingNote(null); setNoteContent(""); setNotesDialog(true); }}
            className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
          >+ Add Note</button>
        )}
        {activeTab === "timeline" && (
          <button
            onClick={() => handleOpenArcDialog()}
            className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
          >+ Add Arc</button>
        )}
      </div>

      {/* Notes tab */}
      {activeTab === "notes" && (
        story.notes && story.notes.length > 0 ? (
          <div className="space-y-4">
            {story.notes.map((note: any) => (
              <div key={note.id} className="p-5 rounded-xl bg-card/80 border border-border/50 group hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">{format(new Date(note.createdAt), "MMM d, yyyy")}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingNote(note); setNoteContent(note.text); setNotesDialog(true); }}
                      className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    ><Pencil className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => setDeleteNoteId(note.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <RichTextDisplay
                  html={note.text}
                  className="text-sm leading-relaxed [&_*]:text-justify [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:mb-0.5 [&_a]:text-primary [&_a]:underline [&_hr]:border-t [&_hr]:border-border [&_hr]:my-3"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-card/50 border border-dashed border-border flex flex-col items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Your notes live here</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Thoughts, reactions, theories, anything goes here.</p>
            </div>
            <button
              onClick={() => { setEditingNote(null); setNoteContent(""); setNotesDialog(true); }}
              className="text-xs text-primary hover:underline font-medium"
            >Write your first note →</button>
          </div>
        )
      )}

      {/* Timeline tab */}
      {activeTab === "timeline" && (
        arcs.length > 0 ? (
          <div className="relative">
            <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" />
            <div className="space-y-2">
              {[...arcs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((arc, idx) => {
                const isOngoing = arc.chapterEnd === null;
                const isCurrent = story.currentChapter >= arc.chapterStart && (arc.chapterEnd === null || story.currentChapter <= arc.chapterEnd);
                return (
                  <div key={arc.id} className="relative flex items-start gap-4 group/arc">
                    <div className="relative z-10 shrink-0 flex items-start pt-3">
                      <div
                        className={`w-9 h-9 rounded-full border-2 border-background flex items-center justify-center text-white text-[10px] font-bold shadow-md ${isCurrent ? "ring-2 ring-offset-1 ring-offset-background" : ""}`}
                        style={{ backgroundColor: arc.color }}
                      >
                        {isOngoing ? (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                          </span>
                        ) : idx + 1}
                      </div>
                    </div>
                    <div className={`flex-1 mb-2 rounded-xl border p-4 transition-all ${isCurrent ? "bg-card border-primary/40 shadow-sm" : "bg-card/60 border-border/50 hover:border-border"}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-foreground">{arc.name}</h4>
                            {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Reading now</span>}
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
                          <button onClick={() => handleMoveArc(arc.id, "up")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-3.5 h-3.5 rotate-90" /></button>
                          <button onClick={() => handleMoveArc(arc.id, "down")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="w-3.5 h-3.5 rotate-90" /></button>
                          <button onClick={() => handleOpenArcDialog(arc)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteArcId(arc.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {arc.description && <p className="text-xs text-muted-foreground leading-relaxed mt-2 border-t border-border/50 pt-2" style={{ textAlign: "justify" }}>{arc.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-card/50 border border-dashed border-border flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
              <span className="text-muted-foreground/50 text-lg font-bold">1</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">No arcs yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Add story arcs to track your reading progress per arc.</p>
            </div>
            <button onClick={() => handleOpenArcDialog()} className="text-xs text-primary hover:underline font-medium">Add your first arc →</button>
          </div>
        )
      )}
    </section>
  );
}
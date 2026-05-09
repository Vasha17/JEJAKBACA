import { Star, BookOpen, Trash2, PlusCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Status Config ───────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  reading:        { label: "Reading",      color: "text-emerald-400", dot: "bg-emerald-400" },
  completed:      { label: "Completed",    color: "text-sky-400",     dot: "bg-sky-400" },
  "on-hold":      { label: "On Hold",      color: "text-yellow-400",  dot: "bg-yellow-400" },
  hiatus:         { label: "Hiatus",       color: "text-orange-400",  dot: "bg-orange-400" },
  "plan-to-read": { label: "Plan to Read", color: "text-zinc-400",    dot: "bg-zinc-400" },
  dropped:        { label: "Dropped",      color: "text-red-400",     dot: "bg-red-400" },
  "re-reading":   { label: "Re-reading",   color: "text-pink-400",    dot: "bg-pink-400" },
};

// ─── Star Rating ──────────────────────────────────────

// ─── Interfaces ───────────────────────────────────────
interface StoryRowProps {
  story: any;
  index: number;
  listId?: string;
  onLogChapter: (id: string) => void;
  onRemove: (id: string) => void;
  onRatingChange?: (id: string, rating: number) => void;
  bulkMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

// ─── Main Component ──────────────────────────────────
export function StoryRow({ story, index, listId, onLogChapter, onRemove, bulkMode, selectedIds, onToggleSelect }: StoryRowProps) {
  const statusCfg = STATUS_CONFIG[story.status] ?? STATUS_CONFIG["plan-to-read"];
  const navigate = useNavigate();
  const isSelected = selectedIds?.has(story.id) ?? false;

  return (
    <div
      onClick={() => {
        if (bulkMode) {
          onToggleSelect?.(story.id);
        } else {
          navigate(`/story/${story.id}`, { state: { fromListId: listId } });
        }
      }}
      className="group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border/60 bg-card hover:bg-card/80 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Checkbox / Index */}
      <div className="flex items-center shrink-0 w-8 z-10" onClick={e => e.stopPropagation()}>
        {bulkMode ? (
          <button
            onClick={() => onToggleSelect?.(story.id)}
            className="w-6 h-6 rounded bg-card/90 backdrop-blur border border-primary flex items-center justify-center shadow-md transition-colors"
          >
            {isSelected ? <Check size={14} className="text-primary" /> : null}
          </button>
        ) : (
          <>
            <span className="group-hover:hidden text-[11px] font-mono font-black text-muted-foreground/30 w-5 text-right select-none tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="hidden group-hover:flex text-muted-foreground/50 cursor-grab active:cursor-grabbing p-1">
              <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
                <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                <circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
              </svg>
            </span>
          </>
        )}
      </div>

      {/* Cover */}
      <div className="shrink-0 w-12 h-16 rounded-xl overflow-hidden bg-secondary border border-border/50 shadow-md transition-all duration-200 group-hover:shadow-primary/20 group-hover:shadow-lg">
        {story.coverUrl
          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><BookOpen size={18} /></div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-sm text-foreground truncate leading-tight group-hover:text-primary transition-colors">
          {story.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${statusCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
          {story.currentChapter > 0 && (
            <span className="text-[11px] text-muted-foreground/60 font-medium">
              Ch.{story.currentChapter}
            </span>
          )}
        </div>
      </div>

      {/* Rating */}
      {!bulkMode && (
        <div className="shrink-0 flex flex-col items-end gap-1.5 z-20" onClick={e => e.stopPropagation()}>                      
          {story.rating > 0 && (
            <div className="flex items-center gap-0.5 bg-amber-400/20 px-1.5 py-0.5 rounded-full">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="text-[12px] font-bold text-amber-300">{story.rating}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!bulkMode && (
        <div className="shrink-0 flex items-center gap-1 ml-1 z-25" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onLogChapter(story.id); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Log chapter"
          >
            <PlusCircle size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(story.id); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Remove from list"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { Star, BookOpen, Trash2, PlusCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Status Config ───────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  reading:        { label: "Reading",      color: "text-emerald-400", dot: "bg-emerald-400" },
  completed:      { label: "Completed",    color: "text-sky-400",     dot: "bg-sky-400" },
  "plan-to-read": { label: "Plan to Read", color: "text-zinc-400",    dot: "bg-zinc-400" },
  dropped:        { label: "Dropped",      color: "text-red-400",     dot: "bg-red-400" },
};

// ─── Star Rating ──────────────────────────────────────
function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || rating;
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange?.(i === rating ? 0 : i); }}
          onMouseEnter={() => setHovered(i)}
          className="transition-transform hover:scale-110 active:scale-95 z-20 relative"
          title={`Rate ${i}`}
        >
          <Star
            size={17}
            className={`transition-colors duration-100 ${
              i <= active
                ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]"
                : "text-zinc-600 fill-transparent"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Interfaces ───────────────────────────────────────
interface StoryRowProps {
  story: any;
  index: number;
  listId: string;
  onLogChapter: (id: string) => void;
  onRemove: (id: string) => void;
  onRatingChange?: (id: string, rating: number) => void;
  bulkMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

// ─── Main Component ──────────────────────────────────
export function StoryRow({ story, index, listId, onLogChapter, onRemove, onRatingChange, bulkMode, selectedIds, onToggleSelect }: StoryRowProps) {
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
      className="group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border/60 bg-card hover:bg-card/80 hover:border-primary/50 transition-all duration-150 hover:shadow-md hover:shadow-primary/5 cursor-pointer"
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
            <span className="group-hover:hidden text-[11px] font-bold text-muted-foreground/40 w-5 text-right select-none">
              {index + 1}
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
      <div className="shrink-0 w-12 h-16 rounded-xl overflow-hidden bg-secondary border border-border/50 shadow-md">
        {story.coverUrl
          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
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
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
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
          <div className="hidden sm:block">
            <StarRating rating={story.rating || 0} onChange={(r) => onRatingChange?.(story.id, r)} />
          </div>
          {story.rating > 0 && (
            <span className="text-[11px] font-black text-amber-400 tabular-nums leading-none">
              {story.rating}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {!bulkMode && (
        <div className="shrink-0 flex items-center gap-1 ml-1 z-30" onClick={e => e.stopPropagation()}>
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
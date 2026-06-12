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
export function StoryRow({ story, listId, onLogChapter, onRemove, bulkMode, selectedIds, onToggleSelect }: StoryRowProps) {
  const statusCfg = STATUS_CONFIG[story.status] ?? STATUS_CONFIG["plan-to-read"];
  const navigate = useNavigate();
  const isSelected = selectedIds?.has(story.id) ?? false;
const updatedAt = new Date(story.chapterUpdatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const timeAgo = !story.chapterUpdatedAt ? null
    : diffMins < 1 ? "Just now"
    : diffMins < 60 ? `${diffMins}m ago`
    : diffHours < 24 ? `${diffHours}h ago`
    : diffDays < 365 ? `${diffDays}d ago`
    : `${Math.floor(diffDays / 365)}y ago`;

  return (
    <div
      onClick={() => {
        if (bulkMode) onToggleSelect?.(story.id);
        else navigate(`/story/${story.id}`, { state: { fromListId: listId } });
      }}
      className="group relative flex gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-secondary hover:border-border transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Checkbox / drag */}
      <div className="flex items-center shrink-0 self-center z-10" onClick={e => e.stopPropagation()}>
        {bulkMode ? (
          <button onClick={() => onToggleSelect?.(story.id)}
            className="w-6 h-6 rounded bg-card/90 backdrop-blur border border-primary flex items-center justify-center shadow-md">
            {isSelected ? <Check size={14} className="text-primary" /> : null}
          </button>
        ) : (
          <span className="text-muted-foreground/40 cursor-grab p-1">
            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
              <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
              <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
              <circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
            </svg>
          </span>
        )}
      </div>

      {/* Cover */}
      <div className="w-20 shrink-0 aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/50">
        {story.coverUrl
          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={18} className="text-muted-foreground/20" /></div>}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {story.title}
          </p>
          {timeAgo && <span className="text-[10px] text-foreground/60 shrink-0 bg-secondary px-2 py-0.5 rounded-md border border-border/50 whitespace-nowrap">{timeAgo}</span>}
        </div>

        {story.synopsis && (
          <p className="text-[11px] text-foreground/60 line-clamp-2 leading-relaxed italic border-l-2 border-primary/50 pl-2">
            "{story.synopsis.slice(0, 300)}..."
          </p>
        )}

        {story.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {story.genres.slice(0, 4).map((g: string) => (
              <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{g}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-[11px] font-medium ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {story.rating > 0 && (
              <div className="flex items-center gap-0.5">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{story.rating}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 z-10" onClick={e => e.stopPropagation()}>
            {!bulkMode && (
              <>
                <button onClick={e => { e.stopPropagation(); onLogChapter(story.id); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <PlusCircle size={14} />
                </button>
                <button onClick={e => { e.stopPropagation(); onRemove(story.id); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <span className="text-[11px] text-primary font-bold ml-1">Ch. {story.currentChapter}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
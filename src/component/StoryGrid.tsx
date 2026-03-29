import { Link } from "react-router-dom";
import { Story } from "@/lib/types";
import { Star, BookOpen, Plus, X } from "lucide-react";

// ─── Interfaces ───────────────────────────────────────
interface StoryGridProps {
  story: Story;
  listId: string; 
  onLogChapter?: (id: string) => void;
  onRemove?: (id: string) => void;
}

// ─── Constants ───────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  reading: "#22c55e",
  completed: "#3b82f6",
  "plan-to-read": "#6b7280",
  dropped: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  reading: "Reading",
  completed: "Completed",
  "plan-to-read": "Plan",
  dropped: "Dropped",
};

// ─── Component ───────────────────────────────────────
export function StoryGrid({ story, listId, onLogChapter, onRemove }: StoryGridProps) {
  return (    
    <Link 
      to={`/story/${story.id}`}
      state={{ fromListId: listId }}
      className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-secondary border border-border transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 cursor-pointer block"
    >
      {/* Cover Image */}
      {story.coverUrl ? (
        <img
          src={story.coverUrl}
          alt={story.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-card">
          <BookOpen className="w-10 h-10 text-muted-foreground/20" />
        </div>
      )}

      {/* Top Overlay: Status & Rating */}
      <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: STATUS_COLORS[story.status] ?? "#6b7280" }}
          />
          <span className="text-[9px] text-white/80 whitespace-nowrap font-medium">
            {STATUS_LABEL[story.status] ?? story.status}
          </span>
        </div>
        {story.rating > 0 && (
          <div className="flex items-center gap-0.5 bg-amber-400/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            <Star size={9} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-300">{story.rating}</span>
          </div>
        )}
      </div>

      {/* Bottom Overlay: Info & Actions */}
      <div className="absolute inset-x-0 bottom-0 pt-10 pb-2 px-2 bg-gradient-to-t from-black/90 via-black/65 to-transparent z-10">
        <h3 className="text-[11px] font-bold text-white leading-tight line-clamp-2 drop-shadow-md mb-1">
          {story.title}
        </h3>

        {/* Bottom Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/70">
            <BookOpen size={10} />
            <span className="text-[10px] font-mono">
              {story.currentChapter}
              {story.totalChapters ? `/${story.totalChapters}` : ""}
            </span>
            {story.type && (
              <span className="text-[9px] px-1.5 py-px rounded bg-white/10 text-white/60 font-medium ml-1 uppercase">
                {story.type}
              </span>
            )}
          </div>

          {/* Action Buttons (Hover only) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button
              onClick={(e) => { e.stopPropagation(); onLogChapter?.(story.id); }}
              className="p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-primary hover:border-primary transition-all hover:scale-110"
              title="+1 Chapter"
            >
              <Plus size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove?.(story.id); }}
              className="p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-red-500 hover:border-red-500 transition-all hover:scale-110"
              title="Remove"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
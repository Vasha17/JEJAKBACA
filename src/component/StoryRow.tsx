// components/StoryRow.tsx
import { Story } from "@/lib/types";
import { Star, GripVertical, Plus, X, BookOpen } from "lucide-react";

interface StoryRowProps {
  story: Story;
  index: number;
  onLogChapter?: (id: string) => void;
  onRemove?: (id: string) => void;
}

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

export function StoryRow({ story, index, onLogChapter, onRemove }: StoryRowProps) {
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
      {/* Drag handle */}
      <GripVertical
        size={14}
        className="text-muted-foreground/40 cursor-grab flex-shrink-0"
      />

      {/* Rank */}
      <span className="text-[10px] font-bold text-muted-foreground w-4 text-right flex-shrink-0">
        {index + 1}
      </span>

      {/* Cover thumbnail */}
      <div className="w-9 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-secondary border border-border shadow-sm">
        {story.coverUrl ? (
          <img
            src={story.coverUrl}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={12} className="text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-xs text-foreground truncate">{story.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] px-1 py-px rounded bg-secondary text-muted-foreground font-medium">
            {story.type}
          </span>
          <span className="text-[9px] text-muted-foreground">
            Ch.{story.currentChapter}
            {story.totalChapters > 0 ? `/${story.totalChapters}` : ""}
          </span>
          <div className="flex items-center gap-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[story.status] ?? "#6b7280" }}
            />
            <span className="text-[9px] text-muted-foreground">
              {STATUS_LABEL[story.status] ?? story.status}
            </span>
          </div>
        </div>
      </div>

      {/* Rating stars */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={10}
            className={
              i < Math.round(story.rating / 2)
                ? "text-primary fill-primary"
                : "text-muted-foreground/30"
            }
          />
        ))}
      </div>

      {/* Quick Actions: only +1 Chapter & Remove */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onLogChapter?.(story.id)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="+1 Chapter"
        >
          <Plus size={12} />
        </button>
        <button
          onClick={() => onRemove?.(story.id)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
import { BookOpen, CheckCircle2, BookMarked, Trash2, Star, Clock } from "lucide-react";
import { ReadingList } from "@/lib/types";

interface ListCardProps {
  list: ReadingList;
  onDelete?: () => void;
}

export function ListCard({ list, onDelete }: ListCardProps) {
  const stories = list.stories || [];
  const count = list.count ?? stories.length ?? 0;  
  const covers = stories
    .map((s: any) => s.coverUrl)
    .filter(Boolean)
    .slice(0, 3);

  const ratedStories = stories.filter((s: any) => s.rating > 0);
  const avgRating = ratedStories.length
    ? (ratedStories.reduce((sum: number, s: any) => sum + s.rating, 0) / ratedStories.length).toFixed(1)
    : null;

  const hasCover = covers.length > 0;
  const listColor = list.color || "#3b82f6";   
  const getRelativeTime = (dateInput: any) => {
    if (!dateInput) return "Just now";

    let date: Date;
    
    try {      
      if (dateInput instanceof Date) {
        date = dateInput;
      }       
      else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      }       
      else {
        date = new Date(dateInput);
      }      
      if (isNaN(date.getTime())) return "Unknown";

      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + "y ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + "mo ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + "d ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + "h ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + "m ago";
      return "Just now";
    } catch (error) {
      return "Just now";
    }
  };

  const timeAgo = getRelativeTime(list.updatedAt);

  return (
    <div className="group relative w-full aspect-[4/4] rounded-2xl overflow-hidden
      bg-secondary/50 border border-white/10 dark:border-white/5
      transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
      hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20
      hover:scale-[1.02] hover:-translate-y-1.5 cursor-pointer">
      
      {/* ── Background Pattern (Jika tidak ada cover) ── */}
      {!hasCover && (
        <div 
          className="absolute inset-0 opacity-100 transition-colors duration-500"
          style={{ 
            backgroundColor: `${listColor}15`,
            backgroundImage: `radial-gradient(${listColor}33 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
      )}

      {/* ── Cover Layout ── */}
      {hasCover && (
        <div className="absolute inset-0 flex gap-1.5 p-1.5">
          {/* Main Image (Left - 60%) */}
          <div className="w-[60%] h-full relative overflow-hidden rounded-xl shadow-lg">
            <img
              src={covers[0]}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
            {/* Overlay vignette for main image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          </div>

          {/* Stacked Images (Right - 40%) */}
          <div className="flex-1 flex flex-col gap-1.5 h-full">
            <div className="flex-1 relative overflow-hidden rounded-xl shadow-md">
              <img
                src={covers[1]}
                alt=""
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 delay-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="flex-1 relative overflow-hidden rounded-xl shadow-md">
              <img
                src={covers[2]}
                alt=""
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 delay-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>
        </div>
      )}

      {/* ── Global Gradient Overlay (Text Contrast) ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(0,0,0,0.6) 0%,
              rgba(0,0,0,0.1) 40%,
              rgba(0,0,0,0.05) 60%,
              ${listColor}dd 85%,
              ${listColor} 100%
            )
          `,
        }}
      />

      {/* ── Content Wrapper ── */}
      <div className="relative z-10 flex flex-col h-full p-6">                
        <div className="flex-1" />

        {/* Bottom Info */}
        <div className="space-y-3">
          {/* Title */}
          <h3
            className="text-xl font-extrabold leading-tight line-clamp-2 text-white
            drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            {list.name}
          </h3>          

          {/* Meta Row */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-white/10 backdrop-blur-sm">
                <BookOpen size={12} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-xs font-bold leading-none"
                  style={{ color: hasCover ? "#fff" : "hsl(var(--foreground))" }}
                >
                  {count} {count === 1 ? "Story" : "Stories"}
                </span>
                {/* ── UPDATED TIME SECTION ── */}
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={10} className="opacity-70" style={{ color: hasCover ? "rgba(255,255,255,0.7)" : "hsl(var(--muted-foreground))" }} />
                  <span
                    className="text-[10px] font-medium opacity-75"
                    style={{ color: hasCover ? "rgba(255,255,255,0.7)" : "hsl(var(--muted-foreground))" }}
                  >
                    {timeAgo}
                  </span>
                </div>
                {/* ── END UPDATED TIME SECTION ── */}
              </div>
            </div>

            {/* Action Button Group (Visible on Hover) */}
            <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 transform sm:translate-x-2 sm:group-hover:translate-x-0">             
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white shadow-lg backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                  title="Delete List"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
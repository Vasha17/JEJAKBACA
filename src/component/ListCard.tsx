import { useState } from "react";
import { BookOpen, Trash2, Clock } from "lucide-react";
import { ReadingList } from "@/lib/types";

interface ListCardProps {
  list: ReadingList;
  onDelete?: () => void;
}

export function ListCard({ list, onDelete }: ListCardProps) {
  const [loadedImages, setLoadedImages] = useState<{ [key: number]: boolean }>({});

  const stories = list.stories || [];
  const count = list.count ?? stories.length ?? 0;

  const covers = stories
    .map((s: any) => s.coverUrl)
    .filter(Boolean)
    .slice(0, 3);

  const hasCover = covers.length > 0;
  const listColor = list.color || "#3b82f6";

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => ({ ...prev, [index]: true }));
  };

  const getRelativeTime = (dateInput: any) => {
    if (!dateInput) return "Just now";
    const date = new Date(dateInput);
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
  };

  const timeAgo = getRelativeTime(list.updatedAt);

  return (
    <div className="group relative w-full aspect-[4/4] sm:!h-[320px] sm:!aspect-auto rounded-2xl overflow-hidden
      bg-secondary/50 border border-white/10 dark:border-white/5
      transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
      hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20
      hover:scale-[1.02] hover:-translate-y-1.5 cursor-pointer">

      {/* Background pattern */}
      {!hasCover && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: `${listColor}15`,
            backgroundImage: `radial-gradient(${listColor}33 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
      )}

      {/* COVER */}
      {hasCover && (
        <div className="absolute inset-0 flex gap-1.5 p-1.5">

          {/* MAIN */}
          <div className="w-[60%] h-full relative overflow-hidden rounded-xl">
            <img
              src={covers[0]}
              onLoad={() => handleImageLoad(0)}
              className={`
                w-full h-full object-cover
                transition-all duration-700 ease-out
                ${loadedImages[0]
                  ? "opacity-100 scale-100 blur-0"
                  : "opacity-0 scale-110 blur-md"}
                group-hover:scale-110
              `}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          </div>

          {/* RIGHT STACK */}
          <div className="flex-1 flex flex-col gap-1.5 h-full">

            {/* TOP */}
            <div className="flex-1 relative overflow-hidden rounded-xl">
              <img
                src={covers[1]}
                onLoad={() => handleImageLoad(1)}
                className={`
                  w-full h-full object-cover
                  transition-all duration-700 ease-out delay-75
                  ${loadedImages[1]
                    ? "opacity-100 scale-100 blur-0"
                    : "opacity-0 scale-110 blur-md"}
                  group-hover:scale-110
                `}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            {/* BOTTOM */}
            <div className="flex-1 relative overflow-hidden rounded-xl">
              <img
                src={covers[2]}
                onLoad={() => handleImageLoad(2)}
                className={`
                  w-full h-full object-cover
                  transition-all duration-700 ease-out delay-100
                  ${loadedImages[2]
                    ? "opacity-100 scale-100 blur-0"
                    : "opacity-0 scale-110 blur-md"}
                  group-hover:scale-110
                `}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
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

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col h-full p-6">
        <div className="flex-1" />

        <div className="space-y-3">
          <h3 className="text-xl font-extrabold leading-tight line-clamp-2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {list.name}
          </h3>

          <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-white/10 backdrop-blur-sm">
                <BookOpen size={12} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">
                  {count} {count === 1 ? "Story" : "Stories"}
                </span>

                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={10} className="text-white/70" />
                  <span className="text-[10px] text-white/70">
                    {timeAgo}
                  </span>
                </div>
              </div>
            </div>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all hover:scale-110 active:scale-95"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
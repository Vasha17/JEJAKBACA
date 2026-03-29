import { Story } from "@/lib/types";
import { BookOpen, Star, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef } from "react";

const STATUS_COLORS: Record<string, string> = {
  reading:        "bg-green-500/20 text-green-400 border-green-500/20",
  completed:      "bg-blue-500/20 text-blue-400 border-blue-500/20",
  "on-hold":      "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  dropped:        "bg-red-500/20 text-red-400 border-red-500/20",
  "plan-to-read": "bg-gray-500/20 text-gray-400 border-gray-500/20",
  "re-reading":   "bg-purple-500/20 text-purple-400 border-purple-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  reading: "Reading", completed: "Completed", "on-hold": "On Hold",
  dropped: "Dropped", "plan-to-read": "Plan to Read", "re-reading": "Re-reading",
};

const COUNTRY_FLAG: Record<string, string> = {
  jp: "🇯🇵", kr: "🇰🇷", cn: "🇨🇳",
};

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

interface StoryCardProps {
  story: Story;
  searchQuery?: string;
}

export function StoryCard({ story, searchQuery = "" }: StoryCardProps) {
  const [showPeek, setShowPeek] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long-press handlers (mobile)
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowPeek(true), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const flag = story.originCountry ? COUNTRY_FLAG[story.originCountry.toLowerCase()] : null;

  return (
    <div className="relative group">
      <Link
        to={`/story/${story.id}`}
        className="block rounded-xl overflow-hidden bg-card border border-border transition-all duration-300
          hover:border-primary/30 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* ── COVER AREA ── */}
        <div className="aspect-[3/4] relative overflow-hidden bg-secondary">

          {/* Cover image */}
          {story.coverUrl ? (
            <img
              src={story.coverUrl}
              alt={story.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/30"/>
            </div>
          )}

          {/* Bottom gradient + title overlay */}
          <div className="absolute inset-x-0 bottom-0 pt-10 pb-2 px-2
            bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <h3 className="text-[11px] sm:text-xs font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
              {highlightText(story.title, searchQuery)}
            </h3>
          </div>

          {/* Chapter badge — bottom right inside cover */}
          <div className="absolute bottom-2 right-2">
            <span className="text-[9px] font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
              Ch.{story.currentChapter}
            </span>
          </div>

          {/* Flag — top left */}
          {flag && (
            <div className="absolute top-1.5 left-1.5 text-base leading-none drop-shadow-lg"
              title={story.originCountry?.toUpperCase()}>
              {flag}
            </div>
          )}

          {/* Info button — top right (desktop hover) */}
          <button
            onClick={e => { e.preventDefault(); setShowPeek(v => !v); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm
              flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
              hover:bg-black/80 text-white/80 hover:text-white"
            aria-label="Info"
          >
            <Info size={11}/>
          </button>
        </div>

        {/* ── BOTTOM INFO ── */}
        <div className="px-2 py-1.5 flex items-center justify-between gap-1">
          {/* Rating */}
          <div className="flex items-center gap-0.5">
            <Star size={10} className="fill-yellow-400 text-yellow-400"/>
            <span className="text-[10px] font-bold text-yellow-400">{story.rating || "—"}</span>
          </div>
          {/* Status */}
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium ${STATUS_COLORS[story.status] || "bg-secondary text-secondary-foreground border-border"}`}>
            {STATUS_LABELS[story.status]}
          </span>
        </div>
      </Link>

      {/* ── PEEK MODAL (info button / long press) ── */}
      {showPeek && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-48
          bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-3 space-y-2
          animate-fade-in pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* cover large */}
          {story.coverUrl && (
            <div className="w-full aspect-[3/4] rounded-xl overflow-hidden">
              <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover"/>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-foreground line-clamp-2">{story.title}</p>
            {story.author && <p className="text-[10px] text-muted-foreground">{story.author}</p>}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Ch. {story.currentChapter}</span>
            <div className="flex items-center gap-0.5">
              <Star size={9} className="fill-yellow-400 text-yellow-400"/>
              <span className="font-bold text-yellow-400">{story.rating||"—"}</span>
            </div>
          </div>
          {story.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {story.tags.slice(0,4).map(t => (
                <span key={t} className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
          <button onClick={() => setShowPeek(false)}
            className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1">
            Tutup
          </button>
        </div>
      )}

      {/* Close peek when clicking outside */}
      {showPeek && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPeek(false)}/>
      )}
    </div>
  );
}
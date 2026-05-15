import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Star, Play, Flame, Timer } from "lucide-react";

interface HeroSectionProps {
  story: any;
  onPlusOne: (id: string) => void;
  isVault?: boolean;
}

export function HeroSection({ story, onPlusOne, isVault }: HeroSectionProps) {
  if (!story) return null;

  const daysSinceUpdate = useMemo(() => {
    const ts = new Date(story.chapterUpdatedAt || story.updatedAt || 0).getTime();
    return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  }, [story]);

  const isLongUnread = daysSinceUpdate >= 7;
  const bgImage = story.headerUrl || story.coverUrl;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-6 group border border-border/50 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30">
      <div className="absolute inset-0 z-0">
        {bgImage ? (
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 opacity-40 transition-transform duration-700 group-hover:scale-125" />
        ) : (
          <div className="absolute inset-0 scale-110 opacity-80 bg-primary/20" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-0" />
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0" />
      <div className="relative flex items-center gap-5 p-5 sm:p-7 z-10">
        <div className="flex-shrink-0 w-20 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-secondary transition-transform duration-500 group-hover:scale-[1.03]">
          {story.coverUrl
            ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover opacity-95 contrast-110 saturate-110" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-muted-foreground/30" /></div>}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/80 flex items-center gap-1.5">
            {isLongUnread
              ? <><Timer size={11} className="text-amber-400" /><span className="text-amber-400">Haven't read in {daysSinceUpdate}d</span></>
              : <><Flame size={11} className="text-orange-400" /> Continue Reading</>}
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{story.title}</h2>
          {story.author && <p className="text-xs text-muted-foreground">{story.author}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star size={11} className="fill-yellow-400 text-yellow-400" />{story.rating || "—"}</span>
            <span>Ch. {story.currentChapter}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Link to={`/story/${story.id}`}
              state={{ fromVault: isVault }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
              <Play size={13} fill="currentColor" /> Continue Reading
            </Link>
            <button
              onClick={(e) => { e.preventDefault(); onPlusOne(story.id); }}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-all active:scale-95">
              <BookOpen size={13} />
              <span className="hidden sm:inline">+1 Chapter</span>
              <span className="sm:hidden">+1</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
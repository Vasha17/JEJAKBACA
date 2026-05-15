import { BookOpen, Star, X, BookIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/component/ui/dialog";
import "flag-icons/css/flag-icons.min.css";
import { useIsMobile } from "@/hooks/use-mobile";
import { STATUS_COLORS, FORMAT_MAP } from "../constants";
import { getStatusInfo } from "../utils";

interface QuickViewModalProps {
  story: any;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export function QuickViewModal({ story, onClose, onNavigate }: QuickViewModalProps) {
  const isMobile = useIsMobile();
  const si = getStatusInfo(story.status);
  const fmt = FORMAT_MAP[(story.originCountry || "").toUpperCase()] || null;
  const latestCh = story.sources?.length
    ? Math.max(...story.sources.map((s: any) => s.currentChapter || 0))
    : story.currentChapter || 0;

  const CoverBlock = ({ className = "" }: { className?: string }) => (
    <div className={`relative bg-secondary overflow-hidden ${className}`}>
      <div className="absolute inset-0">
        {story.coverUrl
          ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-14 h-14 text-muted-foreground/15" /></div>}
      </div>
      <div className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: "75%", background: "linear-gradient(to top, rgba(0,0,0,0.90), transparent)" }} />
      <div className="absolute bottom-0 inset-x-0 p-4 space-y-2.5 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <Star size={13} className="fill-amber-400 text-amber-400 shrink-0 mb-0.5" />
          <span className="text-2xl font-black text-amber-400 leading-none">{story.rating || "—"}</span>
          <span className="text-[11px] text-white/40 self-end">/10</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <BookOpen size={11} className="text-white/60 shrink-0" />
            <span className="text-xs font-bold text-white">
              {story.currentChapter}
              {latestCh > story.currentChapter && <span className="text-white/40 font-normal"> / {latestCh}</span>}
              <span className="text-white/40 text-[10px] font-normal"> ch</span>
            </span>
          </div>
          {latestCh > 0 && (
            <div className="h-0.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                style={{ width: `${Math.min(100, (story.currentChapter / latestCh) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {story.originCountry && <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm`} style={{ width: 18, height: 13 }} />}
          {fmt && <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">{fmt}</span>}
        </div>
      </div>
    </div>
  );

  const DetailContent = () => (
    <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3 space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 pr-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
          style={{ backgroundColor: `${STATUS_COLORS[story.status]}15`, color: STATUS_COLORS[story.status], borderColor: `${STATUS_COLORS[story.status]}30` }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: STATUS_COLORS[story.status] }} />{si.label}
        </span>
        {story.demographic && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/80 text-muted-foreground border border-border">
            {story.demographic}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <h2 className="font-bold text-foreground leading-snug tracking-tight"
          style={{ fontSize: "clamp(1rem,2.4vw,1.25rem)" }}>{story.title}</h2>
        {story.altTitle && <p className="text-[12px] text-muted-foreground/60 italic line-clamp-1">{story.altTitle}</p>}
        {story.author && <p className="text-[12px] text-muted-foreground/50 font-medium">{story.author}</p>}
      </div>
      <div className="h-px bg-white/10" />
      <p className="leading-relaxed text-foreground/70 line-clamp-4" style={{ fontSize: "clamp(0.78rem,1.5vw,0.875rem)" }}>
        {story.synopsis || <span className="italic text-muted-foreground/40">No synopsis available.</span>}
      </p>
      {(story.genres?.length > 0 || story.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {story.genres?.slice(0, 5).map((g: string) => (
            <span key={g} className="px-2 py-[4px] rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">{g}</span>
          ))}
          {story.tags?.slice(0, 5).map((tag: string) => (
            <span key={tag} className="px-2 py-[4px] rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-400/20">{tag}</span>
          ))}
        </div>
      )}
      {story.sources?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/50 uppercase">Where to Read</p>
          <div className="grid grid-cols-3 gap-1.5">
            {story.sources.slice(0, 3).map((src: any) => (
              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex flex-col px-2.5 py-2 rounded-lg border bg-secondary/40 border-border/50 hover:bg-secondary hover:border-primary/40 transition-all">
                <span className="text-[11px] font-semibold text-foreground truncate">{src.name}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                  {src.language ? `${src.language} · ` : ""}Ch {src.currentChapter}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const CTABar = () => (
    <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
      <button onClick={() => onNavigate(story.id)}
        className="group w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl font-bold text-sm
          bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
        View Series
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </button>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="p-0 gap-0 border-0 bg-transparent shadow-none max-w-5xl w-[calc(100vw-2rem)]" style={{ borderRadius: 0 }}>
          <div className="relative overflow-hidden flex flex-row"
            style={{ height: "75vh", maxHeight: "75vh", borderRadius: "20px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 32px 80px rgba(0,0,0,0.45)" }}>
            <CoverBlock className="flex-shrink-0 w-[clamp(200px,30%,300px)]" />
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <button onClick={onClose}
                className="absolute top-4 right-4 z-50 w-7 h-7 rounded-full flex items-center justify-center bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                <X size={13} />
              </button>
              <DetailContent />
              <CTABar />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "92vh", background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))", boxShadow: "0 -24px 60px rgba(0,0,0,0.4)" }}>
        <div className="flex justify-center pt-3 shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
          <X size={13} />
        </button>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="flex gap-3 items-stretch px-4 pt-4 pb-4">
            <div className="w-[88px] shrink-0 rounded-xl overflow-hidden bg-secondary shadow-lg" style={{ aspectRatio: "3/4" }}>
              {story.coverUrl
                ? <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><BookIcon className="w-8 h-8 text-muted-foreground/20" /></div>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{ backgroundColor: `${STATUS_COLORS[story.status]}15`, color: STATUS_COLORS[story.status], borderColor: `${STATUS_COLORS[story.status]}30` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[story.status] }} />{si.label}
                </span>
                {fmt && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">{fmt}</span>}
                {story.demographic && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">{story.demographic}</span>}
              </div>
              <h2 className="text-[15px] font-black text-foreground leading-snug line-clamp-2">{story.title}</h2>
              {story.altTitle && <p className="text-[11px] text-muted-foreground/60 italic line-clamp-1 mt-0.5">{story.altTitle}</p>}
              {story.author && <p className="text-[11px] text-muted-foreground/50 mt-0.5">{story.author}</p>}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-black text-amber-400">{story.rating || "—"}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <BookOpen size={11} />
                  <span className="text-xs font-semibold">
                    {story.currentChapter}
                    {latestCh > story.currentChapter && <span className="text-muted-foreground/40"> / {latestCh}</span>}
                    <span className="text-muted-foreground/40"> ch</span>
                  </span>
                </div>
                {story.originCountry && (
                  <span className={`fi fi-${story.originCountry.toLowerCase()} rounded-sm`} style={{ width: 16, height: 11 }} />
                )}
              </div>
            </div>
          </div>
          <div className="h-px bg-border/60 mx-4" />
          <div className="px-4 pt-4 pb-6 space-y-4">
            <p className="text-[13px] text-foreground/70 leading-relaxed">
              {story.synopsis || <span className="italic text-muted-foreground/40">No synopsis available.</span>}
            </p>
            {(story.genres?.length > 0 || story.tags?.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {story.genres?.map((g: string) => (
                  <span key={g} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">{g}</span>
                ))}
                {story.tags?.map((tag: string) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-400/20">{tag}</span>
                ))}
              </div>
            )}
            {story.sources?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">Where to Read</p>
                <div className="grid grid-cols-3 gap-2">
                  {story.sources.slice(0, 3).map((src: any) => (
                    <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="flex flex-col px-3 py-2.5 rounded-xl border bg-secondary/50 border-border/60 hover:border-primary/40 transition-all">
                      <span className="text-[12px] font-bold text-foreground truncate">{src.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        {src.language ? `${src.language} · ` : ""}Ch {src.currentChapter}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
          <button onClick={() => onNavigate(story.id)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm
              bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            View Series
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
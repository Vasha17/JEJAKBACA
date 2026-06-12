import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Bookmark, FileText, Plus,
  Star, List, Globe, HelpCircle, MoreHorizontal,
  RefreshCw, Zap, Bell, Upload, Eye, EyeOff,
  History, GitBranch, Trash2, X, Maximize2, Move,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogClose,
} from "@/component/ui/dialog";
import "flag-icons/css/flag-icons.min.css";
import {
  STATUS_OPTIONS, statusColor,
  DEMOGRAPHIC_INFO, DEMOGRAPHIC_ICONS,
} from "../constants/status";
import { haptic } from "../utils/helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  story: any;
  isMobile: boolean;
  fromListId?: string;
  fromVault?: boolean;
  prevStory: any | null;
  nextStory: any | null;
  currentIndex: number;
  allStoriesLength: number;
  isRefreshing: boolean;
  pullDelta: number;
  PULL_THRESHOLD: number;
  handleTouchStart: any;
  handleTouchMove: any;
  handleTouchEnd: any;
  ctaPreference: "floating" | "inside";
  trackedSourceIds: string[];
  trackedSourcesWithUpdates: any[];
  maxChaptersAhead: number;
  hasUpdates: boolean;
  prediction: any;
  editingTitle: boolean;
  editingAltTitle: boolean;
  editingAuthor: boolean;
  editingChapter: boolean;
  titleValue: string;
  altTitleValue: string;
  authorValue: string;
  chapterValue: string;
  chapterTooltip: boolean;
  genreExpanded: boolean;
  coverDialog: boolean;
  headerDialog: boolean;
  ratingDialog: boolean;
  statusDialog: boolean;
  moreDialog: boolean;
  updateBellDialog: boolean;
  headerLightbox: boolean;
  coverLightbox: boolean;
  coverUrlValue: string;
  headerUrlValue: string;
  headerDialogTouchStart: number;
  coverDialogTouchStart: number;
  coverFileRef: React.RefObject<HTMLInputElement>;
  headerFileRef: React.RefObject<HTMLInputElement>;
  // Setters
  setEditingTitle: (v: boolean) => void;
  setEditingAltTitle: (v: boolean) => void;
  setEditingAuthor: (v: boolean) => void;
  setEditingChapter: (v: boolean) => void;
  setTitleValue: (v: string) => void;
  setAltTitleValue: (v: string) => void;
  setAuthorValue: (v: string) => void;
  setChapterValue: (v: string) => void;
  setChapterTooltip: (v: boolean) => void;
  setGenreExpanded: (fn: (v: boolean) => boolean) => void;
  setCoverDialog: (v: boolean) => void;
  setHeaderDialog: (v: boolean) => void;
  setRatingDialog: (v: boolean) => void;
  setStatusDialog: (v: boolean) => void;
  setMoreDialog: (v: boolean) => void;
  setUpdateBellDialog: (v: boolean) => void;
  setHeaderLightbox: (v: boolean) => void;
  setCoverLightbox: (v: boolean) => void;
  setCoverUrlValue: (v: string) => void;
  setHeaderUrlValue: (v: string) => void;
  setHeaderDialogTouchStart: (v: number) => void;
  setCoverDialogTouchStart: (v: number) => void;
  setHeaderCropOpen: (v: boolean) => void;
  setCoverCropOpen: (v: boolean) => void;
  setCountryDialog: (v: boolean) => void;
  setBookmarkDialog: (v: boolean) => void;
  setNotesDialog: (v: boolean) => void;
  setGenrePickerOpen: (v: boolean) => void;
  setHistoryDialog: (v: boolean) => void;
  setRelatedDialog: (v: boolean) => void;
  setDeleteStoryDialog: (v: boolean) => void;
  // Handlers
  updateStory: (id: string, data: any) => void;
  deleteStory: (id: string) => void;
  handleChapterUpdate: (ch: number) => void;
  handleOpenHistory: () => void;
  handleOpenRelated: () => void;
  handleOpenListsDialog: () => void;
  handleRatingChange: (r: number) => void;
  handleStatusChange: (s: any) => void;
  handleCoverFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleHeaderFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  navigate: ReturnType<typeof useNavigate>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroSection({
  story, isMobile, fromListId,
  currentIndex, allStoriesLength,
  isRefreshing, pullDelta, PULL_THRESHOLD,

  trackedSourcesWithUpdates, maxChaptersAhead, hasUpdates,
  prediction,
  editingTitle, editingAltTitle, editingAuthor, editingChapter,
  titleValue, altTitleValue, authorValue, chapterValue,
  chapterTooltip, genreExpanded,
  coverDialog, headerDialog, moreDialog,
  updateBellDialog,
  coverUrlValue, headerUrlValue,
  
  coverFileRef, headerFileRef,
  setEditingTitle, setEditingAltTitle, setEditingAuthor, setEditingChapter,
  setTitleValue, setAltTitleValue, setAuthorValue, setChapterValue,
  setChapterTooltip, setGenreExpanded,
  setCoverDialog, setHeaderDialog, setRatingDialog, setStatusDialog, setMoreDialog,
  setUpdateBellDialog, setHeaderLightbox, setCoverLightbox,
  setCoverUrlValue, setHeaderUrlValue,
  
  setHeaderCropOpen, setCoverCropOpen, setCountryDialog,
  setBookmarkDialog, setNotesDialog, setGenrePickerOpen,
  setHistoryDialog, setRelatedDialog, setDeleteStoryDialog,
  updateStory,
  handleChapterUpdate, handleOpenHistory, handleOpenRelated,
  handleOpenListsDialog,
  handleCoverFileUpload, handleHeaderFileUpload,
  navigate,
}: HeroSectionProps) {
  const currentStatus = STATUS_OPTIONS.find(s => s.value === story.status);
  const dotColor      = statusColor(story.status);
  const originCountryCode = (story.originCountry || "").trim().toLowerCase();
  const showOriginFlag = originCountryCode.length === 2;

  const [showPredToast, setShowPredToast] = useState(false);

  const [showHeaderEditBtn, setShowHeaderEditBtn] = useState(false);
  const [showCoverEditBtn, setShowCoverEditBtn]   = useState(false);
  const [headerEditVisible, setHeaderEditVisible] = useState(false);
  const [coverEditVisible, setCoverEditVisible]   = useState(false);
  const headerLongPressTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverLongPressTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerHideTimer                           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverHideTimer                            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverJustLongPressed                      = useRef(false);

  const [hasSeenUpdateNotif, setHasSeenUpdateNotif] = useState(false);
  const shouldShowUpdateNotif = 
    prediction.confidence !== "insufficient" &&
    prediction.daysUntil !== null &&
    prediction.daysUntil <= 1 && 
    !hasSeenUpdateNotif;

  const [altTitleDialogOpen, setAltTitleDialogOpen] = useState(false);

  const handleHeaderEnter = () => {
    if (isMobile) return;
    if (headerHideTimer.current) clearTimeout(headerHideTimer.current);
    if (showHeaderEditBtn) return;
    if (headerLongPressTimer.current) clearTimeout(headerLongPressTimer.current);
    headerLongPressTimer.current = setTimeout(() => {
      setShowHeaderEditBtn(true);
      requestAnimationFrame(() => { setHeaderEditVisible(true); });
    }, 0);
  };

  const handleHeaderLeave = () => {
    if (isMobile) return;
    if (headerLongPressTimer.current) clearTimeout(headerLongPressTimer.current);
    if (headerHideTimer.current) clearTimeout(headerHideTimer.current);
    headerHideTimer.current = setTimeout(() => {
      setHeaderEditVisible(false);
      setTimeout(() => { setShowHeaderEditBtn(false); }, 200);
    }, 500);
  };

  const handleHeaderTouchStart = () => {
    if (!isMobile) return;
    if (headerLongPressTimer.current) clearTimeout(headerLongPressTimer.current);
    headerLongPressTimer.current = setTimeout(() => {
      setShowHeaderEditBtn(true);
      requestAnimationFrame(() => { setHeaderEditVisible(true); });
    }, 0);
  };

  const handleHeaderTouchEnd = () => {
    if (!isMobile) return;
    if (headerLongPressTimer.current) clearTimeout(headerLongPressTimer.current);
    if (headerHideTimer.current) clearTimeout(headerHideTimer.current);
    headerHideTimer.current = setTimeout(() => {
      setHeaderEditVisible(false);
      setTimeout(() => { setShowHeaderEditBtn(false); }, 200);
    }, 5000);
  };

  const handleCoverEnter = () => {
    if (isMobile) return;
    if (coverHideTimer.current) clearTimeout(coverHideTimer.current);
    if (showCoverEditBtn) return;
    if (coverLongPressTimer.current) clearTimeout(coverLongPressTimer.current);
    coverLongPressTimer.current = setTimeout(() => {
      setShowCoverEditBtn(true);
      requestAnimationFrame(() => { setCoverEditVisible(true); });
    }, 500);
  };

  const handleCoverLeave = () => {
    if (isMobile) return;
    if (coverLongPressTimer.current) clearTimeout(coverLongPressTimer.current);
    if (coverHideTimer.current) clearTimeout(coverHideTimer.current);
    coverHideTimer.current = setTimeout(() => {
      setCoverEditVisible(false);
      setTimeout(() => { setShowCoverEditBtn(false); }, 200);
    }, 500);
  };

  const handleCoverTouchStart = () => {
    if (!isMobile) return;
    if (coverLongPressTimer.current) clearTimeout(coverLongPressTimer.current);
    coverLongPressTimer.current = setTimeout(() => {
      setShowCoverEditBtn(true);
      requestAnimationFrame(() => { setCoverEditVisible(true); });
      coverJustLongPressed.current = true;
    }, 300);
  };

  const handleCoverTouchEnd = () => {
    if (!isMobile) return;
    if (coverLongPressTimer.current) clearTimeout(coverLongPressTimer.current);
    if (!showCoverEditBtn) return;
    if (coverHideTimer.current) clearTimeout(coverHideTimer.current);
    coverHideTimer.current = setTimeout(() => {
      setCoverEditVisible(false);
      setTimeout(() => { setShowCoverEditBtn(false); }, 200);
    }, 5000);
  };

  return (
    <div className="relative">
      <div
        className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center transition-all duration-200 pointer-events-none"
        style={{ height: pullDelta > 0 ? `${pullDelta}px` : 0, overflow: "hidden" }}
      >
        <div className={`flex items-center gap-2 text-xs text-muted-foreground bg-card/90 px-3 py-1.5 rounded-full border border-border shadow-sm ${isRefreshing ? "opacity-100" : pullDelta >= PULL_THRESHOLD ? "opacity-100" : "opacity-70"}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} style={!isRefreshing ? { transform: `rotate(${Math.round((pullDelta / PULL_THRESHOLD) * 180)}deg)` } : {}} />
          <span>{isRefreshing ? "Refreshing..." : pullDelta >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>

      {prediction.confidence !== "insufficient" && showPredToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card/95 border border-border shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 max-w-[90vw]">
          <Zap className={`w-4 h-4 shrink-0 ${prediction.daysUntil !== null && prediction.daysUntil <= 1 ? "text-emerald-400" : prediction.daysUntil !== null && prediction.daysUntil < 0 ? "text-orange-400" : "text-primary"}`} />
          <p className="text-xs font-medium text-foreground">{prediction.message}</p>
        </div>
      )}

      <div
        className="h-48 sm:h-64 relative overflow-hidden bg-secondary group cursor-zoom-in"
        onClick={() => { if (story.headerUrl) setHeaderLightbox(true); }}
        onMouseEnter={handleHeaderEnter}
        onMouseLeave={handleHeaderLeave}
        onTouchStart={handleHeaderTouchStart}
        onTouchEnd={handleHeaderTouchEnd}
      >
        {story.headerUrl ? (
          <img 
            src={`${story.headerUrl}?width=1920&quality=100`} 
            alt="" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
          />
        ) : story.coverUrl ? (
          <img src={story.coverUrl} alt="" className="w-full h-full object-cover opacity-30 blur-xl scale-110 transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
          <div className="pointer-events-auto">
            {fromListId ? (
              <Link to={`/lists/${fromListId}`} className="p-2 rounded-md bg-card/80 hover:bg-card border border-border transition-colors" title="Back to List">
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </Link>
            ) : (
              <button onClick={() => navigate("/")} className="p-2 rounded-md bg-card/80 hover:bg-card border border-border transition-colors" title="Back to Library">
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </button>
            )}
          </div>

          {showHeaderEditBtn && (
            <div className={`pointer-events-auto flex flex-col gap-2 items-end transition-all duration-200 ${headerEditVisible ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-2 scale-95"}`}>
              <Dialog open={headerDialog} onOpenChange={setHeaderDialog}>
                <DialogTrigger asChild>
                  <button onClick={(e) => { e.stopPropagation(); setHeaderUrlValue(story.headerUrl || ""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white border border-white/20 backdrop-blur-sm hover:bg-black/80 transition-colors">
                    <Upload size={14} />
                    <span className="text-xs">Edit Header</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden mx-auto" onClick={(e) => e.stopPropagation()}>
                  <DialogHeader className="px-4 py-3 border-b border-border bg-muted/20">
                    <DialogTitle className="text-base font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> Edit Header Image</DialogTitle>
                  </DialogHeader>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground">Paste URL or upload from device</p>
                    <Input value={headerUrlValue} onChange={e => setHeaderUrlValue(e.target.value)} placeholder="https://..." />
                    <Button variant="outline" className="w-full" onClick={() => headerFileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-2" /> Upload from Device</Button>
                    <input ref={headerFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderFileUpload} />
                  </div>
                  <div className="px-4 pb-4 flex gap-2 justify-end border-t border-border pt-3">
                    <DialogClose asChild><Button variant="ghost" onClick={(e) => e.stopPropagation()}>Cancel</Button></DialogClose>
                    <Button onClick={(e) => { e.stopPropagation(); updateStory(story.id, { headerUrl: headerUrlValue }); setHeaderDialog(false); }}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
              {story.headerUrl && (
                <button onClick={(e) => { e.stopPropagation(); setHeaderCropOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white border border-white/20 backdrop-blur-sm hover:bg-black/80 transition-colors">
                  <Move size={14} />
                  <span className="text-xs">Reposition</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative px-3 sm:px-6 -mt-24 sm:-mt-40 flex flex-row gap-3 sm:gap-6 items-start">
        <div className="w-[105px] sm:w-52 shrink-0 z-20">
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-card border-2 border-border shadow-xl relative group">
            {story.coverUrl ? (
              <img 
                src={story.coverUrl} 
                alt={story.title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <BookOpen className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}
            <div
              className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 cursor-zoom-in"
              onClick={() => {
                if (isMobile && showCoverEditBtn) return;
                if (coverJustLongPressed.current) { coverJustLongPressed.current = false; return; }
                if (story.coverUrl) setCoverLightbox(true);
              }}
              onMouseEnter={handleCoverEnter}
              onMouseLeave={handleCoverLeave}
              onTouchStart={handleCoverTouchStart}
              onTouchEnd={handleCoverTouchEnd}
            >
              {!showCoverEditBtn && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <Maximize2 className="w-8 h-8 text-white/80" />
                </div>
              )}
              {showCoverEditBtn && (
                <div className={`absolute bottom-3 right-3 flex flex-col gap-2 items-end pointer-events-auto transition-all duration-200 sm:[&>button]:px-3 sm:[&>button]:py-1.5 sm:[&>button]:gap-1.5 ${coverEditVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}`}>
                  <Dialog open={coverDialog} onOpenChange={setCoverDialog}>
                    <DialogTrigger asChild>
                      <button onClick={(e) => { e.stopPropagation(); setCoverUrlValue(story.coverUrl || ""); }} className="flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-black/60 text-white border border-white/20 backdrop-blur-sm shadow-lg hover:bg-black/80 transition-colors">
                        <Upload size={11} className="sm:w-3.5 sm:h-3.5" />
                        <span className="text-[10px] sm:text-xs">Edit</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden mx-auto" onClick={(e) => e.stopPropagation()}>
                      <DialogHeader className="px-4 py-3 border-b border-border bg-muted/20">
                        <DialogTitle className="text-base font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> Edit Cover Image</DialogTitle>
                      </DialogHeader>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground">Paste URL or upload from device</p>
                        <Input value={coverUrlValue} onChange={e => setCoverUrlValue(e.target.value)} placeholder="https://..." />
                        <Button variant="outline" className="w-full" onClick={() => coverFileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-2" /> Upload from Device</Button>
                        <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                      </div>
                      <div className="px-4 pb-4 flex gap-2 justify-end border-t border-border pt-3">
                        <DialogClose asChild><Button variant="ghost" onClick={(e) => e.stopPropagation()}>Cancel</Button></DialogClose>
                        <Button onClick={(e) => {
                          e.stopPropagation();
                          const updates: any = { coverUrl: coverUrlValue };
                          if (!story.headerUrl) updates.headerUrl = coverUrlValue;
                          updateStory(story.id, updates);
                          setCoverDialog(false);
                        }}>Save</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {story.coverUrl && (
                    <button onClick={(e) => { e.stopPropagation(); setCoverCropOpen(true); }} className="flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-black/60 text-white border border-white/20 backdrop-blur-sm shadow-lg hover:bg-black/80 transition-colors">
                      <Move size={11} className="sm:w-3.5 sm:h-3.5" />
                      <span className="text-[10px] sm:text-xs">Reposition</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 z-10 pb-2 sm:pt-8 space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {shouldShowUpdateNotif && (
                <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-left-2">
                  <div className="h-5 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                    <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500/20 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {prediction.daysUntil === 0 ? "Update Today!" : "Update Tomorrow!"}
                    </span>
                  </div>
                  <button onClick={() => setHasSeenUpdateNotif(true)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    <X size={12} />
                  </button>
                </div>
              )}

              {editingTitle ? (
                <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { title: titleValue }); setEditingTitle(false); }} className="flex gap-2">
                  <Input value={titleValue} onChange={e => setTitleValue(e.target.value)} className="text-xl font-bold bg-card h-auto py-1" autoFocus />
                  <Button size="sm" type="submit">Save</Button>
                </form>
              ) : (
                <h1 className="text-xl sm:text-4xl font-bold text-foreground cursor-pointer hover:text-primary/80 transition-colors line-clamp-2 leading-tight" onClick={() => { setEditingAltTitle(false); setEditingAuthor(false); setTitleValue(story.title); setEditingTitle(true); }}>
                  {story.title}
                </h1>
              )}

              {/* --- ALTERNATIVE TITLES SECTION --- */}
              {(() => {
                const titles = story.altTitle ? String(story.altTitle).split(/[,\n]/).map((t: string) => t.trim()).filter(Boolean) : [];
                const SHOW = 2;

                return (
                  <>
                    {titles.length > 0 ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 cursor-pointer" onClick={() => setAltTitleDialogOpen(true)}>
                        {titles.slice(0, SHOW).map((t: string, i: number) => (
                          <span key={i} className="text-xs text-foreground/60">• {t}</span>
                        ))}
                        {titles.length > SHOW && (
                          <span className="text-xs text-primary/70 hover:text-primary transition-colors">+{titles.length - SHOW} more titles</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/30 italic hover:text-muted-foreground/60 cursor-pointer mt-1" onClick={() => setAltTitleDialogOpen(true)}>
                        No alternative title
                      </p>
                    )}

                    <Dialog open={altTitleDialogOpen} onOpenChange={setAltTitleDialogOpen}>
                      <DialogContent className="[&>button]:hidden w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden mx-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                          <h2 className="text-base font-bold text-foreground">Alternative Titles</h2>
                          {!editingAltTitle && (
                            <button
                              onClick={() => { setAltTitleValue(story.altTitle || ""); setEditingAltTitle(true); }}
                              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                        </div>

                        {editingAltTitle ? (
                          <div className="px-5 py-4 space-y-3">
                            <p className="text-xs text-muted-foreground">Separate with commas or line breaks</p>
                            <textarea
                              value={altTitleValue}
                              onChange={e => setAltTitleValue(e.target.value)}
                              placeholder="Title 1, Title 2&#10;Title 3"
                              className="text-sm bg-secondary border border-border rounded-xl px-4 py-3 w-full resize-none h-[120px] outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button variant="ghost" className="flex-1" onClick={() => setEditingAltTitle(false)}>Cancel</Button>
                              <Button className="flex-1" onClick={() => { updateStory(story.id, { altTitle: altTitleValue }); setEditingAltTitle(false); }}>Save</Button>
                            </div>
                          </div>
                        ) : titles.length > 0 ? (
                          <div className="px-4 py-4 max-h-[55vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {titles.map((t: string, i: number) => (
                                <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary transition-colors">
                                  <span className="text-[10px] font-black text-primary/50 shrink-0 mt-0.5 tabular-nums">
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                  <p className="text-sm text-foreground/85 leading-snug break-words min-w-0">{t}</p>
                                </div>
                              
                              ))}
                            </div>
                            
                            <div className="px-4 py-3 border-t border-border bg-background">
                              <div className="flex justify-end">
                                <Button
                                  variant="default"
                                  onClick={() => setAltTitleDialogOpen(false)}
                                >
                                  Close
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-5 py-8 text-center space-y-3">
                            <p className="text-sm text-muted-foreground italic">No alternative titles yet.</p>
                            <button
                              onClick={() => { setAltTitleValue(""); setEditingAltTitle(true); }}
                              className="text-xs text-primary hover:underline"
                            >
                              + Add titles
                            </button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </>
                );
              })()}

              {editingAuthor ? (
                <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { author: authorValue }); setEditingAuthor(false); }} className="flex gap-2 mt-1">
                  <Input value={authorValue} onChange={e => setAuthorValue(e.target.value)} className="text-xs bg-card h-7" autoFocus />
                  <Button size="sm" className="h-7" type="submit">Save</Button>
                </form>
              ) : (
                <p className={`text-sm mt-1 cursor-pointer transition-colors ${story.author ? "text-foreground/80 hover:text-primary" : "text-muted-foreground/40 hover:text-muted-foreground italic"}`} onClick={() => { setEditingTitle(false); setEditingAltTitle(false); setAuthorValue(story.author || ""); setEditingAuthor(true); }}>
                  {story.author || "Unknown Author"}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 max-w-[72px]">
              <button onClick={() => setRatingDialog(true)} className="shrink-0 flex flex-col items-end group transition-transform hover:scale-105">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Star size={20} className={`transition-all duration-200 ${story.rating > 0 ? "fill-current hover:scale-110" : "fill-transparent stroke-current"}`} />
                  <span className="text-2xl font-bold leading-none">{story.rating || "-"}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Rating</span>
              </button>
              <button onClick={() => setCountryDialog(true)} className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:scale-110 active:scale-95 transition-all duration-200" title="Set Origin Country">
                {showOriginFlag ? <span className={`fi fi-${originCountryCode}`} style={{ width: "28px", height: "20px", display: "inline-block", borderRadius: "3px" }} /> : <Globe className="w-6 h-6 text-muted-foreground" style={{ opacity: 0.95 }} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border/50 mt-2 flex-wrap sm:flex-nowrap">
            {currentStatus && !editingChapter && (
              <button onClick={() => setStatusDialog(true)} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${currentStatus.color}20`, color: currentStatus.color, borderColor: `${currentStatus.color}40` }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                {currentStatus.label}
              </button>
            )}
            <div className="flex items-center gap-2 flex-1 group/chapter relative">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              {editingChapter ? (
                <form onSubmit={e => { e.preventDefault(); const ch = Math.max(0.1, parseFloat(chapterValue) || 1); handleChapterUpdate(ch); setEditingChapter(false); }} className="flex gap-2 items-center w-full">
                  <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">Ch.</span>
                  <Input value={chapterValue} onChange={e => setChapterValue(e.target.value)} type="number" step="0.1" className="w-16 h-7 text-xs bg-card" autoFocus />
                  <Button size="sm" type="submit" className="h-7">Save</Button>
                </form>
              ) : (
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="font-semibold text-xs sm:text-sm text-foreground">Chapter {story.currentChapter}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    {hasUpdates && (
                      <Dialog open={updateBellDialog} onOpenChange={setUpdateBellDialog}>
                        <DialogTrigger asChild>
                          <button className="relative p-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-transform animate-pulse hover:scale-110">
                            <Bell size={16} />
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="w-[92vw] sm:max-w-md border-emerald-500/50 bg-gradient-to-br from-emerald-900 to-slate-900 text-white shadow-2xl shadow-emerald-500/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <DialogHeader className="relative z-10 pb-2">
                            <div className="absolute -top-10 -right-10 text-emerald-500/10 opacity-50 pointer-events-none"><Bell size={120} strokeWidth={1} /></div>
                            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                              </span>
                              Updates Available!
                            </DialogTitle>
                            <p className="text-sm text-emerald-100/80 mt-1">{trackedSourcesWithUpdates.length} source(s) ahead. Behind by <span className="text-emerald-300 font-bold">+{maxChaptersAhead} chapters</span>.</p>
                          </DialogHeader>
                          <div className="space-y-3 relative z-10">
                            <div className="space-y-2 pt-2">
                              {trackedSourcesWithUpdates.map((src: any) => {
                                const diff = (src.currentChapter || 0) - (story.currentChapter || 0);
                                return (
                                  <div key={src.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 hover:bg-emerald-950/60 transition-colors group">
                                    <span className="text-xs font-semibold text-emerald-50">{src.name}</span>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">+{diff}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <button onClick={() => { setChapterValue(String(story.currentChapter)); setEditingChapter(true); }} className="px-2 py-1 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted border border-border">Edit</button>
                    <button onClick={() => { haptic("medium"); handleChapterUpdate(story.currentChapter + 1); setShowPredToast(true); if (shouldShowUpdateNotif) setHasSeenUpdateNotif(true); setTimeout(() => setShowPredToast(false), 5000); }} className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/80 active:scale-90 active:bg-primary/70 font-medium transition-all duration-150">
                      +1
                    </button>
                  </div>
                </div>
              )}
              <div className="absolute bottom-full left-0 mb-2 w-max max-w-[200px] p-2 rounded-lg bg-black/90 border border-border shadow-xl text-[10px] text-muted-foreground opacity-0 group-hover/chapter:opacity-100 transition-opacity pointer-events-none z-50" onTouchStart={() => { if (!editingChapter) setTimeout(() => setChapterTooltip(true), 500); }} onTouchEnd={() => setChapterTooltip(false)}>
                <p className="font-bold text-foreground mb-0.5">Current Progress</p>
                <p>Chapter {story.currentChapter}</p>
                <p className="mt-0.5 text-primary">Updated: {format(new Date(story.chapterUpdatedAt), "MMM d, yyyy")}</p>
              </div>
              {chapterTooltip && !editingChapter && (
                <div className="absolute bottom-full left-0 mb-2 w-max max-w-[200px] p-2 rounded-lg bg-popover border border-border shadow-xl text-[10px] text-muted-foreground z-50 animate-in fade-in slide-in-from-bottom-1">
                  <p className="font-bold text-foreground mb-0.5">Current Progress</p>
                  <p>Chapter {story.currentChapter}</p>
                  <p className="mt-0.5 text-primary">Updated: {format(new Date(story.chapterUpdatedAt), "MMM d, yyyy")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-5 gap-3 pt-3 mb-3">
            {[
              { icon: <Star size={20} className={`mb-2 ${story.rating > 0 ? "fill-amber-500 text-amber-500" : "text-amber-500"}`} />, label: "Rating", sub: `${story.rating || "—"}/10`, action: () => setRatingDialog(true) },
              { icon: <div className="w-5 h-5 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: dotColor }}><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>, label: "Status", sub: currentStatus?.label || "Set", action: () => setStatusDialog(true) },
              { icon: <Bookmark size={20} className={`mb-2 ${story.bookmarks.length > 0 ? "fill-primary text-primary" : "text-primary"}`} />, label: "Bookmark", sub: `${story.bookmarks.length} saved`, action: () => setBookmarkDialog(true) },
              { icon: <FileText size={20} className="text-blue-500 mb-2" />, label: "Notes", sub: `${story.notes?.length || 0} notes`, action: () => setNotesDialog(true) },
              { icon: <List size={20} className="text-purple-500 mb-2" />, label: "Lists", sub: `${story.lists.length} lists`, action: handleOpenListsDialog },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action} className="flex flex-col items-center p-2.5 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                {btn.icon}
                <span className="text-[11px] font-semibold text-foreground">{btn.label}</span>
                <span className="text-[9px] text-muted-foreground">{btn.sub}</span>
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-3 mt-4 pt-3">
            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider mr-1 shrink-0">Genre</span>
              {story.genres && story.genres.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 transition-all duration-300">
                  {(genreExpanded ? story.genres : story.genres.slice(0, 5)).map((g: string) => (
                    <span key={g} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-secondary/60 text-muted-foreground border border-border/30 whitespace-nowrap animate-in fade-in slide-in-from-top-2">{g}</span>
                  ))}
                  {story.genres.length > 5 && (
                    <button onClick={() => setGenreExpanded(v => !v)} className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5">
                      {genreExpanded ? "Show less" : `+${story.genres.length - 5} more`}
                    </button>
                  )}
                  <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-primary flex items-center gap-0.5 ml-1"><Plus size={10} /> Edit</button>
                </div>
              ) : (
                <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-muted-foreground italic flex items-center gap-0.5"><Plus size={10} /> Add Genres</button>
              )}
            </div>
            <div className="relative group/demog">
              <button onClick={() => { const list = ["Josei", "Seinen", "Shoujo", "Shounen", "Unknown"]; const nextIndex = (list.indexOf(story.demographic || "") + 1) % list.length; updateStory(story.id, { demographic: list[nextIndex] }); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border shadow-sm ${story.demographic ? `${DEMOGRAPHIC_INFO[story.demographic]} border-current/50` : "bg-secondary hover:bg-secondary/80 border-border text-muted-foreground"}`}>
                <span>{DEMOGRAPHIC_ICONS[story.demographic || "Unknown"] || <HelpCircle className="w-3.5 h-3.5" />}</span>
                <span className="whitespace-nowrap">{story.demographic || "Unknown"}</span>
              </button>
            </div>
             <Dialog open={moreDialog} onOpenChange={setMoreDialog}>
            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                setMoreDialog(true);
              }} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors border border-border active:scale-95"
            >
              <MoreHorizontal size={13} />
              <span>More Options</span>
            </button>

            <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <DialogHeader className="px-4 py-3 border-b border-border bg-muted/20">
                <DialogTitle className="text-base font-semibold">More Options</DialogTitle>
              </DialogHeader>
              <div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setMoreDialog(false); 
                    handleOpenHistory(); 
                    setHistoryDialog(true); 
                  }} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors w-full active:scale-[0.98]"
                >
                  <div className="p-1.5 rounded-lg bg-secondary/50"><History className="w-4 h-4" /></div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium">Version History</p><p className="text-[10px] text-muted-foreground">View change history</p></div>
                </button>
                
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setMoreDialog(false); 
                    handleOpenRelated(); 
                    setRelatedDialog(true); 
                  }} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors w-full active:scale-[0.98]"
                >
                  <div className="p-1.5 rounded-lg bg-secondary/50"><GitBranch className="w-4 h-4" /></div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium">Related Stories</p><p className="text-[10px] text-muted-foreground">Prequel, sequel, spin-off</p></div>
                </button>
                
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setMoreDialog(false); 
                    updateStory(story.id, { hidden: !story.hidden, lists: story.hidden ? [] : ["Uncategorized"] }); 
                  }} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors w-full active:scale-[0.98]"
                >
                  <div className="p-1.5 rounded-lg bg-secondary/50">{story.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium">{story.hidden ? "Show in Library" : "Hide from Library"}</p><p className="text-[10px] text-muted-foreground">{story.hidden ? "Restore to library" : "Move to Hidden Vault"}</p></div>
                </button>
                
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setMoreDialog(false); 
                    setDeleteStoryDialog(true); 
                  }} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors w-full active:scale-[0.98]"
                >
                  <div className="p-1.5 rounded-lg bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium text-destructive">Delete Story</p><p className="text-[10px] text-muted-foreground">Permanently remove</p></div>
                </button>
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/10">
                <span className="text-[10px] text-muted-foreground">Story #{currentIndex + 1} of {allStoriesLength}</span>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

      <div className="sm:hidden px-3 mt-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => setStatusDialog(true)} className="flex flex-col items-center justify-center py-3 rounded-2xl bg-card border border-border hover:bg-muted transition-all">
            {currentStatus ? (
              <div className="w-5 h-5 rounded-full mb-1 flex items-center justify-center" style={{ backgroundColor: currentStatus.color }}><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>
            ) : (
              <HelpCircle size={18} className="mb-1 text-muted-foreground" />
            )}
            <span className="text-[11px] font-medium">Status</span>
            <span className="text-[9px] text-muted-foreground">{currentStatus?.label || "Set"}</span>
          </button>
          <button onClick={() => setBookmarkDialog(true)} className="flex flex-col items-center justify-center py-3 rounded-2xl bg-card border border-border hover:bg-muted transition-all">
            <Bookmark size={18} className={`mb-1 ${story.bookmarks.length > 0 ? "fill-primary text-primary" : "text-primary"}`} />
            <span className="text-[11px] font-medium">Mark</span>
            <span className="text-[9px] text-muted-foreground">{story.bookmarks.length} saved</span>
          </button>
          <button onClick={() => setNotesDialog(true)} className="flex flex-col items-center justify-center py-3 rounded-2xl bg-card border border-border hover:bg-muted transition-all">
            <FileText size={18} className="text-blue-500 mb-1" />
            <span className="text-[11px] font-medium">Notes</span>
            <span className="text-[9px] text-muted-foreground">{story.notes?.length || 0} notes</span>
          </button>
          <button onClick={handleOpenListsDialog} className="flex flex-col items-center justify-center py-3 rounded-2xl bg-card border border-border hover:bg-muted transition-all">
            <List size={18} className="text-purple-500 mb-1" />
            <span className="text-[11px] font-medium">Lists</span>
            <span className="text-[9px] text-muted-foreground">{story.lists.length} lists</span>
          </button>
        </div>
        <div className="flex items-center gap-2 mt-5 justify-end pr-3">
          <button onClick={() => { const list = ["Josei", "Seinen", "Shoujo", "Shounen", "Unknown"]; const nextIndex = (list.indexOf(story.demographic || "") + 1) % list.length; updateStory(story.id, { demographic: list[nextIndex] }); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border shadow-sm ${story.demographic ? `${DEMOGRAPHIC_INFO[story.demographic]} border-current/50` : "bg-secondary hover:bg-secondary/80 border-border text-muted-foreground"}`}>
            <span>{DEMOGRAPHIC_ICONS[story.demographic || "Unknown"] || <HelpCircle className="w-3 h-3" />}</span>
            <span className="text-[11px]">{story.demographic || "Unknown"}</span>
          </button>
          <Dialog open={moreDialog && isMobile} onOpenChange={setMoreDialog}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors border border-border">
                <MoreHorizontal size={13} />
                <span>More Options</span>
              </button>
            </DialogTrigger>
            <DialogContent className="w-[92vw] max-w-2xl p-0 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <DialogHeader className="px-4 py-3 border-b border-border bg-muted/20">
                <DialogTitle className="text-base font-semibold">More Options</DialogTitle>
              </DialogHeader>
              <div>
                <button onClick={() => { setMoreDialog(false); handleOpenHistory(); setHistoryDialog(true); }} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors w-full">
                  <div className="p-1.5 rounded-lg bg-secondary/50"><History className="w-4 h-4" /></div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium">Version History</p><p className="text-[10px] text-muted-foreground">View change history</p></div>
                </button>
                <button onClick={() => { setMoreDialog(false); handleOpenRelated(); setRelatedDialog(true); }} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors w-full">
                  <div className="p-1.5 rounded-lg bg-secondary/50"><GitBranch className="w-4 h-4" /></div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium">Related Stories</p><p className="text-[10px] text-muted-foreground">Prequel, sequel, spin-off</p></div>
                </button>
                <button onClick={() => { setMoreDialog(false); updateStory(story.id, { hidden: !story.hidden, lists: story.hidden ? [] : ["Uncategorized"] }); }} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors w-full">
                  <div className="p-1.5 rounded-lg bg-secondary/50">{story.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium">{story.hidden ? "Show in Library" : "Hide from Library"}</p><p className="text-[10px] text-muted-foreground">{story.hidden ? "Restore to library" : "Move to Hidden Vault"}</p></div>
                </button>
                <button onClick={() => { setMoreDialog(false); setDeleteStoryDialog(true); }} className="flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors w-full">
                  <div className="p-1.5 rounded-lg bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></div>
                  <div className="flex-1 text-left"><p className="text-sm font-medium text-destructive">Delete Story</p><p className="text-[10px] text-muted-foreground">Permanently remove</p></div>
                </button>
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/10">
                <span className="text-[10px] text-muted-foreground">Story #{currentIndex + 1} of {allStoriesLength}</span>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
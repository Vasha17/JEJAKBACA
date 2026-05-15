import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Bookmark, FileText, Plus,
  Star, List, Globe, HelpCircle, MoreHorizontal,
  RefreshCw, Zap, Bell, Upload, Eye, EyeOff,
  History, GitBranch, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogClose,
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
  headerDialogTouchStart, coverDialogTouchStart,
  coverFileRef, headerFileRef,
  setEditingTitle, setEditingAltTitle, setEditingAuthor, setEditingChapter,
  setTitleValue, setAltTitleValue, setAuthorValue, setChapterValue,
  setChapterTooltip, setGenreExpanded,
  setCoverDialog, setHeaderDialog, setRatingDialog, setStatusDialog, setMoreDialog,
  setUpdateBellDialog, setHeaderLightbox, setCoverLightbox,
  setCoverUrlValue, setHeaderUrlValue,
  setHeaderDialogTouchStart, setCoverDialogTouchStart,
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
  const dotColor = statusColor(story.status);

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center transition-all duration-200 pointer-events-none"
        style={{ height: pullDelta > 0 ? `${pullDelta}px` : 0, overflow: "hidden" }}
      >
        <div className={`flex items-center gap-2 text-xs text-muted-foreground bg-card/90 px-3 py-1.5 rounded-full border border-border shadow-sm ${isRefreshing ? "opacity-100" : pullDelta >= PULL_THRESHOLD ? "opacity-100" : "opacity-70"}`}>
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
            style={!isRefreshing ? { transform: `rotate(${Math.round((pullDelta / PULL_THRESHOLD) * 180)}deg)` } : {}}
          />
          <span>{isRefreshing ? "Refreshing..." : pullDelta >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>

      {/* Header image */}
      <div
        className="h-48 sm:h-64 relative overflow-hidden bg-secondary group cursor-zoom-in"
        onClick={() => story.headerUrl && setHeaderLightbox(true)}
      >
        {story.headerUrl ? (
          <img src={`${story.headerUrl}?width=1920&quality=100`} alt="" className="w-full h-full object-cover" />
        ) : story.coverUrl ? (
          <img src={story.coverUrl} alt="" className="w-full h-full object-cover opacity-30 blur-xl scale-110" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {fromListId ? (
            <Link to={`/lists/${fromListId}`} className="p-2 rounded-md bg-card/80 hover:bg-card border border-border transition-colors" title="Back to List">
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Link>
          ) : (
            <button onClick={() => navigate("/")} className="p-2 rounded-md bg-card/80 hover:bg-card border border-border transition-colors" title="Back to Library">
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
          )}

          <div className="flex gap-2">
            {/* Header edit — desktop */}
            {!isMobile ? (
              <Dialog open={headerDialog} onOpenChange={setHeaderDialog}>
                <DialogTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHeaderUrlValue(story.headerUrl || ""); }}
                    className="px-3 py-1 text-xs rounded bg-card/80 text-foreground hover:bg-card border border-border"
                  >Edit Header</button>
                </DialogTrigger>
                <DialogContent className="w-[92vw] max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
                  <DialogHeader><DialogTitle>Edit Header Image</DialogTitle></DialogHeader>
                  <Input value={headerUrlValue} onChange={e => setHeaderUrlValue(e.target.value)} placeholder="Paste image URL..." />
                  <Button variant="outline" onClick={() => headerFileRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1" />Upload
                  </Button>
                  <input ref={headerFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderFileUpload} />
                  <DialogFooter>
                    <DialogClose asChild><Button variant="ghost" onClick={(e) => e.stopPropagation()}>Cancel</Button></DialogClose>
                    <Button onClick={(e) => { e.stopPropagation(); updateStory(story.id, { headerUrl: headerUrlValue }); setHeaderDialog(false); }}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <>
                {headerDialog && (
                  <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHeaderDialog(false)} />
                    <div
                      className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                      onClick={(e) => e.stopPropagation()}
                      style={{ maxHeight: "92vh", background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))", boxShadow: "0 -24px 60px rgba(0,0,0,0.4)" }}
                    >
                      <div
                        className="flex justify-center pt-3 shrink-0 cursor-grab active:cursor-grabbing"
                        onTouchStart={(e) => setHeaderDialogTouchStart(e.touches[0].clientY)}
                        onTouchEnd={(e) => { if (e.changedTouches[0].clientY - headerDialogTouchStart > 80) setHeaderDialog(false); }}
                      >
                        <div className="w-10 h-1 rounded-full bg-border" />
                      </div>
                      <div className="px-4 py-3 border-b border-border/50">
                        <h2 className="text-lg font-semibold text-foreground">Edit Header Image</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <Input value={headerUrlValue} onChange={e => setHeaderUrlValue(e.target.value)} placeholder="Paste image URL..." />
                        <Button variant="outline" onClick={() => headerFileRef.current?.click()} className="w-full">
                          <Upload className="w-3.5 h-3.5 mr-1" />Upload
                        </Button>
                        <input ref={headerFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderFileUpload} />
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" className="flex-1" onClick={(e) => { e.stopPropagation(); setHeaderDialog(false); }}>Cancel</Button>
                          <Button className="flex-1" onClick={(e) => { e.stopPropagation(); updateStory(story.id, { headerUrl: headerUrlValue }); setHeaderDialog(false); }}>Save</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setHeaderUrlValue(story.headerUrl || ""); setHeaderDialog(true); }}
                  className="px-3 py-1 text-xs rounded bg-card/80 text-foreground hover:bg-card border border-border"
                >Edit Header</button>
              </>
            )}

            {story.headerUrl && (
              <button onClick={(e) => { e.stopPropagation(); setHeaderCropOpen(true); }} className="px-3 py-1 text-xs rounded bg-card/80 text-foreground hover:bg-card border border-border">
                Reposition
              </button>
            )}
          </div>

          {story.headerUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cover + meta */}
      <div className="relative px-3 sm:px-6 -mt-24 sm:-mt-40 flex flex-row gap-3 sm:gap-6 items-start">
        {/* Cover card */}
        <div className="w-[105px] sm:w-44 shrink-0 z-20">
          <div
            className="aspect-[3/4] rounded-xl overflow-hidden bg-card border-2 border-border shadow-xl cursor-zoom-in relative group"
            onClick={() => story.coverUrl && setCoverLightbox(true)}
          >
            {story.coverUrl ? (
              <>
                <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:group-active:opacity-100 active:opacity-100 transition-opacity bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <BookOpen className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Cover buttons */}
          <div className="flex gap-1 mt-2 justify-center">
            {!isMobile ? (
              <Dialog open={coverDialog} onOpenChange={setCoverDialog}>
                <DialogTrigger asChild>
                  <button onClick={() => setCoverUrlValue(story.coverUrl || "")} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted">Edit Cover</button>
                </DialogTrigger>
                <DialogContent className="w-[92vw] max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
                  <DialogHeader><DialogTitle>Edit Cover</DialogTitle></DialogHeader>
                  <Input value={coverUrlValue} onChange={e => setCoverUrlValue(e.target.value)} placeholder="Paste image URL..." />
                  <Button variant="outline" onClick={() => coverFileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" />Upload</Button>
                  <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                  <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={() => {
                      const updates: any = { coverUrl: coverUrlValue };
                      if (!story.headerUrl) updates.headerUrl = coverUrlValue;
                      updateStory(story.id, updates); setCoverDialog(false);
                    }}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <>
                {coverDialog && (
                  <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCoverDialog(false)} />
                    <div
                      className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                      onClick={(e) => e.stopPropagation()}
                      style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))", boxShadow: "0 -24px 60px rgba(0,0,0,0.4)" }}
                    >
                      <div
                        className="flex justify-center pt-3 shrink-0 cursor-grab active:cursor-grabbing"
                        onTouchStart={(e) => setCoverDialogTouchStart(e.touches[0].clientY)}
                        onTouchEnd={(e) => { if (e.changedTouches[0].clientY - coverDialogTouchStart > 80) setCoverDialog(false); }}
                      >
                        <div className="w-10 h-1 rounded-full bg-border" />
                      </div>
                      <div className="px-4 py-3 border-b border-border/50">
                        <h2 className="text-lg font-semibold text-foreground">Edit Cover</h2>
                      </div>
                      <div className="p-4 space-y-3">
                        <Input value={coverUrlValue} onChange={e => setCoverUrlValue(e.target.value)} placeholder="Paste image URL..." />
                        <Button variant="outline" onClick={() => coverFileRef.current?.click()} className="w-full"><Upload className="w-3.5 h-3.5 mr-1" />Upload</Button>
                        <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" className="flex-1" onClick={() => setCoverDialog(false)}>Cancel</Button>
                          <Button className="flex-1" onClick={() => { updateStory(story.id, { coverUrl: coverUrlValue }); setCoverDialog(false); }}>Save</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setCoverUrlValue(story.coverUrl || ""); setCoverDialog(true); }}
                  className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted"
                >Edit Cover</button>
              </>
            )}
            {story.coverUrl && (
              <button onClick={() => setCoverCropOpen(true)} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-secondary-foreground hover:bg-muted">Reposition</button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex-1 z-10 pb-2 sm:pt-8 space-y-2">
          {/* Title / AltTitle / Author */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { title: titleValue }); setEditingTitle(false); }} className="flex gap-2">
                  <Input value={titleValue} onChange={e => setTitleValue(e.target.value)} className="text-xl font-bold bg-card h-auto py-1" autoFocus />
                  <Button size="sm" type="submit">Save</Button>
                </form>
              ) : (
                <h1
                  className="text-xl sm:text-4xl font-bold text-foreground cursor-pointer hover:text-primary/80 transition-colors line-clamp-2 leading-tight"
                  onClick={() => {
                    updateStory(story.id, { altTitle: altTitleValue }); setEditingAltTitle(false);
                    updateStory(story.id, { author: authorValue }); setEditingAuthor(false);
                    setTitleValue(story.title); setEditingTitle(true);
                  }}
                >{story.title}</h1>
              )}

              {editingAltTitle ? (
                <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { altTitle: altTitleValue }); setEditingAltTitle(false); }} className="flex gap-2 mt-1">
                  <Input value={altTitleValue} onChange={e => setAltTitleValue(e.target.value)} className="text-xs bg-card h-7" autoFocus />
                  <Button size="sm" className="h-7" type="submit">Save</Button>
                </form>
              ) : (
                <p
                  className={`text-xs sm:text-sm mt-1 cursor-pointer transition-colors ${story.altTitle ? "text-muted-foreground opacity-70 hover:opacity-100 hover:text-foreground" : "text-muted-foreground/30 hover:text-muted-foreground/60 italic"}`}
                  onClick={() => {
                    updateStory(story.id, { title: titleValue }); setEditingTitle(false);
                    updateStory(story.id, { author: authorValue }); setEditingAuthor(false);
                    setAltTitleValue(story.altTitle || ""); setEditingAltTitle(true);
                  }}
                >{story.altTitle || " no alternative title "}</p>
              )}

              {editingAuthor ? (
                <form onSubmit={e => { e.preventDefault(); updateStory(story.id, { author: authorValue }); setEditingAuthor(false); }} className="flex gap-2 mt-1">
                  <Input value={authorValue} onChange={e => setAuthorValue(e.target.value)} className="text-xs bg-card h-7" autoFocus />
                  <Button size="sm" className="h-7" type="submit">Save</Button>
                </form>
              ) : (
                <p
                  className={`text-sm mt-1 cursor-pointer transition-colors ${story.author ? "text-foreground/80 hover:text-primary" : "text-muted-foreground/40 hover:text-muted-foreground italic"}`}
                  onClick={() => {
                    updateStory(story.id, { title: titleValue }); setEditingTitle(false);
                    updateStory(story.id, { altTitle: altTitleValue }); setEditingAltTitle(false);
                    setAuthorValue(story.author || ""); setEditingAuthor(true);
                  }}
                >{story.author || "Unknown Author"}</p>
              )}
            </div>

            {/* Rating + Country */}
            <div className="flex flex-col items-end gap-1 shrink-0 max-w-[72px]">
              <button onClick={() => setRatingDialog(true)} className="shrink-0 flex flex-col items-end group transition-transform hover:scale-105">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Star size={20} className={story.rating > 0 ? "fill-current" : "fill-transparent stroke-current"} />
                  <span className="text-2xl font-bold leading-none">{story.rating || "-"}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Rating</span>
              </button>
              <button onClick={() => setCountryDialog(true)} className="text-2xl hover:scale-110 active:scale-95 transition-all duration-200 opacity-80 hover:opacity-100" title="Set Origin Country">
                {story.originCountry
                  ? <span className={`fi fi-${story.originCountry.toLowerCase()}`} style={{ width: "28px", height: "20px", display: "inline-block", borderRadius: "3px" }} />
                  : <Globe className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          {/* Status + Chapter */}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border/50 mt-2">
            {currentStatus && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border"
                style={{ backgroundColor: `${currentStatus.color}20`, color: currentStatus.color, borderColor: `${currentStatus.color}40` }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentStatus.color }} />
                {currentStatus.label}
              </span>
            )}

            <div className="flex items-center gap-2 flex-1 group/chapter relative">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              {editingChapter ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const ch = Math.max(0.1, parseFloat(chapterValue) || 1);
                    handleChapterUpdate(ch); setEditingChapter(false);
                  }}
                  className="flex gap-2 items-center w-full"
                >
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
                          <button className="relative p-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors">
                            <Bell size={16} className="animate-pulse" />
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="w-[92vw] sm:max-w-md border-emerald-500/50 bg-gradient-to-br from-emerald-900 to-slate-900 text-white shadow-2xl shadow-emerald-500/20 overflow-hidden">
                          <DialogHeader className="relative z-10 pb-2">
                            <div className="absolute -top-10 -right-10 text-emerald-500/10 opacity-50 pointer-events-none">
                              <Bell size={120} strokeWidth={1} />
                            </div>
                            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                              </span>
                              Updates Available!
                            </DialogTitle>
                            <p className="text-sm text-emerald-100/80 mt-1">
                              {trackedSourcesWithUpdates.length} source(s) ahead. Behind by{" "}
                              <span className="text-emerald-300 font-bold">+{maxChaptersAhead} chapters</span>.
                            </p>
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
                    <button onClick={() => { haptic("medium"); handleChapterUpdate(story.currentChapter + 1); }} className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/80 active:scale-90 active:bg-primary/70 font-medium transition-all duration-150">+1</button>
                  </div>
                </div>
              )}
              {/* Tooltip */}
              <div
                className="absolute bottom-full left-0 mb-2 w-max max-w-[200px] p-2 rounded-lg bg-black/90 border border-border shadow-xl text-[10px] text-muted-foreground opacity-0 group-hover/chapter:opacity-100 transition-opacity pointer-events-none z-50"
                onTouchStart={() => { if (!editingChapter) setTimeout(() => setChapterTooltip(true), 500); }}
                onTouchEnd={() => setChapterTooltip(false)}
              >
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

          {/* Prediction bar */}
          {prediction.confidence !== "insufficient" && (
            <div className={`mt-2 rounded-lg px-3 py-2.5 border flex items-start gap-2.5 ${
              prediction.daysUntil !== null && prediction.daysUntil <= 1 ? "bg-emerald-500/10 border-emerald-500/30"
              : prediction.daysUntil !== null && prediction.daysUntil < 0 ? "bg-orange-500/10 border-orange-500/30"
              : "bg-secondary/80 border-border"
            }`}>
              <Zap className={`w-4 h-4 mt-0.5 shrink-0 ${
                prediction.daysUntil !== null && prediction.daysUntil <= 1 ? "text-emerald-400"
                : prediction.daysUntil !== null && prediction.daysUntil < 0 ? "text-orange-400"
                : "text-primary"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{prediction.message}</p>
                {prediction.avgDays !== null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${prediction.progressPct >= 100 ? "bg-orange-400" : prediction.progressPct >= 75 ? "bg-emerald-400" : "bg-primary"}`}
                        style={{ width: `${Math.min(prediction.progressPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{prediction.progressPct}%</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                      prediction.confidence === "high" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : prediction.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    }`}>{prediction.confidence}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 space-y-4">
            {/* Mobile quick actions */}
            <div className="grid grid-cols-3 gap-3 sm:hidden">
              <button onClick={() => setBookmarkDialog(true)} className="flex flex-col items-center p-2.5 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                <Bookmark size={20} className={`mb-2 ${story.bookmarks.length > 0 ? "fill-primary text-primary" : "text-primary"}`} />
                <span className="text-[11px] font-semibold text-foreground">Bookmark</span>
                <span className="text-[9px] text-muted-foreground">{story.bookmarks.length} saved</span>
              </button>
              <button onClick={() => setNotesDialog(true)} className="flex flex-col items-center p-2.5 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                <FileText size={20} className="text-blue-500 mb-2" />
                <span className="text-[11px] font-semibold text-foreground">Notes</span>
                <span className="text-[9px] text-muted-foreground">{story.notes?.length || 0} notes</span>
              </button>
              <button onClick={handleOpenListsDialog} className="flex flex-col items-center p-2.5 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all shadow-sm">
                <List size={20} className="text-purple-500 mb-2" />
                <span className="text-[11px] font-semibold text-foreground">Lists</span>
                <span className="text-[9px] text-muted-foreground">{story.lists.length} lists</span>
              </button>
            </div>

            {/* Desktop actions */}
            <div className="hidden sm:grid grid-cols-5 gap-3 pb-1">
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

            {/* Genre + Demographic + More */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mt-2">
              {/* Genre — desktop */}
              <div className="hidden sm:flex flex-1 flex-wrap items-center gap-1.5 mr-4 min-w-0">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mr-1 shrink-0">Genre</span>
                {story.genres && story.genres.length > 0 ? (
                  <>
                    {(genreExpanded ? story.genres : story.genres.slice(0, 5)).map((g: string) => (
                      <span key={g} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-normal bg-secondary/60 text-muted-foreground border border-border/30 whitespace-nowrap">{g}</span>
                    ))}
                    {story.genres.length > 5 && (
                      <button onClick={() => setGenreExpanded(v => !v)} className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 transition-colors">
                        {genreExpanded ? "Show less" : `+${story.genres.length - 5} more`}
                      </button>
                    )}
                    <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-0.5 ml-1 transition-colors">
                      <Plus size={10} /> Edit
                    </button>
                  </>
                ) : (
                  <button onClick={() => setGenrePickerOpen(true)} className="text-[10px] text-muted-foreground hover:text-foreground italic flex items-center gap-0.5">
                    <Plus size={10} /> Add Genres
                  </button>
                )}
              </div>

              {/* Demographic + More */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end mr-2.5">
                <div className="relative group/demog">
                  <button
                    onClick={() => {
                      const list = ["Josei", "Seinen", "Shoujo", "Shounen", "Unknown"];
                      const nextIndex = (list.indexOf(story.demographic || "") + 1) % list.length;
                      updateStory(story.id, { demographic: list[nextIndex] });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-foreground text-xs font-semibold transition-colors border shadow-sm ${story.demographic ? `${DEMOGRAPHIC_INFO[story.demographic]} border-current/50` : "bg-secondary hover:bg-secondary/80 border-border text-muted-foreground"}`}
                  >
                    <span className={story.demographic ? "text-current" : "text-muted-foreground"}>
                      {DEMOGRAPHIC_ICONS[story.demographic || "Unknown"] || <HelpCircle className="w-3.5 h-3.5" />}
                    </span>
                    <span className="whitespace-nowrap">{story.demographic || "Unknown"}</span>
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-max px-2 py-1 bg-popover border border-border rounded shadow-xl text-[10px] text-muted-foreground opacity-0 group-hover/demog:opacity-100 pointer-events-none transition-opacity z-50">
                    Click to cycle audience
                  </div>
                </div>

                <Dialog open={moreDialog} onOpenChange={setMoreDialog}>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors border border-border">
                      <MoreHorizontal size={14} />
                      <span className="hidden sm:inline">More Options</span>
                      <span className="sm:hidden text-[12px]">More Options</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="w-[92vw] max-w-sm sm:max-w-lg p-6">
                    <DialogHeader><DialogTitle>More Options</DialogTitle></DialogHeader>
                    <div className="grid gap-2 pb-4 border-b border-border">
                      <button onClick={() => { setMoreDialog(false); setRatingDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors md:hidden">
                        <div className="p-1.5 rounded bg-secondary/50"><Star className="w-4 h-4 text-amber-500" /></div>
                        <div className="flex-1"><p className="text-sm font-medium text-foreground">Change Rating</p><p className="text-[10px] text-muted-foreground">Current: {story.rating || "—"}/10</p></div>
                      </button>
                      <button onClick={() => { setMoreDialog(false); setStatusDialog(true); }} className="flex sm:hidden items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors">
                        <div className="p-1.5 rounded bg-secondary/50"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: dotColor }} /></div>
                        <div className="flex-1"><p className="text-sm font-medium text-foreground">Change Status</p><p className="text-[10px] text-muted-foreground">{currentStatus?.label || "Not set"}</p></div>
                      </button>
                      <button onClick={() => { setMoreDialog(false); handleOpenHistory(); setHistoryDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors">
                        <div className="p-1.5 rounded bg-secondary/50"><History className="w-4 h-4 text-foreground" /></div>
                        <div className="flex-1"><p className="text-sm font-medium text-foreground">Version History</p><p className="text-[10px] text-muted-foreground">View history change</p></div>
                      </button>
                      <button onClick={() => { setMoreDialog(false); handleOpenRelated(); setRelatedDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors">
                        <div className="p-1.5 rounded bg-secondary/50"><GitBranch className="w-4 h-4 text-foreground" /></div>
                        <div className="flex-1"><p className="text-sm font-medium text-foreground">Related Stories</p><p className="text-[10px] text-muted-foreground">Prequel, Sequel, dll.</p></div>
                      </button>
                      <button
                        onClick={() => {
                          setMoreDialog(false);
                          if (story.hidden) {
                            updateStory(story.id, { hidden: false, lists: [] });
                          } else {
                            updateStory(story.id, { hidden: true, lists: ["Uncategorized"] });
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors"
                      >
                        <div className="p-1.5 rounded bg-secondary/50">
                          {story.hidden ? <Eye className="w-4 h-4 text-foreground" /> : <EyeOff className="w-4 h-4 text-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{story.hidden ? "Show in Library" : "Hide from Library"}</p>
                          <p className="text-[10px] text-muted-foreground">{story.hidden ? "Story will reappear in library" : "Move to Hidden Vault"}</p>
                        </div>
                      </button>
                      <button onClick={() => { setMoreDialog(false); setDeleteStoryDialog(true); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-left transition-colors">
                        <div className="p-1.5 rounded bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></div>
                        <div className="flex-1"><p className="text-sm font-medium text-destructive">Delete Story</p><p className="text-[10px] text-muted-foreground">Delete permanently, cannot be undone</p></div>
                      </button>
                    </div>
                    <div className="pt-4 flex flex-col items-end">
                      <span className="text-xs italic text-muted-foreground text-right">Story #{currentIndex + 1} of {allStoriesLength}</span>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { ArrowLeft, Lock, FilterIcon, List as ListIcon } from "lucide-react";
import { LibrarySearch } from "@/component/Navbar";

interface VaultNavbarProps {
  hiddenCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  onBack: () => void;
  filterCount: number;
  onOpenFilter: () => void;
  stories: any[];
  onOpenLists: () => void;
}

export function VaultNavbar({
  hiddenCount, search, onSearchChange, onBack, filterCount, onOpenFilter, stories, onOpenLists,
}: VaultNavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange("");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && searchOpen) closeSearch(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [searchOpen]);

  return (
    <div className="sticky top-0 z-20 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex items-center h-20 px-4 sm:px-6 max-w-7xl mx-auto gap-3 relative">
        <button
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-1.5 border border-border pointer-events-auto">
            <Lock size={12} className="text-primary font-bold" />
            <span className="text-sm font-bold text-foreground tracking-wide">Private Stories</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {hiddenCount} hidden {hiddenCount === 1 ? "story" : "stories"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <LibrarySearch
            search={search}
            onSearchChange={onSearchChange}
            stories={stories}
          />
          <button
            onClick={onOpenFilter}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all
              ${filterCount > 0
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
          >
            <FilterIcon size={16} />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-card" />
            )}
          </button>
          <button
            onClick={onOpenLists}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl border bg-secondary text-muted-foreground border-border hover:text-foreground transition-all"
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
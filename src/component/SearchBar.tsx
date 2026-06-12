import { useState, useRef, useEffect } from "react";
import { Search, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useSearchFilters } from "@/hooks/useSearchFilters";
import { GenreChip } from "@/component/GenreChip";
import { FilterTab } from "@/component/FilterTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/component/ui/checkbox";

type ActiveTab = "genres" | "format" | "sources" | "contentRating" | "tags" | null;

export default function SearchBar() {
  const isMobile = useIsMobile();
  const filters = useSearchFilters();
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = isMobile ? mobileOpen : activeTab !== null;

  // Close on outside click (desktop)
  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMobile]);

  const toggleTab = (tab: ActiveTab) => {
    if (isMobile) {
      setMobileOpen(true);
      setActiveTab(tab);
    } else {
      setActiveTab((prev) => (prev === tab ? null : tab));
    }
  };

  const filterChips = (chips: typeof filters.genres) =>
    filterSearch
      ? chips.filter((c) => c.label.toLowerCase().includes(filterSearch.toLowerCase()))
      : chips;

  const renderActiveContent = () => {
    const tab = activeTab || "genres";
    let chips = filters.genres;
    let setter = filters.setGenres;
    let sectionLabel = "GENRE";
    let showThemes = true;

    switch (tab) {
      case "format":
        chips = filters.formats;
        setter = filters.setFormats;
        sectionLabel = "FORMAT";
        showThemes = false;
        break;
      case "sources":
        chips = filters.sources;
        setter = filters.setSources;
        sectionLabel = "SOURCES";
        showThemes = false;
        break;
      case "contentRating":
        chips = filters.contentRatings;
        setter = filters.setContentRatings;
        sectionLabel = "CONTENT RATING";
        showThemes = false;
        break;
      case "tags":
        chips = filters.themes;
        setter = filters.setThemes;
        sectionLabel = "TAGS";
        showThemes = false;
        break;
      default:
        break;
    }

    const filtered = filterChips(chips);
    const filteredThemes = showThemes ? filterChips(filters.themes) : [];

    return (
      <div className="space-y-5">
        {/* Filter search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Filter ${sectionLabel.toLowerCase()}...`}
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-search-bg border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Hint */}
        <p className="text-xs text-white/70 font-medium italic">
          Tap: <span className="text-primary">include</span> →{" "}
          <span className="text-destructive">exclude</span> → clear.
        </p>

        {/* Selected chips */}
        {filters.activeFilters.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">
            SELECTED
          </h4>
            <div className="flex flex-wrap gap-2">
              {filters.activeFilters.map((c) => (
              <span
                key={c.label}
                onClick={() => {
                  const allSets = [
                    { chips: filters.genres, setter: filters.setGenres },
                    { chips: filters.themes, setter: filters.setThemes },
                    { chips: filters.formats, setter: filters.setFormats },
                    { chips: filters.sources, setter: filters.setSources },
                    { chips: filters.contentRatings, setter: filters.setContentRatings },
                  ];

                  for (const s of allSets) {
                    const idx = s.chips.findIndex((x) => x.label === c.label);
                    if (idx !== -1) {
                      filters.cycleChip(s.setter, idx);
                      break;
                    }
                  }
                }}
                className={`
                  cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition
                  ${
                    c.state === "include"
                      ? "bg-orange-500/20 text-orange-300 border-orange-400/40 hover:bg-orange-500/30"
                      : "bg-red-500/20 text-red-300 border-red-400/40 hover:bg-red-500/30"
                  }
                `}
              >
                {c.state === "include" ? "Genre" : "Exclude Genre"}: {c.label}
              </span>
            ))}
            </div>
          </div>
        )}

        {/* Main section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground tracking-wider mb-3">{sectionLabel}</h4>
          <div className="flex flex-wrap gap-2">
            {filtered.map((chip) => (
               <GenreChip
                key={chip.label}
                chip={chip}
                onClick={() => filters.cycleChip(setter, chips.findIndex((c) => c.label === chip.label))}
                highlight={filterSearch}
              />
            ))}
          </div>
        </div>

        {/* Themes */}
        {showThemes && filteredThemes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wider mb-3">THEME</h4>
            <div className="flex flex-wrap gap-2">
              {filteredThemes.map((chip) => (
                <GenreChip
                  key={chip.label}
                  chip={chip}
                  onClick={() =>
                    filters.cycleChip(
                      filters.setThemes,
                      filters.themes.findIndex((c) => c.label === chip.label)
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Match all */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filters.matchAll}
            onCheckedChange={(val: boolean | "indeterminate") => filters.setMatchAll(val === true)}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <span className="text-sm text-foreground">Match ALL selected genres</span>
        </div>
      </div>
    );
  };

  // Mobile full-screen overlay
  if (isMobile && mobileOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h2 className="text-2xl font-display font-bold text-foreground">Filters</h2>
          <button type="button" onClick={() => { setMobileOpen(false); setActiveTab(null); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <FilterTab label="Format" count={filters.formatCount} active={activeTab === "format"} onClick={() => setActiveTab("format")} />
          <FilterTab label="Genres" count={filters.genreCount} active={activeTab === "genres" || activeTab === null} onClick={() => setActiveTab("genres")} />
          <FilterTab label="Tags" active={activeTab === "tags"} onClick={() => setActiveTab("tags")} />
          <FilterTab label="Sources" count={filters.sourceCount} active={activeTab === "sources"} onClick={() => setActiveTab("sources")} />
          <FilterTab label="Content Rating" count={filters.contentRatingCount} active={activeTab === "contentRating"} onClick={() => setActiveTab("contentRating")} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {renderActiveContent()}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 flex gap-3 border-t border-border">
          <button
            type="button"
            onClick={filters.resetAll}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-foreground font-medium text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
          <button
            type="button"
            onClick={() => { setMobileOpen(false); setActiveTab(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm"
          >
            <X className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto relative">
      {/* Search input */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or use filters..."
            value={filters.searchQuery}
            onChange={(e) => filters.setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-search-bg border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* Mobile filter toggle */}
        {isMobile && (
          <button
            type="button"
            onClick={() => { setMobileOpen(true); setActiveTab("genres"); }}
            className="relative p-3.5 bg-primary text-primary-foreground rounded-xl"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {filters.selectedCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                {filters.selectedCount()}
              </span>
            )}
          </button>
        )}

        {!isMobile && (
          <button
            type="button"
            onClick={() => {}}
            className="px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        )}
      </div>

      {/* Desktop filter tabs */}
      {!isMobile && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <FilterTab label="Format" count={filters.formatCount} active={activeTab === "format"} onClick={() => toggleTab("format")} />
          <FilterTab label="Genres" count={filters.genreCount} active={activeTab === "genres"} onClick={() => toggleTab("genres")} />
          <FilterTab label="Tags" active={activeTab === "tags"} onClick={() => toggleTab("tags")} />
          <FilterTab label="Sources" count={filters.sourceCount} active={activeTab === "sources"} onClick={() => toggleTab("sources")} />
          <FilterTab label="Content Rating" count={filters.contentRatingCount} active={activeTab === "contentRating"} onClick={() => toggleTab("contentRating")} />
          {filters.selectedCount() > 0 && (
            <button
              type="button"
              onClick={filters.resetAll}
              className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Desktop dropdown */}
      {!isMobile && activeTab && (
        <div className="mt-4 bg-orange-300/20 border border-orange-500/30 rounded-2xl p-6 backdrop-blur-sm shadow-lg max-h-[60vh] overflow-y-auto animate-slide-down">
          {renderActiveContent()}
        </div>
      )}

      {/* Active filter badges */}
      {filters.activeFilters.length > 0 && !isOpen && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.activeFilters.map((f) => (
           <span
            key={f.label}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border
              ${
                f.state === "include"
                  ? "bg-orange-500/20 text-orange-300 border-orange-400/40"
                  : "bg-red-500/20 text-red-300 border-red-400/40"
              }
            `}
          >
            {f.state === "include" ? "Genre" : "Exclude Genre"}: {f.label}
              <button
                type="button"
                onClick={() => {
                  const allSets = [
                    { chips: filters.genres, setter: filters.setGenres },
                    { chips: filters.themes, setter: filters.setThemes },
                    { chips: filters.formats, setter: filters.setFormats },
                    { chips: filters.sources, setter: filters.setSources },
                    { chips: filters.contentRatings, setter: filters.setContentRatings },
                  ];
                  for (const s of allSets) {
                    const idx = s.chips.findIndex((x) => x.label === f.label);
                    if (idx !== -1) {
                      s.setter((prev) => prev.map((c, i) => (i === idx ? { ...c, state: "none" as const } : c)));
                      break;
                    }
                  }
                }}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { X, Search, Plus } from "lucide-react";
import { ALL_GENRES } from "../constants/genres";

export function GenrePickerModal({
  open, onClose, selectedGenres, onToggleGenre,
}: {
  open: boolean;
  onClose: () => void;
  selectedGenres: string[];
  onToggleGenre: (g: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = ALL_GENRES.filter(g => g.toLowerCase().includes(search.toLowerCase()));
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md sm:max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Genre & Themes</span>
            {selectedGenres.length > 0 && (
              <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">
                {selectedGenres.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedGenres.length > 0 && (
              <button
                onClick={() => onToggleGenre("__CLEAR__")}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
              >
                Clear
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X size={14} className="text-muted-foreground"/>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input
              placeholder="Search genre or theme..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-secondary text-xs pl-8 pr-8 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={11} className="text-muted-foreground"/>
              </button>
            )}
          </div>
        </div>

        {/* Pills */}
        <div className="px-4 pb-4 max-h-64 overflow-y-auto">
          {filtered.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {filtered.map(g => (
                <button
                  key={g}
                  onClick={() => onToggleGenre(g)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border
                    ${selectedGenres.includes(g)
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No results for "{search}"</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-1 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
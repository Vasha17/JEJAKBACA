import { useState } from "react";
import { X, Plus, Search, Trash2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CreateThemeDialog } from "@/component/CreateThemeDialog";
import type { AppTheme } from "@/lib/theme";
import { PRESET_THEMES } from "@/lib/theme";

interface ThemePickerProps {
  open: boolean;
  onClose: () => void;
}

function ThemeMiniPreview({ theme, mode, active, onClick }: {
  theme: AppTheme; mode: "light" | "dark"; active: boolean; onClick: () => void;
}) {
  const colors = mode === "dark" ? theme.dark : theme.light;
  return (
    <button
      onClick={onClick}
      className={`rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
        active ? "border-primary shadow-lg" : "border-border/50 hover:border-border"
      }`}
    >
      <div className="p-3 h-24" style={{ backgroundColor: colors.background }}>
        <div className="flex items-center gap-1 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
          <div className="h-1.5 w-16 rounded" style={{ backgroundColor: colors.border }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-1.5 w-12 rounded" style={{ backgroundColor: colors.foreground, opacity: 0.7 }} />
            <div className="h-1.5 w-8 rounded" style={{ backgroundColor: colors.foreground, opacity: 0.4 }} />
          </div>
          <div className="h-5 w-10 rounded-full" style={{ backgroundColor: colors.primary }}>
            <div className="h-5 w-5 rounded-full ml-auto" style={{ backgroundColor: colors.primaryForeground, transform: "scale(0.7)" }} />
          </div>
        </div>
      </div>
      <div className="px-3 py-2 text-xs font-medium text-foreground text-left" style={{ backgroundColor: colors.card }}>
        {theme.name}
      </div>
    </button>
  );
}

export function ThemePicker({ open, onClose }: ThemePickerProps) {
  const { mode, currentThemeId, setCurrentThemeId, allThemes, customThemes, deleteCustomTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTheme, setEditTheme] = useState<AppTheme | undefined>();

  const filteredPresets = PRESET_THEMES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCustom = customThemes.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-md bg-background border-l border-border h-full flex flex-col animate-in slide-in-from-right-5">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">Themes</span>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {allThemes.length}
              </span>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search themes..."
                className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-6">
            {/* My Themes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">My Themes</span>
                <button onClick={() => { setEditTheme(undefined); setCreateOpen(true); }}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus size={14} /> New
                </button>                
              </div>

              {filteredCustom.length === 0 ? (
                <button onClick={() => { setEditTheme(undefined); setCreateOpen(true); }} 
                  className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Plus size={20} />
                  <span className="text-sm">Create your first custom theme</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredCustom.map((t) => (
                    <div key={t.id} className="relative group">
                      <ThemeMiniPreview
                        theme={t}
                        mode={mode}
                        active={currentThemeId === t.id}
                        onClick={() => setCurrentThemeId(t.id)}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCustomTheme(t.id); }}
                        className="absolute top-1 right-1 p-1 rounded-md bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preset */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Neutral</span>
                <span className="text-[11px] text-muted-foreground">{filteredPresets.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredPresets.map((t) => (
                  <ThemeMiniPreview
                    key={t.id}
                    theme={t}
                    mode={mode}
                    active={currentThemeId === t.id}
                    onClick={() => setCurrentThemeId(t.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateThemeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        editTheme={editTheme}
      />
    </>
  );
}

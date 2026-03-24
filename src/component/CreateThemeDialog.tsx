import { useState, useEffect } from "react";
import { X, ChevronLeft } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { AppTheme, ThemeColors } from "@/lib/theme";

interface CreateThemeDialogProps {
  open: boolean;
  onClose: () => void;
  editTheme?: AppTheme;
}

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "primary", label: "Primary" },
  { key: "primaryForeground", label: "Primary Text" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "muted", label: "Muted" },
  { key: "card", label: "Card" },
  { key: "border", label: "Border" },
];

const defaultLight: ThemeColors = {
  background: "#fefcf5", foreground: "#3d2e0a", primary: "#f6a823",
  primaryForeground: "#ffffff", secondary: "#fef3cd", accent: "#fff8e1",
  muted: "#faf5eb", mutedForeground: "#9ca3af", card: "#ffffff", border: "#e8dcc8",
};

const defaultDark: ThemeColors = {
  background: "#1a1408", foreground: "#f0e6d0", primary: "#f6a823",
  primaryForeground: "#1a1408", secondary: "#2e2510", accent: "#3d3118",
  muted: "#231c0c", mutedForeground: "#6b7280", card: "#1e1809", border: "#4a3d1f",
};

function MiniPreview({ colors }: { colors: ThemeColors }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ backgroundColor: colors.background }}>
      <div className="p-3 h-20">
        <div className="flex items-center gap-1 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
          <div className="h-1.5 w-14 rounded" style={{ backgroundColor: colors.border }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-1.5 w-10 rounded" style={{ backgroundColor: colors.foreground, opacity: 0.7 }} />
            <div className="h-1.5 w-7 rounded" style={{ backgroundColor: colors.foreground, opacity: 0.4 }} />
          </div>
          <div className="h-4 w-9 rounded-full" style={{ backgroundColor: colors.primary }} />
        </div>
      </div>
    </div>
  );
}

export function CreateThemeDialog({ open, onClose, editTheme }: CreateThemeDialogProps) {
  const { addCustomTheme, setCurrentThemeId } = useTheme();
  const [name, setName] = useState("My Theme");
  const [activeTab, setActiveTab] = useState<"light" | "dark">("light");
  const [light, setLight] = useState<ThemeColors>({ ...defaultLight });
  const [dark, setDark] = useState<ThemeColors>({ ...defaultDark });

  useEffect(() => {
    if (editTheme) {
      setName(editTheme.name);
      setLight({ ...editTheme.light });
      setDark({ ...editTheme.dark });
    } else {
      setName("My Theme");
      setLight({ ...defaultLight });
      setDark({ ...defaultDark });
    }
  }, [editTheme, open]);

  const current = activeTab === "light" ? light : dark;
  const setCurrent = (key: keyof ThemeColors, val: string) => {
    if (activeTab === "light") setLight(p => ({ ...p, [key]: val }));
    else setDark(p => ({ ...p, [key]: val }));
  };

  const handleCreate = () => {
    const id = editTheme?.id || `custom-${Date.now()}`;
    const theme: AppTheme = { id, name, light, dark, isCustom: true };
    addCustomTheme(theme);
    setCurrentThemeId(id);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} />
      )}

      {/* Left-side drawer */}
      <div
        className={`fixed top-0 left-0 z-[75] h-full w-full max-w-md bg-background border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft size={20} className="text-muted-foreground" />
            </button>
            <span className="text-lg font-bold text-foreground">
              {editTheme ? "Edit Theme" : "Create Theme"}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Theme Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            />
          </div>

          {/* Previews */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-muted-foreground mb-1 block">Light</span>
              <MiniPreview colors={light} />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground mb-1 block">Dark</span>
              <MiniPreview colors={dark} />
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex bg-secondary rounded-xl p-1">
            <button
              onClick={() => setActiveTab("light")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "light" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Light Mode
            </button>
            <button
              onClick={() => setActiveTab("dark")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "dark" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Dark Mode
            </button>
          </div>

          {/* Color fields */}
          <div className="space-y-3">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                <input
                  type="color"
                  value={current[key]}
                  onChange={(e) => setCurrent(key, e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <input
                  value={current[key]}
                  onChange={(e) => setCurrent(key, e.target.value)}
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {editTheme ? "Save Theme" : "Create Theme"}
          </button>
        </div>
      </div>
    </>
  );
}

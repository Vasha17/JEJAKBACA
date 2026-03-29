import { useState, useEffect, cloneElement, isValidElement } from "react";
import { createPortal } from "react-dom";
import { X, List as ListIcon } from "lucide-react";

/* ─── Static Palettes ─────────────────────────────────── */
const PALETTES = {
  colorful: ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"],
  mono: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b", "#0f172a"],
};
type PaletteName = "colorful" | "mono";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/* ─── NewListDialog (standalone, portal-based) ────────── */
interface NewListDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string, visibility: string) => void;
  existingCount: number;
  themeColor?: string;
}

export function NewListDialog({ open, onClose, onCreate, existingCount, themeColor = "#3b82f6" }: NewListDialogProps) {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [colorMode, setColorMode] = useState<"auto" | "manual">("auto");
  const [palette, setPalette] = useState<PaletteName>("colorful");
  const [manualColor, setManualColor] = useState(PALETTES.colorful[0]);

  const autoColor = PALETTES[palette][existingCount % PALETTES[palette].length];
  const finalColor = colorMode === "auto" ? autoColor : manualColor;

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), finalColor, "private");
    setName("");
    setColorMode("auto");
    setPalette("colorful");
    setManualColor(PALETTES.colorful[0]);
    onClose();
  };

  const handleClose = () => {
    setName("");
    setColorMode("auto");
    setPalette("colorful");
    setManualColor(PALETTES.colorful[0]);
    onClose();
  };

  if (!open) return null;

  /* ─── Shared form content ─────────────────────────────── */
  const formContent = (
    <div className="p-5 space-y-4 overflow-y-auto">
      {/* Name */}
      <div>
        <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-bold">
          List Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weekend Reads"
          className="w-full text-sm bg-secondary border border-border rounded-xl px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground transition-colors"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
      </div>

      {/* Color */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Color</label>
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 border border-border">
            {(["auto", "manual"] as const).map((m) => (
              <button key={m} onClick={() => setColorMode(m)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  colorMode === m ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                {m === "auto" ? "Auto" : "Manual"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5">
          {(["colorful", "mono"] as PaletteName[]).map((p) => (
            <button key={p} onClick={() => { setPalette(p); if (colorMode === "manual") setManualColor(PALETTES[p][0]); }}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                palette === p ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}>
              {p === "colorful" ? "Colorful" : "Mono"}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {PALETTES[palette].map((c, i) => {
            const isSelected = colorMode === "manual" ? manualColor === c : autoColor === c;
            return (
              <button key={i} onClick={() => { setColorMode("manual"); setManualColor(c); }}
                className={`w-7 h-7 rounded-full transition-all shrink-0 ${
                  isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"
                }`}
                style={{ backgroundColor: c }} />
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-secondary/50">
          <div className="w-5 h-5 rounded-full shadow-md shrink-0 ring-1 ring-white/20" style={{ backgroundColor: finalColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">
              {colorMode === "auto" ? `Auto · ${palette} palette` : "Manually picked"}
            </p>
          </div>
          <div className="w-20 h-1.5 rounded-full overflow-hidden"
            style={{ background: `linear-gradient(to right, ${finalColor}33, ${finalColor})` }} />
        </div>
      </div>
    </div>
  );

  /* ─── Mobile: Bottom Sheet via portal ─────────────────── */
  if (isMobile) {
    return createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {/* Backdrop */}
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        />
        {/* Sheet */}
        <div
          className="relative flex flex-col animate-in slide-in-from-bottom duration-300"
          style={{
            borderRadius: "24px 24px 0 0",
            maxHeight: "92dvh",
            background: "hsl(var(--card))",
            borderTop: "1px solid hsl(var(--border))",
            boxShadow: "0 -24px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "hsl(var(--border))" }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${finalColor}22`, border: `1.5px solid ${finalColor}55` }}>
                <ListIcon size={14} style={{ color: finalColor }} />
              </div>
              <span className="font-bold text-sm">New List</span>
            </div>
            <button onClick={handleClose}
              className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
              <X size={13} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {formContent}
          </div>

          {/* Footer */}
          <div className="px-5 pb-8 pt-3 border-t border-border/50 shrink-0">
            <div className="flex gap-2">
              <button onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 disabled:opacity-40 transition-all shadow-md shadow-primary/20">
                Create List
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  /* ─── Desktop: Centered modal ─────────────────────────── */
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${finalColor}22`, border: `1.5px solid ${finalColor}55` }}>
              <ListIcon size={14} style={{ color: finalColor }} />
            </div>
            <h2 className="text-sm font-bold text-foreground">New List</h2>
          </div>
          <button onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto">
          {formContent}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 border-t border-border/50 shrink-0">
          <div className="flex gap-2">
            <button onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 disabled:opacity-40 transition-all shadow-md shadow-primary/20">
              Create List
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
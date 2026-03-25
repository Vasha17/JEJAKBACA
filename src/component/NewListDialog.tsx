// components/NewListDialog.tsx
import { useState } from "react";
import { X } from "lucide-react";

const COLORS = [
  "#22c55e", "#3b82f6", "#a855f7", "#ef4444",
  "#f59e0b", "#ec4899", "#06b6d4", "#f97316",
];

interface NewListDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

export function NewListDialog({ open, onClose, onCreate }: NewListDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  if (!open) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), color);
    setName("");
    setColor(COLORS[0]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">New List</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">List Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Reads"
              className="w-full text-sm bg-secondary border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1.5 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 disabled:opacity-40 transition-all"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
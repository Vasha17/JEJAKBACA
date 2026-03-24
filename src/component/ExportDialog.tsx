import { X } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: string) => void;
}

export function ExportDialog({ open, onClose, onExport }: ExportDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 bg-background border border-border rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold text-foreground">Export Progress</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Download your reading progress as a JSON file.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={() => { onExport("json"); onClose(); }} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}

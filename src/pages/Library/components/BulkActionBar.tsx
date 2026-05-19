import { useState } from "react";
import { X, Settings, ChevronRight, ExternalLink, Trash2 } from "lucide-react";
import { StoryStatus } from "@/lib/types";
import { STATUS_OPTIONS } from "../constants";

interface BulkActionBarProps {
  count: number;
  selectedIds: Set<string>;
  onClose: () => void;
  onDelete: () => void;
  onStatusChange: (status: StoryStatus) => void;
  onOpenSources: (ids?: Set<string>) => void;
}

export function BulkActionBar({ count, selectedIds, onClose, onDelete, onStatusChange, onOpenSources }: BulkActionBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  return (
    <div className="fixed bottom-24 left-3 right-3 sm:bottom-8 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 z-20 bg-card border border-border rounded-2xl shadow-2xl p-2 flex items-center gap-1 animate-in slide-in-from-bottom-4">
      <span className="text-xs font-bold text-foreground px-1 mx-0.5 shrink-0">{count} Selected</span>
      <div className="h-4 w-px bg-border mx-0.5 shrink-0" />
      <div className="relative shrink-0">
        <button onClick={() => setStatusOpen(prev => !prev)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:bg-secondary text-foreground transition-colors shrink min-w-0">
          <Settings size={14} className="shrink-0" /><span className="truncate">Status</span>
          <ChevronRight size={12} className={`transition-transform ${statusOpen ? "rotate-90" : ""} shrink-0`} />
        </button>
        {statusOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-0.5 bg-card border border-border rounded-lg shadow-xl overflow-hidden w-[40vw] max-w-[200px] p-1 z-[100]">
            {STATUS_OPTIONS.map(s => (
              <button key={s.value}
                onClick={() => { onStatusChange(s.value as StoryStatus); setStatusOpen(false); }}
                className="text-left px-2 py-1.5 text-xs hover:bg-secondary rounded flex items-center gap-2 text-muted-foreground hover:text-foreground whitespace-nowrap">
                <span className={s.color}>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => onOpenSources(selectedIds)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:bg-blue-500/10 text-blue-400 transition-colors shrink min-w-0">
        <ExternalLink size={14} className="shrink-0" /><span className="truncate">Open Tabs</span>
      </button>
      <button onClick={onDelete} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-500/10 text-red-500 transition-colors shrink min-w-0">
        <Trash2 size={14} className="shrink-0" /><span className="truncate">Delete</span>
      </button>
      <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
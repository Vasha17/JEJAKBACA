import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Lock, Plus } from "lucide-react";
import { ReadingList } from "@/lib/types";
import { ListCard } from "@/component/ListCard";
import { NewListDialog } from "@/component/NewListDialog";
import { VaultListsMap } from "../hooks/useHiddenStories";

interface VaultListPanelProps {
  open: boolean;
  onClose: () => void;
  listsMap: VaultListsMap;
  onCreated: () => void;
}

export function VaultListPanel({ open, onClose, listsMap, onCreated }: VaultListPanelProps) {
  const [newListDialogOpen, setNewListDialogOpen] = useState(false);

  if (!open) return null;

  const handleCreate = (name: string, color: string, _visibility: string) => {
    const savedLists: any[] = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
    const newList = {
      id: Date.now().toString(),
      name,
      description: "",
      status: "Custom",
      stories: [],
      color,
      isHidden: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("my_reading_lists", JSON.stringify([...savedLists, newList]));
    onCreated();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-sm h-full bg-card border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-primary" />
              <span className="font-bold text-sm text-foreground">Vault Lists</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-0.5">
            <button
              onClick={() => setNewListDialogOpen(true)}
              className="col-span-2 md:col-span-1 py-2 md:py-2.5 rounded-xl border-2 border-dashed border-border bg-secondary/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground group"
            >
              <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center group-hover:border-primary">
                <Plus size={12} className="text-current" />
              </div>
              <span className="text-xs font-bold">Create Vault List</span>
            </button>

            {Object.entries(listsMap).map(([listId, data]) => (
              <Link
                to={`/lists/${listId}`}
                key={listId}
                state={{ fromVault: true }}
                onClick={onClose}
                className="block"
              >
                <div className="scale-[0.97] md:scale-[0.92] origin-top transition-transform">
                  <ListCard
                    list={{
                      ...data.list,
                      stories: data.stories,
                      count: data.stories.length,
                    } as ReadingList & { count: number }}
                  />
                </div>
              </Link>
            ))}

            {Object.keys(listsMap).length === 0 && (
              <p className="col-span-2 md:col-span-1 text-xs text-muted-foreground text-center py-8">
                Vault is empty. Create a hidden list to get started.
              </p>
            )}
          </div>
        </div>
      </div>

      <NewListDialog
        open={newListDialogOpen}
        onClose={() => setNewListDialogOpen(false)}
        onCreate={handleCreate}
        existingCount={Object.keys(listsMap).length}
      />
    </>
  );
}
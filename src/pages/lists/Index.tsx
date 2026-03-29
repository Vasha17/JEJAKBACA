import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus, List as ListIcon, AlertTriangle, X,
} from "lucide-react";
import { useStories } from "@/lib/StoryContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/component/Auth";
import { ReadingList } from "@/lib/types";
import { ListCard } from "@/component/ListCard";
import { Navbar } from "@/component/Navbar";
import { NewListDialog } from "@/component/NewListDialog";

// ── Toast ──────────────────────────────────────────────────────────────────
let _toastEmitter: ((item: any) => void) | null = null;

function useToastBottom() {
  const [toasts, setToasts] = useState<any[]>([]);
  useEffect(() => {
    _toastEmitter = (item) => {
      setToasts((p) => [...p, item]);
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== item.id)), 3000);
    };
    return () => { _toastEmitter = null; };
  }, []);
  const dismiss = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));
  return { toasts, dismiss };
}

function showToast(title: string, description?: string) {
  _toastEmitter?.({ id: Date.now() + Math.random(), title, description });
}

function ToastStack() {
  const { toasts, dismiss } = useToastBottom();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-3 min-w-[200px]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">{t.title}</p>
            {t.description && (
              <p className="text-[10px] text-muted-foreground">{t.description}</p>
            )}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground text-sm shrink-0">✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────
function DeleteListDialog({ list, onConfirm, onCancel }: {
  list: ReadingList; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Delete this list?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              "<span className="text-foreground font-semibold">{list.name}</span>" will be removed.
            </p>
          </div>
          <div className="flex gap-2 w-full mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-destructive/20">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── "New List" trigger card ─────────────────────────────────────────────────
function NewListCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 p-6 text-center min-h-[140px]"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-200">
        <Plus size={20} className="text-primary" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">New List</p>
        <p className="text-xs text-muted-foreground mt-0.5">Create a collection</p>
      </div>
    </button>
  );
}

// ── Supabase helpers ───────────────────────────────────────────────────────
async function fetchListsFromSupabase(userId: string): Promise<ReadingList[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { console.error("Failed to fetch lists:", error); return []; }
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    status: row.status || "Custom",
    color: row.color || "#3b82f6",
    stories: [],
    count: 0,
    storyIds: [],
    visibility: "private" as const,
    userId: row.user_id,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }));
}

async function upsertListToSupabase(userId: string, list: ReadingList) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.from("lists").upsert(
    {
      id: list.id,
      user_id: userId,
      name: list.name,
      color: list.color,
      status: list.status,
      description: list.description || "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) console.error("Failed to upsert list:", error);
}

async function deleteListFromSupabase(listId: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) console.error("Failed to delete list:", error);
}

// ── Main Page ──────────────────────────────────────────────────────────────
const ListsIndex = () => {
  const { stories } = useStories();
  const { currentTheme, mode } = useTheme();
  const { user } = useAuth();
  const isGuest = !user || localStorage.getItem("jejakbaca_skip_login") === "true";

  const [lists, setLists] = useState<ReadingList[]>(() => {
    const saved = localStorage.getItem("my_reading_lists");
    return saved ? JSON.parse(saved) : [];
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchList, setSearchList] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ReadingList | null>(null);

  // ── Pull lists dari Supabase saat login ──
  useEffect(() => {
    if (isGuest || !user) return;
    (async () => {
      const remoteLists = await fetchListsFromSupabase(user.id);
      if (remoteLists.length > 0) {
        // Merge: remote wins, tapi jaga list lokal yang belum tersync
        const localLists: ReadingList[] = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
        const remoteIds = new Set(remoteLists.map((l) => l.id));
        const localOnly = localLists.filter((l) => !remoteIds.has(l.id));

        // Upload list lokal yang belum ada di remote
        for (const l of localOnly) {
          await upsertListToSupabase(user.id, l);
        }

        const merged = [...remoteLists, ...localOnly];
        setLists(merged);
        localStorage.setItem("my_reading_lists", JSON.stringify(merged));
      } else {
        // Belum ada di remote — upload semua list lokal
        const localLists: ReadingList[] = JSON.parse(localStorage.getItem("my_reading_lists") || "[]");
        for (const l of localLists) {
          await upsertListToSupabase(user.id, l);
        }
      }
    })();
  }, [user]);

  const handleUpdateLists = (newLists: ReadingList[]) => {
    setLists(newLists);
    localStorage.setItem("my_reading_lists", JSON.stringify(newLists));
  };

  const handleCreate = async (name: string, color: string, visibility: string) => {
  const newList: ReadingList = {
    id: Date.now().toString(),
    name,
    description: "",
    status: "Custom",
    stories: [],
    count: 0,
    storyIds: [],
    visibility: "private" as const,
    userId: "",
    color,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  handleUpdateLists([...lists, newList]);
  showToast("List created", name);

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Tunggu session ready dulu
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    const skipLogin = localStorage.getItem("jejakbaca_skip_login") === "true";
    
    console.log("Session user:", currentUser?.id);
    
    if (currentUser && !skipLogin) {
      await upsertListToSupabase(currentUser.id, newList);
      console.log("✅ List synced:", newList.name);
    } else {
      console.log("No session — list saved locally only");
    }
  } catch (e) {
    console.error("Failed to sync new list:", e);
  }
};

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    handleUpdateLists(lists.filter((l) => l.id !== deleteTarget.id));
    showToast("List deleted", deleteTarget.name);

    // Sync ke Supabase
    if (!isGuest && user) {
      await deleteListFromSupabase(deleteTarget.id);
    }

    setDeleteTarget(null);
  };

  const listsWithRealStories = useMemo(() => {
    return lists.map((list) => {
      const storiesInList = stories.filter(
        (s) => s.lists && s.lists.includes(list.id)
      );
      return { ...list, stories: storiesInList, count: storiesInList.length };
    });
  }, [lists, stories]);

  const filteredLists = listsWithRealStories.filter((l) =>
    l.name.toLowerCase().includes(searchList.toLowerCase())
  );

  const currentThemeColor = (mode === "dark" ? currentTheme?.dark?.primary : currentTheme?.light?.primary) || "#3b82f6";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar
        variant="lists"
        listSearch={searchList}
        onListSearchChange={setSearchList}
        onNewList={(name, color, visibility) => handleCreate(name, color, visibility || "private")}
        storiesCount={lists.length}
        totalChapters={0}
        completedCount={0}
        avgRating={0}
      />

      <div className="px-4 md:px-8 py-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">My Collections</h1>
            <p className="text-xs text-muted-foreground">Manage your reading groups</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {lists.length} list{lists.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filteredLists.length === 0 && searchList === "" ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <NewListCard onClick={() => setDialogOpen(true)} />
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-secondary/20">
            <ListIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No lists match "{searchList}"</p>
            <button onClick={() => setSearchList("")} className="mt-2 text-primary text-sm hover:underline font-medium">Clear search</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists.map((list) => (
              <Link key={list.id} to={`/lists/${list.id}`}>
                <ListCard list={list} onDelete={() => setDeleteTarget(list)} />
              </Link>
            ))}
            <NewListCard onClick={() => setDialogOpen(true)} />
          </div>
        )}
      </div>

      <NewListDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
        existingCount={lists.length}
        themeColor={currentThemeColor}
      />

      {deleteTarget && (
        <DeleteListDialog
          list={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <ToastStack />
    </div>
  );
};

export default ListsIndex;
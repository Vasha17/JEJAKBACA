import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, List as ListIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStories } from "@/lib/StoryContext"; 
import { ReadingList } from "@/lib/types"; 
import { NewListCard } from "@/component/NewListCard"; 
import { ListCard } from "@/component/ListCard"; 
import { NewListDialog } from "@/component/NewListDialog";
import { Navbar } from "@/component/Navbar";

const ListsIndex = () => {
  const { stories } = useStories(); // Ambil semua story
  const navigate = useNavigate();
  
  // State Lists berasal dari LocalStorage/Types helper, bukan SAMPLE_LISTS
  // Asumsi: Kamu punya fungsi getCustomLists() di types atau context
  const [lists, setLists] = useState<ReadingList[]>(() => {
    const saved = localStorage.getItem("my_reading_lists");
    return saved ? JSON.parse(saved) : [];
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchList, setSearchList] = useState(""); // Cari list
  const { toast } = useToast();

  // Simpan lists ke LocalStorage setiap berubah
  const handleUpdateLists = (newLists: ReadingList[]) => {
    setLists(newLists);
    localStorage.setItem("my_reading_lists", JSON.stringify(newLists));
  };

  const handleCreate = (name: string, color: string) => {
    const newList: ReadingList = {
      id: Date.now().toString(),
      name,
      description: "",
      status: "Custom",
      stories: [], // Kosongkan dulu, nanti isi otomatis
      color,
    };
    handleUpdateLists([...lists, newList]);
    toast({ title: "List created", description: name });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure? This won't delete the stories, only the list.")) {
      const updated = lists.filter((l) => l.id !== id);
      handleUpdateLists(updated);
      
      // Opsional: Hapus referensi list ini dari semua story
      stories.forEach(story => {
        if (story.lists && story.lists.includes(id)) {
           // Panggil fungsi removeListFromStory dari context jika ada
           // updateStory(story.id, { lists: story.lists.filter(l => l !== id) });
        }
      });

      toast({ title: "List deleted" });
    }
  };

  // ── LOGIKA INTELEJEN: ISI LIST SECARA OTOMATIS ──
  // Kita ganti isi 'stories' di setiap list berdasarkan data real
  const listsWithRealStories = useMemo(() => {
    return lists.map(list => {
      // Cari story yang punya ID list ini di properti 'lists'-nya
      const storiesInList = stories.filter(s => 
        s.lists && s.lists.includes(list.id)
      );
      
      return {
        ...list,
        stories: storiesInList, // Update data stories di objek list
        count: storiesInList.length // Tambah properti count untuk display
      };
    });
  }, [lists, stories]);

  // Filter Lists
  const filteredLists = listsWithRealStories.filter(l => 
    l.name.toLowerCase().includes(searchList.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 md:px-8 py-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-brand text-foreground">My Collections</h1>
            <p className="text-xs text-muted-foreground">Manage your reading groups</p>
          </div>
          <span className="text-xs text-muted-foreground">{lists.length} lists</span>
        </div>

        {/* Search List */}
        <div className="relative mb-6 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            value={searchList}
            onChange={e => setSearchList(e.target.value)}
            placeholder="Search lists..."
            className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {filteredLists.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-secondary/20">
            <ListIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3"/>
            <p className="text-sm text-muted-foreground">No lists found.</p>
            <button onClick={() => setDialogOpen(true)} className="mt-2 text-primary text-sm hover:underline">Create one now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists.map((list) => (
              <div key={list.id} className="group relative">
                {/* ListCard akan menerima prop 'list' yang sudah berisi stories real */}
                <Link to={`/lists/${list.id}`}>
                  <ListCard list={list} />
                </Link>
                
                <button
                  onClick={() => handleDelete(list.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur border border-border text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shadow-sm"
                  title="Delete List"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <NewListCard onClick={() => setDialogOpen(true)} />
          </div>
        )}
      </div>
      <NewListDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default ListsIndex;
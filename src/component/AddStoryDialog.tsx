import { useState } from "react";
import { useStories } from "@/lib/StoryContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/component/ui/dialog";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { Textarea } from "@/component/ui/textarea"; 
import { Label } from "@/component/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/component/ui/tabs"; // <--- Pastikan import ini ada
import { Plus, Loader2, Sparkles, AlertTriangle } from "lucide-react"; 
import { useNavigate } from "react-router-dom";

interface AddStoryDialogProps {
  trigger?: React.ReactNode;
  showLabel?: boolean;
}

export function AddStoryDialog({ trigger, showLabel }: AddStoryDialogProps) {
  const [open, setOpen] = useState(false);
  
  // --- STATE MANUAL ---
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [synopsis, setSynopsis] = useState("");
  
  // --- STATE AUTO ---
  const [autoUrl, setAutoUrl] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);

  const { addStory, addStoryWithMeta, stories } = useStories();
  const navigate = useNavigate();

  function normalize(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Cek duplikat (Hanya untuk mode Manual)
  const duplicates = stories.filter(s => {
    const norm = normalize(title);
    if (norm.length < 3) return false;
    const normTitle = normalize(s.title);
    return normTitle === norm || normTitle.includes(norm) || norm.includes(normTitle);
  });

  // --- HANDLER: MANUAL SUBMIT ---
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const story = addStory({ 
      title: title.trim(), 
      author: author.trim(),
      coverUrl: coverUrl.trim(),
      synopsis: synopsis.trim(),
    });
    
    // Reset Manual Form
    setTitle(""); setAuthor(""); setCoverUrl(""); setSynopsis("");
    setOpen(false);
    navigate(`/story/${story.id}`);
  };

  // --- HANDLER: AUTO SUBMIT ---
  const handleAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoUrl.trim()) return;

    setAutoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-story-meta", {
        body: { url: autoUrl.trim() },
      });
      if (error) throw error;

      const newStory = await addStoryWithMeta({
        title: data.title,
        author: data.author,
        genre: data.genre,
        country: data.country,
        cover: data.cover,
        description: data.description,
        whereToRead: data.whereToRead,
        altTitle: data.altTitle,
      });

      setAutoUrl("");
      setOpen(false);
      navigate(`/story/${newStory.id}`);

    } catch (err) {
      console.error(err);
      alert("Gagal mengambil data. Pastikan link valid.");
    } finally {
      setAutoLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4"/>
            {showLabel && <span className="text-sm font-medium">Add Story</span>}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Story</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Input</TabsTrigger>
            <TabsTrigger value="auto">Auto-Fill (Link)</TabsTrigger>
          </TabsList>

          {/* --- TAB 1: MANUAL --- */}
          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="m-title">Title *</Label>
                <Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. One Piece" autoFocus/>
                {duplicates.length > 0 && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>
                    <div className="text-xs">
                      <span className="font-semibold">Possible duplicate:</span>
                      <ul className="mt-1 space-y-0.5">
                        {duplicates.slice(0, 2).map(d => <li key={d.id}>• {d.title}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-author">Author</Label>
                <Input id="m-author" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Optional"/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-cover">Cover URL</Label>
                <Input id="m-cover" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..."/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-synopsis">Synopsis</Label>
                <Textarea id="m-synopsis" value={synopsis} onChange={e => setSynopsis(e.target.value)} placeholder="Brief summary..." className="min-h-[80px]"/>
              </div>

              <Button type="submit" className="w-full" disabled={!title.trim()}>Add Manually</Button>
            </form>
          </TabsContent>

          {/* --- TAB 2: AUTO --- */}
          <TabsContent value="auto">
            <form onSubmit={handleAutoSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Paste link (MyAnimeList, Webtoon, etc) and we'll fill Title, Author, Genre, and Cover automatically.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={autoUrl}
                    onChange={e => setAutoUrl(e.target.value)}
                    placeholder="https://MyAnimeList.net/title/..."
                    disabled={autoLoading}
                  />
                  <Button type="submit" disabled={autoLoading || !autoUrl.trim()}>
                    {autoLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
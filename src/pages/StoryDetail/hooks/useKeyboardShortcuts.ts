import { useEffect } from "react";

type Props = {
  story: any;
  onChapterUpdate: (ch: number) => void;
  onOpenNotes: () => void;
  onOpenRating: () => void;
  onNavigateBack: () => void;
  prevStoryId?: string;
  nextStoryId?: string;
  onNavigateStory: (id: string) => void;
};

export function useKeyboardShortcuts({
  story, onChapterUpdate, onOpenNotes, onOpenRating,
  onNavigateBack, prevStoryId, nextStoryId, onNavigateStory,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case "n": e.preventDefault(); onChapterUpdate(story.currentChapter + 1); break;
        case "s": e.preventDefault(); onOpenNotes(); break;
        case "r": e.preventDefault(); onOpenRating(); break;
        case "escape": e.preventDefault(); onNavigateBack(); break;
        case "arrowleft":  if (prevStoryId) { e.preventDefault(); onNavigateStory(prevStoryId); } break;
        case "arrowright": if (nextStoryId) { e.preventDefault(); onNavigateStory(nextStoryId); } break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [story, prevStoryId, nextStoryId]);
}
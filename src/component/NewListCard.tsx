import { Plus } from "lucide-react";

interface NewListCardProps {
  onClick: () => void;
}

export function NewListCard({ onClick }: NewListCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-2"
    >
      <div className="p-3 rounded-full bg-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Plus size={20} />
      </div>
      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        Create New List
      </span>
    </button>
  );
}
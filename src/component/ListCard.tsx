import { Link } from "react-router-dom";
import { BookOpen, MoreHorizontal } from "lucide-react";
import { ReadingList } from "@/lib/types"; 

interface ListCardProps {
  list: ReadingList; 
}

export function ListCard({ list }: ListCardProps) {
  return (
    <div className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-secondary border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300">
      {/* Background Color with Opacity */}
      <div 
        className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: list.color }}
      />

      <div className="relative z-10 flex flex-col h-full p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <span 
            className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border"
            style={{ 
              color: list.color, 
              borderColor: `${list.color}40`, 
              backgroundColor: `${list.color}10` 
            }}
          >
            {list.status}
          </span>
          
          {/* Menu Button (Placeholder) */}
          <button className="p-1.5 rounded-lg bg-card/50 hover:bg-card text-muted-foreground transition-colors opacity-0 group-hover:opacity-100">
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-end">
          <h3 className="text-xl font-bold text-foreground leading-tight mb-2 line-clamp-2">
            {list.name}
          </h3>
          
          {list.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
              {list.description}
            </p>
          )}

          {/* Footer Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-primary"/>
              <span className="font-semibold text-foreground">
                {list.count ?? list.stories?.length ?? 0}
              </span>
              <span>stories</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
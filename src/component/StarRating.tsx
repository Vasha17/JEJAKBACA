import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  onChange,
  readonly = false,
  size = 16,
  maxRating = 10,
}: {
  rating: number;
  onChange?: (r: number) => void;
  readonly?: boolean;
  size?: number;
  maxRating?: number;
}) {
  // For compact display (1-10), show a single star badge
  if (maxRating === 10) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30",
          !readonly && "cursor-pointer"
        )}
        onClick={() => {
          if (readonly || !onChange) return;
          const next = prompt("Rate 1-10:", String(rating || ""));
          if (next) {
            const val = Math.min(10, Math.max(0, parseInt(next) || 0));
            onChange(val);
          }
        }}
      >
        <Star size={size} className="fill-star text-star" />
        <span className="text-lg font-bold text-star">{rating || "—"}</span>
      </div>
    );
  }

  // 5-star display
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => i + 1).map(i => (
        <Star
          key={i}
          size={size}
          className={cn(
            "transition-colors",
            i <= rating ? "fill-star text-star" : "text-muted-foreground/30",
            !readonly && "cursor-pointer hover:text-star"
          )}
          onClick={() => !readonly && onChange?.(i === rating ? 0 : i)}
        />
      ))}
    </div>
  );
}

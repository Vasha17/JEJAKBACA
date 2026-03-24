import { cn } from "@/lib/utils";

type StoryType = "free" | "premium" | "exclusive";

const typeConfig: Record<
  StoryType,
  { label: string; className: string }
> = {
  free: {
    label: "Free",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  premium: {
    label: "Premium",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  exclusive: {
    label: "Exclusive",
    className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
};

export function TypeBadge({
  type,
  className,
}: {
  type: StoryType;
  className?: string;
}) {
  const config = typeConfig[type];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
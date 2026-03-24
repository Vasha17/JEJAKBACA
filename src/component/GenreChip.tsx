import { type FilterChip, type ChipState } from "@/hooks/useSearchFilters";

interface GenreChipProps {
  chip: FilterChip;
  onClick: () => void;
}

export function GenreChip({ chip, onClick }: GenreChipProps) {
  const base =
    "px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none transition-all duration-150 border";

  const stateStyles: Record<ChipState, string> = {
  none:
    "bg-background/40 text-foreground border border-white/30 hover:border-orange-400 transition-colors",

  include:
    "bg-orange-500/20 text-orange-300 border border-orange-400 shadow-md shadow-orange-500/20",

  exclude:
    "bg-red-500/40 text-red-300 border border-red-400 shadow-md shadow-red-500/20",
};


  return (
    <button className={`${base} ${stateStyles[chip.state]}`} onClick={onClick} type="button">
      {chip.label}
    </button>
  );
}

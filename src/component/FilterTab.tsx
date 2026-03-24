interface FilterTabProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

export function FilterTab({ label, count, active, onClick }: FilterTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap
        ${active
          ? "bg-secondary text-secondary-foreground"
          : "bg-chip text-chip-foreground hover:bg-muted"
        }
      `}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
          {count}
        </span>
      )}
    </button>
  );
}

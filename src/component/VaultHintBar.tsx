import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

export function VaultHintBarAnchor({ anchorRef }: { anchorRef: React.RefObject<HTMLDivElement> }) {
  return <div ref={anchorRef} className="w-full h-0 pointer-events-none" />;
}

export function VaultHintBar({
  anchorRef,
  onOpenVault,
}: {
  anchorRef: React.RefObject<HTMLDivElement>;
  onOpenVault: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {        
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorRef]);

  if (!visible) return null;

  return (
    <button
      onClick={onOpenVault}
      title="Hidden Vault"
      className="
        fixed z-30
        bottom-[5.5rem] right-4
        sm:bottom-6 sm:right-6
        flex items-center gap-2
        px-3 py-2 rounded-2xl
        bg-card border border-border shadow-xl
        text-muted-foreground hover:text-foreground hover:border-primary/50
        transition-all duration-200 animate-in slide-in-from-bottom-2
      "
    >
      <Lock size={16} className="text-primary shrink-0" />      
      <span className="hidden sm:inline text-xs font-semibold">Hidden Vault</span>
    </button>
  );
}
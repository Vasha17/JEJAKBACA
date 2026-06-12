import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-4 sm:bottom-8 sm:right-6 z-30 w-10 h-10 rounded-full bg-primary border border-border text-black hover:text-foreground hover:bg-muted hover:border-primary/40 shadow-lg transition-all duration-200 flex items-center justify-center active:scale-90"
    >
      <ChevronUp size={18} />
    </button>
  );
}
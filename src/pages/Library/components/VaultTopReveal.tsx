import { Lock } from "lucide-react";

interface VaultTopRevealProps {
  progress: number;
  triggered: boolean;
}

export function VaultTopReveal({ progress, triggered }: VaultTopRevealProps) {
  const translateY = -80 + progress * 80;
  const opacity = Math.min(1, progress * 1.5);
  return (
    <div
      className="fixed inset-x-0 z-50 flex flex-col items-center pointer-events-none"
      style={{
        top: 0,
        transform: `translateY(${translateY}px)`,
        opacity,
        transition: triggered ? "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
    >
      <div
        className="absolute top-0 inset-x-0 transition-all duration-300"
        style={{
          height: 120,
          background: triggered
            ? "radial-gradient(ellipse 70% 100px at 50% 0%, hsl(var(--primary) / 0.35), transparent)"
            : "radial-gradient(ellipse 70% 100px at 50% 0%, hsl(var(--primary) / 0.15), transparent)",
        }}
      />
      <div
        className="relative flex items-center gap-2.5 px-5 py-3 mt-2 rounded-2xl border backdrop-blur-md transition-all duration-200"
        style={{
          background: triggered ? "hsl(var(--primary) / 0.2)" : "hsl(var(--card) / 0.85)",
          borderColor: triggered ? "hsl(var(--primary) / 0.6)" : "hsl(var(--border) / 0.5)",
          boxShadow: triggered ? "0 8px 32px hsl(var(--primary) / 0.3)" : "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <Lock size={16} style={{ color: triggered ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
        <span
          className="text-[12px] font-bold tracking-wide transition-colors duration-200"
          style={{ color: triggered ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
        >
          {triggered ? "Release to open vault" : "Keep pulling…"}
        </span>
      </div>
    </div>
  );
}
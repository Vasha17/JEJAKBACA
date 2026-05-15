import { Toaster } from "@/component/ui/toaster";
import { Toaster as Sonner } from "@/component/ui/sonner";
import { TooltipProvider } from "@/component/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { StoryProvider } from "@/lib/StoryContext";
import { useState, useEffect, useRef } from "react";
import { useAuth, LoginPage } from "@/component/Auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/lib/SupabaseSync";
import { dexieAPI } from "@/lib/DexieDB";
import ErrorBoundary from "./ErrorBoundary";
import ListsIndex from "./pages/lists/Index";
import ListDetail from "./pages/lists/ListDetail";
import Library from "./pages/Library";
import StoryDetail from "./pages/StoryDetail/StoryDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function useOAuthRedirectHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token") && !hash.startsWith("#/")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(() => {
          window.location.hash = "/";
        });
      }
    }
  }, []);
}

// ─── KOMPONEN OFFLINE INDICATOR (DOT STYLE) ───
function OfflineIndicator() {
  const location = useLocation();
  const isStoryPage = location.pathname.startsWith("/story/");
  
  // Posisi dinamis: Di atas Continue Reading jika di StoryPage, default bawah kanan
  const positionClass = isStoryPage ? "bottom-20 right-4" : "bottom-4 right-4";

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [initialPending, setInitialPending] = useState<number | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  // Monitor Network Status
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Monitor Pending Items  
  useEffect(() => {
    const update = async () => {
      const count = await dexieAPI.getPendingCount();
      setPendingCount((prev) => {
        if (prev === 0 && count > 0) {          
          setInitialPending(count);
        } else if (prev !== null && count > prev) {          
          setInitialPending(count);
        }
        return count;
      });
    };
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Handle Auto-collapse logic
  useEffect(() => {    
    if (isOnline && pendingCount === 0) return; 
    
    setCollapsed(false);
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
        
    collapseTimer.current = setTimeout(() => setCollapsed(true), 30000);
    
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, [pendingCount, isOnline]);
  
  if (isOnline && pendingCount === 0) return null;

  const progress = initialPending && initialPending > 0
    ? Math.round(((initialPending - pendingCount) / initialPending) * 100)
    : 0;
      
  const isError = !isOnline;

  // 1. COLLAPSED STATE (DOT KECIL)
  if (collapsed) {
    return (
      <button
        onClick={() => {
          setVisible(false);
          setCollapsed(false);
          requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
          if (collapseTimer.current) clearTimeout(collapseTimer.current);
          collapseTimer.current = setTimeout(() => setCollapsed(true), 30000);
        }}
        className={`fixed z-[100] w-3 h-3 rounded-full shadow-lg ${positionClass}`}
        style={{
          background: isError ? "#ef4444" : "hsl(var(--primary))",
          boxShadow: `0 0 8px 2px ${isError ? "rgba(239,68,68,0.5)" : "rgba(246,168,35,0.5)"}`,
          transform: visible ? "scale(1)" : "scale(0)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.6), opacity 0.25s ease",
        }}
        aria-label="Show sync status"
      />
    );
  }
  
  // 2. EXPANDED STATE (DETAIL BAR)        
  const synced = initialPending ? initialPending - pendingCount : 0;
  const label = !isOnline
    ? `Offline${pendingCount > 0 ? ` · ${pendingCount} unsaved` : ""}`
    : pendingCount > 0 && synced === 0
    ? `${pendingCount} queued`
    : pendingCount > 0
    ? `Syncing ${synced}/${initialPending}`
    : "All synced ✓";
  const dotCls = !isOnline ? "bg-red-500" : "bg-amber-400";

  return (
    <button
      onClick={() => {
        setVisible(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCollapsed(true);
          });
        });
        if (collapseTimer.current) {
          clearTimeout(collapseTimer.current);
        }
      }}
      className={`
        fixed z-[100] overflow-hidden flex flex-col gap-1.5 rounded-2xl
        backdrop-blur-sm border border-white/[0.07] shadow-[0_8px_30px_rgba(0,0,0,0.35)] text-left
        ${positionClass}
      `}
      style={{
        background: "rgba(246, 168, 35, 0.15)",
        width: visible ? "170px" : "44px",
        paddingLeft: visible ? "16px" : "0px",
        paddingRight: visible ? "16px" : "0px",
        paddingTop: visible ? "10px" : "0px",
        paddingBottom: visible ? "10px" : "0px",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0) scale(1)"
          : "translateY(6px) scale(0.92)",
        transition: `
          width 420ms cubic-bezier(0.22, 1, 0.36, 1),
          padding 420ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 320ms cubic-bezier(0.34,1.56,0.64,1),
          opacity 220ms ease
        `,
      }}
    >
      {/* Row: dot + label */}
      <div
        className="flex items-center gap-2 min-w-0"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "translateX(0)"
            : "translateX(6px)",
          transition:
            "all 280ms cubic-bezier(0.22, 1, 0.36, 1) 120ms",
        }}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotCls} opacity-60`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotCls}`} />
        </span>
        <span className="text-[11px] font-medium text-white/80 whitespace-nowrap">{label}</span>
      </div>

      {/* Progress bar (hanya kalau online & ada initial) */}
      {isOnline && initialPending && initialPending > 0 && (
        <div
          className="w-full h-1 rounded-full bg-white/10 overflow-hidden"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? "scaleX(1)"
              : "scaleX(0.7)",
            transformOrigin: "left",
            transition:
              "all 350ms cubic-bezier(0.22,1,0.36,1) 180ms",
          }}
        >
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  useOAuthRedirectHandler();

  // ── Realtime subscription ──
  useRealtimeSync(user?.id);

  useEffect(() => {
    if (!user?.id) return;

    const handleOnline = async () => {
      console.log("🌐 Connection back, syncing...");
      try {
        await dexieAPI.sync(user.id);
        console.log("✅ Reconnect sync complete");
      } catch (err) {
        console.error("❌ Reconnect sync failed:", err);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user?.id]);

  const [skippedLogin, setSkippedLogin] = useState(
    () => localStorage.getItem("jejakbaca_skip_login") === "true"
  );

  useEffect(() => {
    localStorage.setItem("jejakbaca_skip_login", String(skippedLogin));
  }, [skippedLogin]);

  useEffect(() => {
    if (user) {
      localStorage.removeItem("jejakbaca_skip_login");
      setSkippedLogin(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user && !skippedLogin) {
    return <LoginPage onSkip={() => setSkippedLogin(true)} />;
  }

  return (
    <StoryProvider>
      <HashRouter>
        {/* OfflineIndicator dipindah ke sini agar bisa pakai useLocation */}
        <OfflineIndicator />
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/lists" element={<ListsIndex />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/story/:id" element={<StoryDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </StoryProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
import { Toaster } from "@/component/ui/toaster";
import { Toaster as Sonner } from "@/component/ui/sonner";
import { TooltipProvider } from "@/component/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { StoryProvider } from "@/lib/StoryContext";
import { useState, useEffect } from "react";
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
import { SpeedInsights } from "@vercel/speed-insights/react";

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

// ─── KOMPONEN OFFLINE INDICATOR ───
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

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

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await dexieAPI.getPendingCount();
      setPendingCount(count);
    };
    
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline && pendingCount === 0) return null; 
  return (
    <>
      {/* ── MOBILE ── */}
      <div className="sm:hidden fixed bottom-20 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full
          bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[11px] font-medium text-white/90 tracking-wide">
            {isOnline && pendingCount > 0
              ? `${pendingCount} Pending`
              : !isOnline && pendingCount > 0
              ? `Offline | ${pendingCount} Pending`
              : "Offline Mode"}
          </span>
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden sm:flex fixed top-2 left-1/2 -translate-x-1/2 z-[100] items-center gap-3 px-5 py-2.5 rounded-full
      bg-slate-950/90 backdrop-blur-md border-b border-white/10 shadow-xl">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-100">
            {isOnline && pendingCount > 0 ? "Pending Sync" : "Offline Mode"}
          </span>
          <span className="text-[10px] text-slate-400">
            {isOnline && pendingCount > 0
              ? `${pendingCount} pending`
              : !isOnline && pendingCount > 0
              ? `${pendingCount} pending`
              : "Changes saved locally"}
          </span>
        </div>
      </div>
    </>
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
        <OfflineIndicator />
        <AppContent />
      </ErrorBoundary>
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
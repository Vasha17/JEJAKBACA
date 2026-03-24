import { Toaster } from "@/component/ui/toaster";
import { Toaster as Sonner } from "@/component/ui/sonner";
import { TooltipProvider } from "@/component/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { StoryProvider, useStories } from "@/lib/StoryContext";
import { useState, useEffect } from "react";
import { useAuth, LoginPage } from "@/component/Auth";
import ErrorBoundary from "./ErrorBoundary";

import Library from "./pages/Library";
import StoryDetail from "./pages/StoryDetail/StoryDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  const [skippedLogin, setSkippedLogin] = useState(
    () => localStorage.getItem("jejakbaca_skip_login") === "true"
  );

  useEffect(() => {
    localStorage.setItem("jejakbaca_skip_login", String(skippedLogin));
  }, [skippedLogin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
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
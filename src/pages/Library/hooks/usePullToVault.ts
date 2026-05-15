import { useState, useRef, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface UsePullToVaultOptions {
  vaultUnlocked: boolean;
  onTrigger: () => void;
}

export function usePullToVault({ vaultUnlocked, onTrigger }: UsePullToVaultOptions) {
  const isMobile = useIsMobile();
  const SCROLL_THRESHOLD = isMobile ? 80 : 1500;
  const SCROLL_START_ZONE = 20;

  const [pullProgress, setPullProgress] = useState(0);
  const [pullTriggered, setPullTriggered] = useState(false);

  const pullTriggeredRef = useRef(false);
  const vaultUnlockedRef = useRef(vaultUnlocked);
  const wheelAccum = useRef(0);
  const wheelTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => { vaultUnlockedRef.current = vaultUnlocked; }, [vaultUnlocked]);
  useEffect(() => { pullTriggeredRef.current = pullTriggered; }, [pullTriggered]);

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overscrollBehavior = "none";
    return () => { document.body.style.overscrollBehavior = ""; };
  }, [isMobile]);

  const setPull = useCallback((progress: number) => {
    const triggered = progress >= 1;
    setPullProgress(progress);
    setPullTriggered(triggered);
    pullTriggeredRef.current = triggered;
  }, []);

  const resetPull = useCallback(() => {
    setPullProgress(0);
    setPullTriggered(false);
    pullTriggeredRef.current = false;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (vaultUnlockedRef.current) return;
    if (window.scrollY > SCROLL_START_ZONE) { wheelAccum.current = 0; return; }
    if (e.deltaY < 0) {
      wheelAccum.current += Math.abs(e.deltaY);
      const progress = Math.min(1, wheelAccum.current / SCROLL_THRESHOLD);
      setPull(progress);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        if (pullTriggeredRef.current) onTrigger();
        wheelAccum.current = 0;
        resetPull();
      }, 400);
    } else {
      wheelAccum.current = 0;
      resetPull();
      if (wheelTimer.current) { clearTimeout(wheelTimer.current); wheelTimer.current = null; }
    }
  }, [setPull, resetPull, SCROLL_THRESHOLD, SCROLL_START_ZONE, onTrigger]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (vaultUnlockedRef.current) return;
    if (window.scrollY > SCROLL_START_ZONE) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = false;
  }, [SCROLL_START_ZONE]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (vaultUnlockedRef.current) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY.current;
    if (window.scrollY > SCROLL_START_ZONE) {
      if (isPulling.current) { isPulling.current = false; resetPull(); }
      return;
    }
    if (delta > 10) {
      isPulling.current = true;
      const progress = Math.min(1, (delta - 10) / SCROLL_THRESHOLD);
      setPull(progress);
    } else if (delta <= 0 && isPulling.current) {
      isPulling.current = false;
      resetPull();
    }
  }, [setPull, resetPull, SCROLL_START_ZONE, SCROLL_THRESHOLD]);

  const handleTouchEnd = useCallback(() => {
    if (vaultUnlockedRef.current) return;
    if (isPulling.current && pullTriggeredRef.current) onTrigger();
    isPulling.current = false;
    resetPull();
  }, [resetPull, onTrigger]);

  useEffect(() => {
    if (isMobile) return;
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
    };
  }, [isMobile, handleWheel]);

  return { pullProgress, pullTriggered, handleTouchStart, handleTouchMove, handleTouchEnd };
}
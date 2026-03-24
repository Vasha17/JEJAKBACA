import { useState, useRef } from "react";

const PULL_THRESHOLD = 70;

export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDelta, setPullDelta]       = useState(0);
  const touchStartY                     = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY.current || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 5) setPullDelta(Math.min(delta * 0.45, PULL_THRESHOLD + 24));
  };
  const handleTouchEnd = () => {
    if (pullDelta >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDelta(PULL_THRESHOLD);
      setTimeout(() => { setIsRefreshing(false); setPullDelta(0); touchStartY.current = 0; }, 1200);
    } else {
      setPullDelta(0); touchStartY.current = 0;
    }
  };

  return { isRefreshing, pullDelta, PULL_THRESHOLD, handleTouchStart, handleTouchMove, handleTouchEnd };
}
import React from "react";
import { STATUS_OPTIONS } from "../constants";

export const getStatusInfo = (s: string) =>
  STATUS_OPTIONS.find(o => o.value === s) ?? STATUS_OPTIONS[3];

export const highlightText = (text: string, query: string) => {
  if (!query.trim()) return React.createElement(React.Fragment, null, text);
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return React.createElement(
    React.Fragment,
    null,
    ...parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase()
        ? React.createElement("span", { key: i, className: "text-primary font-bold bg-primary/10 rounded px-0.5" }, p)
        : p
    )
  );
};

export function pickHeroStory(stories: any[]): any | null {
  if (!stories || stories.length === 0) return null;
  const candidates = stories.filter(
    (s: any) => s.status === "reading" || s.status === "re-reading"
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const sorted = [...candidates].sort((a: any, b: any) => {
    const tA = new Date(a.chapterUpdatedAt || a.updatedAt || 0).getTime();
    const tB = new Date(b.chapterUpdatedAt || b.updatedAt || 0).getTime();
    return tA - tB;
  });
  const LAST_KEY = "jejakbaca_hero_last_id";
  const lastId   = localStorage.getItem(LAST_KEY) ?? "";
  const lastIdx  = sorted.findIndex(s => s.id === lastId);
  const halfLen  = Math.max(1, Math.floor(sorted.length / 2));
  const longUnread = sorted.slice(0, halfLen).filter((_, i) => i !== lastIdx);
  let nextIdx: number;
  if (longUnread.length > 0 && Math.random() < 0.4) {
    nextIdx = sorted.indexOf(longUnread[Math.floor(Math.random() * longUnread.length)]);
  } else {
    nextIdx = (lastIdx + 1) % sorted.length;
  }
  const chosen = sorted[nextIdx] ?? sorted[0];
  localStorage.setItem(LAST_KEY, chosen.id);
  return chosen;
}
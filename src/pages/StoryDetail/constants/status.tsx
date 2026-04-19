import { StoryStatus } from "@/lib/types";
import { Sword, Users, Flower2, Globe, HelpCircle } from "lucide-react"; // <--- Tambahkan import ini

export const STATUS_OPTIONS: { value: StoryStatus; label: string; color: string }[] = [
  { value: "reading",      label: "On-going",     color: "#22c55f" },
  { value: "completed",    label: "Completed",    color: "#3b82f6" },
  { value: "on-hold",      label: "On-hold",      color: "#eab308" },
  { value: "hiatus",       label: "Hiatus",       color: "#f97316" },
  { value: "dropped",      label: "Dropped",      color: "#ef4444" },
  { value: "plan-to-read", label: "Plan to Read", color: "#6b7280" },
  { value: "re-reading",   label: "Re-reading",   color: "#a855f7" },
];

export const statusColor = (s: string) =>
  STATUS_OPTIONS.find(o => o.value === s)?.color ?? "#6b7280";

export type RelationType = "prequel" | "sequel" | "spin-off" | "related";
export type RelationMode = "local" | "mention";

export const REL_LABELS: Record<RelationType, string> = {
  prequel: "Prequel", sequel: "Sequel", "spin-off": "Spin-off", related: "Related",
};

export const REL_COLORS: Record<RelationType, string> = {
  prequel:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  sequel:     "bg-green-500/10 text-green-400 border-green-500/20",
  "spin-off": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  related:    "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export const ARC_COLORS = [
  "#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7",
  "#06b6d4","#f97316","#ec4899","#14b8a6","#8b5cf6",
];

export const ARC_COLOR_PALETTES = {
  theme:    ["var(--color-primary)", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e"],
  colorful: ["#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7","#06b6d4","#f97316","#ec4899","#14b8a6","#8b5cf6"],
  mono:     ["#f8fafc","#e2e8f0","#94a3b8","#64748b","#475569","#334155","#1e293b","#0f172a","#cbd5e1","#cbd5e1"],
} as const;

export type ArcColorPalette = keyof typeof ARC_COLOR_PALETTES;

export const DEMOGRAPHIC_INFO: Record<string, string> = {
  Josei:   "bg-pink-500/15 text-pink-400 border-pink-500/25",
  Seinen:  "bg-blue-500/15 text-blue-400 border-blue-500/25",
  Shoujo:  "bg-rose-500/15 text-rose-400 border-rose-500/25",
  Shounen: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Unknown: "bg-gray-500/15 text-gray-400 border-gray-500/25",
};

export const DEMOGRAPHICS = ["Josei", "Seinen", "Shoujo", "Shounen"];

export const DEMOGRAPHIC_ICONS: Record<string, React.ReactNode> = {
  Josei:   <Globe className="w-3.5 h-3.5" />,     
  Seinen:  <Users className="w-3.5 h-3.5" />,    
  Shoujo:  <Flower2 className="w-3.5 h-3.5" />,  
  Shounen: <Sword className="w-3.5 h-3.5" />,    
  Unknown: <HelpCircle className="w-3.5 h-3.5" />,
};
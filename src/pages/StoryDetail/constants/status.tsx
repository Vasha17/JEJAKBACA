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

export type RelationType =
  | "sequel" | "prequel" | "spin-off" | "side-story"
  | "parallel-story" | "alternate-universe" | "adaptation"
  | "crossover" | "related";
export type RelationMode = "local" | "mention";

export const REL_TYPE_OPTIONS = [
  { value: "sequel",             ribbon: "SEQUEL",       label: "Sequel",             description: "Continues the story." },
  { value: "prequel",            ribbon: "PREQUEL",      label: "Prequel",            description: "Comes before the story." },
  { value: "spin-off",           ribbon: "SPIN-OFF",     label: "Spin-off",           description: "Branches off, own path." },
  { value: "side-story",         ribbon: "SIDE STORY",   label: "Side Story",         description: "Extra bit, same world." },
  { value: "parallel-story",     ribbon: "PARALLEL",     label: "Parallel Story",     description: "Same time, other view." },
  { value: "alternate-universe", ribbon: "ALT. UNIVERSE",label: "Alternate Universe", description: "Alt timeline or world." },
  { value: "adaptation",         ribbon: "ADAPTATION",   label: "Adaptation",         description: "Same story, other format." },
  { value: "crossover",          ribbon: "CROSSOVER",    label: "Crossover",          description: "Mixes with another story." },
  { value: "related",            ribbon: "RELATED",      label: "Related",            description: "Connected some other way." },
] as const;

export const REL_LABELS: Record<RelationType, string> = Object.fromEntries(
  REL_TYPE_OPTIONS.map(o => [o.value, o.ribbon])
) as Record<RelationType, string>;

export const REL_COLORS: Record<RelationType, string> = {
  sequel:             "bg-blue-500/10 text-blue-400 border-blue-500/20",
  prequel:            "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "spin-off":         "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "side-story":       "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "parallel-story":   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "alternate-universe": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  adaptation:         "bg-lime-500/10 text-lime-400 border-lime-500/20",
  crossover:          "bg-orange-500/10 text-orange-400 border-orange-500/20",
  related:            "bg-gray-500/10 text-gray-400 border-gray-500/20",
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
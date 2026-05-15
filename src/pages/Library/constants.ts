import { Play, CheckCircle2, PauseCircle, BookMarked, X, Layers, Clock, PlusCircle, Star, ArrowUpDown, Timer } from "lucide-react";
import React from "react";

export const STATUS_OPTIONS = [
  { value: "reading",       label: "Reading",      icon: React.createElement(Play, { size: 13 }),         color: "text-green-400" },
  { value: "completed",     label: "Completed",    icon: React.createElement(CheckCircle2, { size: 13 }), color: "text-blue-400" },
  { value: "on-hold",       label: "On Hold",      icon: React.createElement(PauseCircle, { size: 13 }),  color: "text-yellow-400" },
  { value: "hiatus",        label: "Hiatus",       icon: React.createElement(BookMarked, { size: 13 }),   color: "text-orange-400" },
  { value: "plan-to-read",  label: "Plan to Read", icon: React.createElement(BookMarked, { size: 13 }),   color: "text-purple-400" },
  { value: "dropped",       label: "Dropped",      icon: React.createElement(X, { size: 13 }),            color: "text-red-400" },
  { value: "re-reading",    label: "Re-reading",   icon: React.createElement(Layers, { size: 13 }),       color: "text-pink-400" },
];

export const SORT_OPTIONS = [
  { value: "recent", label: "Recently Updated", icon: React.createElement(Clock, { size: 13, className: "text-muted-foreground" }) },
  { value: "added",  label: "Recently Added",   icon: React.createElement(PlusCircle, { size: 13, className: "text-muted-foreground" }) },
  { value: "rating", label: "Highest Rating",   icon: React.createElement(Star, { size: 13, className: "text-muted-foreground" }) },
  { value: "title",  label: "Title A–Z",        icon: React.createElement(ArrowUpDown, { size: 13, className: "text-muted-foreground" }) },
  { value: "unread", label: "Long Unread",      icon: React.createElement(Timer, { size: 13, className: "text-muted-foreground" }) },
];

export const STATUS_COLORS: Record<string, string> = {
  "reading":       "#22c55e",
  "completed":     "#3b82f6",
  "on-hold":       "#eab308",
  "hiatus":        "#f97316",
  "dropped":       "#ef4444",
  "plan-to-read":  "#6b7280",
  "re-reading":    "#a855f7",
};

export const FORMAT_MAP: Record<string, string> = {
  JP: "Manga", KR: "Manhwa", CN: "Manhua", TW: "Manhua", ID: "Komik", US: "Comic",
};
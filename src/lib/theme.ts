export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  muted: string;
  mutedForeground: string; 
  card: string;
  border: string;
}

export interface AppTheme {
  id: string;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
  isCustom?: boolean;
}

function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslFromHex(hex: string): string {
  return hexToHSL(hex);
}

// Preset themes
export const PRESET_THEMES: AppTheme[] = [
  {
    id: "default",
    name: "Default",
    light: {
      background: "#fefcf5",
      foreground: "#1a1208",
      primary: "#f6a823",
      primaryForeground: "#1a1208",
      secondary: "#fef3cd",
      accent: "#fff8e1",
      muted: "#faf5eb",
      card: "#ffffff",
      border: "#e8dcc8",
      mutedForeground: "#9ca3af"
    },
    dark: {
      background: "#0e0e0e",
      foreground: "#f0e6d0",
      primary: "#f6a823",
      primaryForeground: "#1a1208",
      secondary: "#1a1a1a",
      accent: "#242424",
      muted: "#111111",
      card: "#161616",
      border: "#2a2a2a",
      mutedForeground: "#6b7280",  
    },
  },
  {
    id: "mono",
    name: "Mono",
    light: {
      background: "#f8f8f8",
      foreground: "#1a1a1a",
      primary: "#555555",
      primaryForeground: "#ffffff",
      secondary: "#e5e5e5",
      accent: "#ebebeb",
      muted: "#f0f0f0",
      mutedForeground: "#737373",
      card: "#ffffff",
      border: "#d4d4d4",
    },
    dark: {
      background: "#111111",
      foreground: "#e0e0e0",
      primary: "#888888",
      primaryForeground: "#ffffff",
      secondary: "#222222",
      accent: "#2a2a2a",
      muted: "#1a1a1a",
      mutedForeground: "#525252",
      card: "#161616",
      border: "#333333",
    },
  },
  {
    id: "azure",
    name: "Azure",
    light: {
      background: "#f0f4ff",
      foreground: "#1e293b",
      primary: "#3b82f6",
      primaryForeground: "#ffffff",
      secondary: "#dbeafe",
      accent: "#e0f2fe",
      muted: "#f1f5f9",
      mutedForeground: "#94a3b8",
      card: "#ffffff",
      border: "#cbd5e1",
    },
    dark: {
      background: "#0c1222",
      foreground: "#e2e8f0",
      primary: "#3b82f6",
      primaryForeground: "#ffffff",
      secondary: "#1e293b",
      accent: "#1e3a5f",
      muted: "#0f172a",
      mutedForeground: "#475569",
      card: "#111827",
      border: "#1e3050",
    },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    light: {
      background: "#f5f5f5",
      foreground: "#171717",
      primary: "#525252",
      primaryForeground: "#ffffff",
      secondary: "#e5e5e5",
      accent: "#d4d4d4",
      muted: "#eeeeee",
      mutedForeground: "#737373",
      card: "#fafafa",
      border: "#cccccc",
    },
    dark: {
      background: "#171717",
      foreground: "#d4d4d4",
      primary: "#737373",
      primaryForeground: "#ffffff",
      secondary: "#262626",
      accent: "#2e2e2e",
      muted: "#1f1f1f",
      mutedForeground: "#525252",
      card: "#1c1c1c",
      border: "#3a3a3a",
    },
  },
  {
    id: "indigo",
    name: "Indigo",
    light: {
      background: "#f8fafc",
      foreground: "#0f172a",
      primary: "#2563eb",
      primaryForeground: "#ffffff",
      secondary: "#e2e8f0",
      accent: "#dbeafe",
      muted: "#f1f5f9",
      mutedForeground: "#64748b",
      card: "#ffffff",
      border: "#cbd5e1",
    },
    dark: {
      background: "#0f172a",
      foreground: "#e2e8f0",
      primary: "#2563eb",
      primaryForeground: "#ffffff",
      secondary: "#1e293b",
      accent: "#1e3a5f",
      muted: "#0f172a",
      mutedForeground: "#475569",
      card: "#1e293b",
      border: "#334155",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    light: {
      background: "#f0fdf4",
      foreground: "#14532d",
      primary: "#10b981",
      primaryForeground: "#ffffff",
      secondary: "#d1fae5",
      accent: "#ecfdf5",
      muted: "#f0fdf4",
      mutedForeground: "#4b7a5f",
      card: "#ffffff",
      border: "#a7f3d0",
    },
    dark: {
      background: "#0a1f13",
      foreground: "#d1fae5",
      primary: "#10b981",
      primaryForeground: "#ffffff",
      secondary: "#14332a",
      accent: "#1a4035",
      muted: "#0f2a1c",
      mutedForeground: "#6b7280",
      card: "#0d2318",
      border: "#1e5c42",
    },
  },
  {
    id: "amethyst",
    name: "Amethyst",
    light: {
      background: "#f5f3ff",
      foreground: "#2e1065",
      primary: "#8b5cf6",
      primaryForeground: "#ffffff",
      secondary: "#ede9fe",
      accent: "#f5f3ff",
      muted: "#f1f0fb",
      mutedForeground: "#5b21b6",
      card: "#ffffff",
      border: "#ddd6fe",
    },
    dark: {
      background: "#0f0a1e",
      foreground: "#e8e0f0",
      primary: "#8b5cf6",
      primaryForeground: "#ffffff",
      secondary: "#1e1533",
      accent: "#2a1f42",
      muted: "#1a1229",
      mutedForeground: "#a78bfa",
      card: "#16101f",
      border: "#2e2545",
    },
  },
  {
    id: "teal",
    name: "Teal",
    light: {
      background: "#f0fdfa",
      foreground: "#134e4a",
      primary: "#0891b2",
      primaryForeground: "#ffffff",
      secondary: "#ccfbf1",
      accent: "#e0f7fa",
      muted: "#f0fdfa",
      mutedForeground: "#115e59",
      card: "#ffffff",
      border: "#99f6e4",
    },
    dark: {
      background: "#0a1a1e",
      foreground: "#ccfbf1",
      primary: "#0891b2",
      primaryForeground: "#ffffff",
      secondary: "#133038",
      accent: "#1a3d45",
      muted: "#0e262e",
      mutedForeground: "#67e8f9",
      card: "#0c1f26",
      border: "#1e5060",
    },
  },
  {
    id: "amber",
    name: "Amber",
    light: {
      background: "#fff7ed",
      foreground: "#431407",
      primary: "#ea580c",
      primaryForeground: "#ffffff",
      secondary: "#fed7aa",
      accent: "#ffedd5",
      muted: "#fff7ed",
      mutedForeground: "#7c2d12",
      card: "#ffffff",
      border: "#fdba74",
    },
    dark: {
      background: "#1a0f05",
      foreground: "#fed7aa",
      primary: "#ea580c",
      primaryForeground: "#ffffff",
      secondary: "#2e1a0a",
      accent: "#3d2410",
      muted: "#221408",
      mutedForeground: "#fdba74",
      card: "#1e1107",
      border: "#5c3415",
    },
  },
  {
    id: "sorbet",
    name: "Sorbet",
    light: {
      background: "#fff7f9",
      foreground: "#262820",
      primary: "#838F58",
      primaryForeground: "#ffffff",
      secondary: "#f3d4da",
      accent: "#F9D1D9",
      muted: "#f6e7ea",
      mutedForeground: "#5c6048",
      card: "#ffffff",
      border: "#e7c1c8",
    },
    dark: {
      background: "#15170f",
      foreground: "#f3d4da",
      primary: "#9aa86a",
      primaryForeground: "#ffffff",
      secondary: "#232617",
      accent: "#3a2e34",
      muted: "#1c1f14",
      mutedForeground: "#d1d4b8",
      card: "#1a1c12",
      border: "#3e4230",
    },
  },
  {
    id: "blush",
    name: "Blush",
    light: {
      background: "#fff7fb",
      foreground: "#4a044e",
      primary: "#f7a0b8",
      primaryForeground: "#ffffff",
      secondary: "#fae9d7",
      accent: "#fbb6c4",
      muted: "#fff0f4",
      mutedForeground: "#701a75",
      card: "#ffffff",
      border: "#f7c7d1",
    },
    dark: {
      background: "#1a0f14",
      foreground: "#ffffff",
      primary: "#f7a0b8",
      primaryForeground: "#ffffff",
      secondary: "#2a1820",
      accent: "#3b2028",
      muted: "#22131a",
      mutedForeground: "#f9a8d4",
      card: "#1f1218",
      border: "#4c2c36",
    },
  },
  {
    id: "mocha",
    name: "Mocha",
    light: {
      background: "#f6f3ef",
      foreground: "#261e18",
      primary: "#5A493B",
      primaryForeground: "#ffffff",
      secondary: "#A89982",
      accent: "#C8BDB1",
      muted: "#eee8e1",
      mutedForeground: "#44403c",
      card: "#ffffff",
      border: "#d6ccc1",
    },
    dark: {
      background: "#14110e",
      foreground: "#C8BDB1",
      primary: "#7a6655",
      primaryForeground: "#ffffff",
      secondary: "#211b16",
      accent: "#2e2620",
      muted: "#1a1612",
      mutedForeground: "#d6d3d1",
      card: "#181410",
      border: "#3a312a",
    },
  },
  {
    id: "oak",
    name: "Oak",
    light: {
      background: "#f5f2ef",
      foreground: "#1c1512",
      primary: "#60544D",
      primaryForeground: "#ffffff",
      secondary: "#968473",
      accent: "#AAA297",
      muted: "#eee9e4",
      mutedForeground: "#44403c",
      card: "#ffffff",
      border: "#d8d1c8",
    },
    dark: {
      background: "#141210",
      foreground: "#d8d1c8",
      primary: "#7a6d63",
      primaryForeground: "#ffffff",
      secondary: "#211d19",
      accent: "#302923",
      muted: "#1b1714",
      mutedForeground: "#a8a29e",
      card: "#181512",
      border: "#3a332d",
    },
  },
  // UPDATED THEMES
  {
    id: "twilight",
    name: "Twilight",
    light: {
      background: "#f3e8ff",
      foreground: "#043676",
      primary: "#db2777",
      primaryForeground: "#ffffff",
      secondary: "#e9d5ff",
      accent: "#fbcfe8",
      muted: "#fdf4ff",
      mutedForeground: "#701a75",
      card: "#ffffff",
      border: "#e9d5ff",
    },
    dark: {
      background: "#1e1033",
      foreground: "#f5d0fe",
      primary: "#f472b6",
      primaryForeground: "#ffffff",
      secondary: "#2e1065",
      accent: "#4c1d95",
      muted: "#160826",
      mutedForeground: "#d8b4fe",
      card: "#241038",
      border: "#581c87",
    },
  },  
  {
    id: "crimson",
    name: "Crimson",
    light: {
      background: "#fff1f2",
      foreground: "#000000",
      primary: "#970000",
      primaryForeground: "#ffffff",
      secondary: "#fecdd3",
      accent: "#ffe4e6",
      muted: "#fff5f5",
      mutedForeground: "#7f1d1d",
      card: "#ffffff",
      border: "#fda4af",
    },
    dark: {
      background: "#050000",
      foreground: "#ffffff",
      primary: "#dc2626",
      primaryForeground: "#ffffff",
      secondary: "#450a0a",
      accent: "#7f1d1d",
      muted: "#020000",
      mutedForeground: "#fca5a5",
      card: "#0a0000",
      border: "#991b1b",
    },
  },  
  {
    id: "moonstone",
    name: "Moonstone",
    light: {
      background: "#f8fafc",
      foreground: "#334155",
      primary: "#d2c296", 
      primaryForeground: "#1a1500", 
      secondary: "#e2e8f0",
      accent: "#e2e8f0",
      muted: "#f1f5f9",
      mutedForeground: "#475569",
      card: "#ffffff",
      border: "#cbd5e1",
    },
    dark: {
      background: "#0f172a",
      foreground: "#e2e8f0",
      primary: "#d2c296", 
      primaryForeground: "#1a1500",
      secondary: "#1e293b",
      accent: "#1e293b",
      muted: "#020617",
      mutedForeground: "#64748b",
      card: "#1e293b",
      border: "#334155",
    },
  },
];

const STORAGE_KEY_THEME = "jejak-theme-id";
const STORAGE_KEY_CUSTOM = "jejak-custom-themes";
const STORAGE_KEY_MODE = "jejak-theme-mode";

export function getStoredMode(): "light" | "dark" {
  return (localStorage.getItem(STORAGE_KEY_MODE) as "light" | "dark") || "dark";
}

export function setStoredMode(mode: "light" | "dark") {
  localStorage.setItem(STORAGE_KEY_MODE, mode);
}

export function getStoredThemeId(): string {
  return localStorage.getItem(STORAGE_KEY_THEME) || "default";
}

export function setStoredThemeId(id: string) {
  localStorage.setItem(STORAGE_KEY_THEME, id);
}

export function getCustomThemes(): AppTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: AppTheme[]) {
  localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(themes));
}

export function getAllThemes(): AppTheme[] {
  return [...PRESET_THEMES, ...getCustomThemes()];
}

export function applyTheme(theme: AppTheme, mode: "light" | "dark") {
  const colors = mode === "dark" ? theme.dark : theme.light;
  const root = document.documentElement;

  root.style.setProperty("--background", hslFromHex(colors.background));
  root.style.setProperty("--foreground", hslFromHex(colors.foreground));
  root.style.setProperty("--primary", hslFromHex(colors.primary));
  root.style.setProperty("--primary-foreground", hslFromHex(colors.primaryForeground));
  root.style.setProperty("--secondary", hslFromHex(colors.secondary));
  root.style.setProperty("--secondary-foreground", hslFromHex(colors.foreground));
  root.style.setProperty("--accent", hslFromHex(colors.accent));
  root.style.setProperty("--accent-foreground", hslFromHex(colors.foreground));
  root.style.setProperty("--muted", hslFromHex(colors.muted));
  root.style.setProperty("--muted-foreground", hslFromHex(colors.mutedForeground)); 
  root.style.setProperty("--card", hslFromHex(colors.card));
  root.style.setProperty("--card-foreground", hslFromHex(colors.foreground));
  root.style.setProperty("--popover", hslFromHex(colors.card));
  root.style.setProperty("--popover-foreground", hslFromHex(colors.foreground));
  root.style.setProperty("--border", hslFromHex(colors.border));
  root.style.setProperty("--input", hslFromHex(colors.border));

  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

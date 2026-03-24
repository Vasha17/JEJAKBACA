import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  AppTheme, getAllThemes, getStoredMode, getStoredThemeId,
  setStoredMode, setStoredThemeId, applyTheme, getCustomThemes, saveCustomThemes,
} from "@/lib/theme";

interface ThemeContextType {
  mode: "light" | "dark";
  setMode: (m: "light" | "dark") => void;
  currentThemeId: string;
  setCurrentThemeId: (id: string) => void;
  allThemes: AppTheme[];
  customThemes: AppTheme[];
  addCustomTheme: (t: AppTheme) => void;
  deleteCustomTheme: (id: string) => void;
  currentTheme: AppTheme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<"light" | "dark">(getStoredMode);
  const [currentThemeId, setThemeIdState] = useState(getStoredThemeId);
  const [customThemes, setCustomThemes] = useState<AppTheme[]>(getCustomThemes);

  const allThemes = [...getAllThemes().filter(t => !t.isCustom), ...customThemes];
  const currentTheme = allThemes.find(t => t.id === currentThemeId) || allThemes[0];

  const setMode = (m: "light" | "dark") => {
    setModeState(m);
    setStoredMode(m);
  };

  const setCurrentThemeId = (id: string) => {
    setThemeIdState(id);
    setStoredThemeId(id);
  };

  const addCustomTheme = (t: AppTheme) => {
    const updated = [...customThemes, { ...t, isCustom: true }];
    setCustomThemes(updated);
    saveCustomThemes(updated);
  };

  const deleteCustomTheme = (id: string) => {
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    saveCustomThemes(updated);
    if (currentThemeId === id) setCurrentThemeId("default");
  };

  useEffect(() => {
    applyTheme(currentTheme, mode);
  }, [currentTheme, mode]);

  return (
    <ThemeContext.Provider value={{
      mode, setMode, currentThemeId, setCurrentThemeId,
      allThemes, customThemes, addCustomTheme, deleteCustomTheme, currentTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

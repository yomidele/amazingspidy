import { useState, useEffect } from "react";

type DashboardThemeMode = "dark" | "light";

const STORAGE_KEY = "amana_dashboard_theme";

export const useDashboardTheme = () => {
  const [mode, setModeState] = useState<DashboardThemeMode>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setModeState(stored);
    }
  }, []);

  const setMode = (m: DashboardThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  };

  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  const isDark = mode === "dark";

  return { mode, isDark, toggleMode, setMode };
};

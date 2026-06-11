import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { darkColors, lightColors, ThemeColors } from "@/src/theme";
import { storage } from "@/src/utils/storage";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    storage.getItem<ThemeMode>("theme_mode", "light").then((saved) => {
      if (saved === "dark") setMode("dark");
    });
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      storage.setItem("theme_mode", next);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      mode,
      colors: mode === "dark" ? darkColors : lightColors,
      toggleMode,
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

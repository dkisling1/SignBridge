import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "signbridge_theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "system",
  isDark: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeModeState(saved);
        if (saved !== "system") {
          Appearance.setColorScheme(saved);
        } else {
          Appearance.setColorScheme(null);
        }
      }
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const isDark =
    themeMode === "dark" ||
    (themeMode === "system" && systemScheme === "dark");

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
    if (mode === "system") {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(mode);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? "light" : "dark");
  }, [isDark, setThemeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

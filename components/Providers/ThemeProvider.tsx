"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ConfigProvider, App, theme } from "antd";

type ThemeMode = "light" | "dark";

interface ThemeContextProps {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  mode: "light",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem("theme-mode") as ThemeMode | null;
    if (savedMode) {
      setMode(savedMode);
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    localStorage.setItem("theme-mode", newMode);
    if (newMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#1890ff",
            borderRadius: 8,
            fontFamily: "var(--font-geist-sans), sans-serif",
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

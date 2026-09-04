import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const getInitial = (): Theme => {
  const stored = localStorage.getItem("skillswap-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === "undefined" ? "light" : getInitial()
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("skillswap-theme", theme);
  }, [theme]);

  return { theme, setTheme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
};

export const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="rounded-full"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};

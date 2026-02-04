import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type HomepageTheme = "classic" | "modern";

interface HomepageThemeContextType {
  theme: HomepageTheme;
  setTheme: (theme: HomepageTheme) => void;
  toggleTheme: () => void;
  showTutorial: boolean;
  dismissTutorial: () => void;
}

const HomepageThemeContext = createContext<HomepageThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "amana_homepage_theme";
const TUTORIAL_STORAGE_KEY = "amana_homepage_theme_tutorial_seen";

export const HomepageThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<HomepageTheme>("classic");
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "classic" || storedTheme === "modern") {
      setThemeState(storedTheme);
    }

    // Show tutorial if never seen before
    const tutorialSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!tutorialSeen) {
      // Delay showing tutorial to let page load
      const timer = setTimeout(() => setShowTutorial(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const setTheme = (newTheme: HomepageTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "classic" ? "modern" : "classic";
    setTheme(newTheme);
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  };

  return (
    <HomepageThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        showTutorial,
        dismissTutorial,
      }}
    >
      {children}
    </HomepageThemeContext.Provider>
  );
};

export const useHomepageTheme = () => {
  const context = useContext(HomepageThemeContext);
  if (!context) {
    // Return default values when used outside provider
    return {
      theme: "classic" as const,
      setTheme: () => {},
      toggleTheme: () => {},
      showTutorial: false,
      dismissTutorial: () => {},
    };
  }
  return context;
};

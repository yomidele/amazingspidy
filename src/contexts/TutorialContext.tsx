import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TutorialContextType {
  tutorialEnabled: boolean;
  setTutorialEnabled: (enabled: boolean) => void;
  showTutorialOnFirstLoad: boolean;
  setShowTutorialOnFirstLoad: (show: boolean) => void;
  hasSeenTutorial: boolean;
  markTutorialAsSeen: () => void;
  resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = "amana_admin_tutorial_settings";

interface TutorialSettings {
  enabled: boolean;
  showOnFirstLoad: boolean;
  hasSeen: boolean;
}

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [tutorialEnabled, setTutorialEnabled] = useState(true);
  const [showTutorialOnFirstLoad, setShowTutorialOnFirstLoad] = useState(true);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (stored) {
      try {
        const settings: TutorialSettings = JSON.parse(stored);
        setTutorialEnabled(settings.enabled);
        setShowTutorialOnFirstLoad(settings.showOnFirstLoad);
        setHasSeenTutorial(settings.hasSeen);
      } catch (e) {
        console.error("Failed to parse tutorial settings");
      }
    }
  }, []);

  const saveSettings = (settings: Partial<TutorialSettings>) => {
    const current = {
      enabled: tutorialEnabled,
      showOnFirstLoad: showTutorialOnFirstLoad,
      hasSeen: hasSeenTutorial,
      ...settings,
    };
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(current));
  };

  const handleSetTutorialEnabled = (enabled: boolean) => {
    setTutorialEnabled(enabled);
    saveSettings({ enabled });
  };

  const handleSetShowOnFirstLoad = (show: boolean) => {
    setShowTutorialOnFirstLoad(show);
    saveSettings({ showOnFirstLoad: show });
  };

  const markTutorialAsSeen = () => {
    setHasSeenTutorial(true);
    saveSettings({ hasSeen: true });
  };

  const resetTutorial = () => {
    setHasSeenTutorial(false);
    saveSettings({ hasSeen: false });
  };

  return (
    <TutorialContext.Provider
      value={{
        tutorialEnabled,
        setTutorialEnabled: handleSetTutorialEnabled,
        showTutorialOnFirstLoad,
        setShowTutorialOnFirstLoad: handleSetShowOnFirstLoad,
        hasSeenTutorial,
        markTutorialAsSeen,
        resetTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
};

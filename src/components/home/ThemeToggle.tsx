import { motion, AnimatePresence } from "framer-motion";
import { Palette, X } from "lucide-react";
import { useHomepageTheme } from "@/contexts/HomepageThemeContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ThemeToggle = () => {
  const { theme, toggleTheme, showTutorial, dismissTutorial } = useHomepageTheme();

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative h-9 w-9 rounded-lg hover:bg-accent"
            aria-label="Toggle homepage theme"
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Palette className="h-5 w-5 text-foreground/80" />
            </motion.div>
            
            {/* Theme indicator dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                theme === "classic" ? "bg-travel" : "bg-contribution"
              }`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{theme === "classic" ? "Switch to Modern theme" : "Switch to Classic theme"}</p>
        </TooltipContent>
      </Tooltip>

      {/* Tutorial Popup */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-72 p-4 rounded-xl bg-card border border-border shadow-xl z-50"
          >
            <button
              onClick={dismissTutorial}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-accent transition-colors"
              aria-label="Dismiss tutorial"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-travel/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-travel" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Theme Toggle</h4>
                <p className="text-xs text-muted-foreground">Personalize your view</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              Click this button to switch between <span className="font-medium text-travel">Classic</span> (clean white) and <span className="font-medium text-contribution">Modern</span> (dark gradient) homepage styles.
            </p>
            
            <div className="flex gap-2">
              <div className="flex-1 p-2 rounded-lg bg-background border border-border text-center">
                <div className="w-full h-6 rounded bg-gradient-to-r from-muted to-background mb-1" />
                <span className="text-xs text-muted-foreground">Classic</span>
              </div>
              <div className="flex-1 p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <div className="w-full h-6 rounded bg-gradient-to-r from-primary to-primary/70 mb-1" />
                <span className="text-xs text-muted-foreground">Modern</span>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="travel"
              className="w-full mt-3"
              onClick={dismissTutorial}
            >
              Got it!
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle;

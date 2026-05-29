import { useHomepageTheme } from "@/contexts/HomepageThemeContext";
import ClassicHeroSection from "./ClassicHeroSection";
import ModernHeroSection from "./ModernHeroSection";

const HeroSection = () => {
  const { theme } = useHomepageTheme();

  if (theme === "classic") {
    return <ClassicHeroSection />;
  }

  return <ModernHeroSection />;
};

export default HeroSection;

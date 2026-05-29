import { useHomepageTheme } from "@/contexts/HomepageThemeContext";
import ClassicHeroSection from "./ClassicHeroSection";
import PremiumHeroSection from "./PremiumHeroSection";

const HeroSection = () => {
  const { theme } = useHomepageTheme();
  return theme === "classic" ? <ClassicHeroSection /> : <PremiumHeroSection />;
};

export default HeroSection;

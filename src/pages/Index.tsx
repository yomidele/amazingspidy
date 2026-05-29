import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import CTASection from "@/components/home/CTASection";
import ClassicServicesSection from "@/components/home/ClassicServicesSection";
import ClassicCTASection from "@/components/home/ClassicCTASection";
import SignupPopup from "@/components/shared/SignupPopup";
import CustomCursor from "@/components/home/CustomCursor";
import ScrollProgress from "@/components/home/ScrollProgress";
import { HomepageThemeProvider, useHomepageTheme } from "@/contexts/HomepageThemeContext";

const IndexInner = () => {
  const { theme } = useHomepageTheme();
  const isModern = theme === "modern";

  return (
    <div
      className={
        isModern
          ? "min-h-screen bg-[#0a0a1a] text-white antialiased smooth-scroll"
          : "min-h-screen bg-background text-foreground antialiased"
      }
    >
      {isModern && <ScrollProgress />}
      {isModern && <CustomCursor />}
      <Header />
      <main>
        <HeroSection />
        <div id="services-section">
          {isModern ? <ServicesSection /> : <ClassicServicesSection />}
        </div>
        {isModern ? <CTASection /> : <ClassicCTASection />}
      </main>
      <Footer />
      <SignupPopup showBothOptions={true} />
    </div>
  );
};

const Index = () => (
  <HomepageThemeProvider>
    <IndexInner />
  </HomepageThemeProvider>
);

export default Index;

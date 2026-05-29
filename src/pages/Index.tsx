import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import CTASection from "@/components/home/CTASection";
import SignupPopup from "@/components/shared/SignupPopup";
import CustomCursor from "@/components/home/CustomCursor";
import ScrollProgress from "@/components/home/ScrollProgress";
import { HomepageThemeProvider } from "@/contexts/HomepageThemeContext";

const Index = () => {
  return (
    <HomepageThemeProvider>
      <div className="min-h-screen bg-[#0a0a1a] text-white antialiased smooth-scroll">
        <ScrollProgress />
        <CustomCursor />
        <Header />
        <main>
          <HeroSection />
          <div id="services-section">
            <ServicesSection />
          </div>
          <CTASection />
        </main>
        <Footer />
        <SignupPopup showBothOptions={true} />
      </div>
    </HomepageThemeProvider>
  );
};

export default Index;

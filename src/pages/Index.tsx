import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { AudienceCards } from "@/components/landing/AudienceCards";
import { AboutSection } from "@/components/landing/AboutSection";
import { CTABanner } from "@/components/landing/CTABanner";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <HowItWorks />
        <DashboardPreview />
        <AudienceCards />
        <AboutSection />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

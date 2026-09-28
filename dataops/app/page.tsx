import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LogoCloud, AgentsSection, Features, HowItWorks, Stats, UseCasesPreview } from "@/components/landing/Sections";
import { DemoCase } from "@/components/landing/DemoCase";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ, CTA, Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="relative overflow-x-clip">
      <Navbar />
      <Hero />
      <LogoCloud />
      <AgentsSection />
      <Features />
      <Stats />
      <HowItWorks />
      <DemoCase />
      <UseCasesPreview />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

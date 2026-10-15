import { FinalCta } from "./components/landing/final-cta";
import { Hero } from "./components/landing/hero";
import { HowItWorksSection } from "./components/landing/how-it-works-section";
import { ProblemSection } from "./components/landing/problem-section";
import { ProductSection } from "./components/landing/product-section";
import { SecuritySection } from "./components/landing/security-section";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";

export default function Home() {
  return (
    <div className="product-landing" data-theme="pactlet-vesper">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="landing-hero-shell">
        <SiteHeader />
        <Hero />
      </div>
      <main id="main-content">
        <ProblemSection />
        <ProductSection />
        <HowItWorksSection />
        <SecuritySection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

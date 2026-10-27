'use client';

import { FC, useEffect, useState, Suspense } from 'react';
import Navbar from '@/components/landing/v2/Navbar';
import HeroSectionV2 from '@/components/landing/v2/HeroSectionV2';
import AboutCompany from '@/components/landing/v2/AboutCompany';
import ServicesGrid from '@/components/landing/v2/ServicesGrid';
import ProjectsGallery from '@/components/landing/v2/ProjectsGallery';
import StatsCounter from '@/components/landing/v2/StatsCounter';
import TeamGrid from '@/components/landing/v2/TeamGrid';
import WhyChooseUs from '@/components/landing/v2/WhyChooseUs';
import QuotationForm from '@/components/landing/v2/QuotationForm';
import TestimonialsSlider from '@/components/landing/v2/TestimonialsSlider';
import CtaSection from '@/components/landing/v2/CtaSection';
import FooterV2 from '@/components/landing/v2/FooterV2';

function LandingV2Content() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Capturar código de convite da URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const invite = urlParams.get('invite');
      if (invite) {
        setInviteCode(invite);
      }
      setIsReady(true);
    }
  }, []);

  // Função para gerar links com código de convite
  const getAuthLink = (baseLink: string) => {
    if (inviteCode) {
      return `${baseLink}?invite=${inviteCode}`;
    }
    return baseLink;
  };

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-copper-dark to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold-accent/30 border-t-gold-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar getAuthLink={getAuthLink} />

      {/* Hero Section */}
      <HeroSectionV2 getAuthLink={getAuthLink} />

      {/* About Section */}
      <AboutCompany />

      {/* Services Section */}
      <ServicesGrid />

      {/* Projects Gallery */}
      <ProjectsGallery />

      {/* Stats Counter */}
      <StatsCounter />

      {/* Team Section */}
      <TeamGrid />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Testimonials */}
      <TestimonialsSlider />

      {/* Quotation Form */}
      <QuotationForm />

      {/* CTA Section */}
      <CtaSection getAuthLink={getAuthLink} />

      {/* Footer */}
      <FooterV2 getAuthLink={getAuthLink} />
    </div>
  );
}

const LandingV2: FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-copper-dark to-slate-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gold-accent/30 border-t-gold-accent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Carregando...</p>
          </div>
        </div>
      }
    >
      <LandingV2Content />
    </Suspense>
  );
};

export default LandingV2;

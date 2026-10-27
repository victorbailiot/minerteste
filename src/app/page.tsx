'use client';

import { FC, useEffect, useState, Suspense } from 'react';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import CopperMiningSection from '@/components/landing/CopperMiningSection';
import WhyJoinSection from '@/components/landing/WhyJoinSection';
import ImpactSection from '@/components/landing/ImpactSection';
import FooterSection from '@/components/landing/FooterSection';
import { LandingPageContent } from '@/types/landing';

// Conteúdo da landing page - Design moderno e vibrante
const landingContent: LandingPageContent = {
  hero: {
    title: 'A nova era da mineração começou.',
    subtitle: 'Tecnologia, inteligência coletiva e oportunidades reais.',
    ctaText: 'Quero fazer parte',
    ctaLink: '/auth/register',
    secondaryCtaText: 'Entrar',
    secondaryCtaLink: '/dashboard',
    backgroundImage: 'https://images.pexels.com/photos/15138925/pexels-photo-15138925.jpeg'
  },
  about: {
    title: 'Sobre a MinerStone',
    description: 'Somos mais do que uma mineradora. Conectamos pessoas à riqueza mineral de forma justa, inteligente e sustentável.',
    stats: [
      { value: 'Mineração de cobre real', label: '⚡' },
      { value: 'Participação colaborativa', label: '🤝' },
      { value: 'Modelo sustentável e transparente', label: '🌱' }
    ]
  },
  copperMining: {
    title: 'Mineração de Cobre',
    subtitle: 'O metal do futuro sustentável',
    description: 'O cobre é essencial para a transição energética global. Sua alta condutividade elétrica e resistência à corrosão o tornam indispensável para veículos elétricos, energias renováveis e infraestrutura digital. Nossa mineração responsável garante um futuro mais limpo e conectado.',
    imageUrl: 'https://images.pexels.com/photos/15138925/pexels-photo-15138925.jpeg',
    features: [
      {
        icon: '⚡',
        title: 'Condutividade Superior',
        description: 'O cobre é o metal mais eficiente para transmissão de energia elétrica'
      },
      {
        icon: '🌱',
        title: 'Sustentabilidade',
        description: '100% reciclável e essencial para tecnologias verdes'
      },
      {
        icon: '📱',
        title: 'Tecnologia Digital',
        description: 'Fundamental para dispositivos eletrônicos e conectividade'
      },
      {
        icon: '🚗',
        title: 'Mobilidade Elétrica',
        description: 'Componente crítico para veículos elétricos e híbridos'
      }
    ]
  },
  whyCopper: {
    title: 'Transforme sua realidade com inovação.',
    subtitle: 'Descubra como a tecnologia e a colaboração estão revolucionando o futuro da mineração.',
    features: [
      {
        icon: '🔗',
        title: 'Tecnologia',
        description: 'Sistema transparente e seguro'
      },
      {
        icon: '💰',
        title: 'Ganhos sustentáveis',
        description: 'Rendimentos consistentes e crescentes'
      },
      {
        icon: '🌐',
        title: 'Rede de oportunidades',
        description: 'Conecte-se com uma comunidade global'
      },
      {
        icon: '🔒',
        title: 'Controle e segurança',
        description: 'Seus investimentos protegidos'
      }
    ]
  },
  partner: {
    title: 'Você pode continuar onde está...',
    subtitle: 'ou começar a escavar o seu futuro agora.',
    lifestyleCards: [
      {
        emoji: '🚀',
        title: 'Inovação',
        description: 'Tecnologia de ponta'
      },
      {
        emoji: '🌱',
        title: 'Sustentabilidade',
        description: 'Futuro responsável'
      },
      {
        emoji: '🤝',
        title: 'Comunidade',
        description: 'Crescimento coletivo'
      }
    ],
    ctaText: 'Quero fazer parte',
    ctaLink: '/auth/register'
  },
  footer: {
    companyName: 'MinerStone',
    description: 'Transformando o futuro através da mineração sustentável e inovadora.',
    companyLinks: [
      { label: 'Home', href: '#' },
      { label: 'Registro', href: '/auth/register' },
      { label: 'Contato', href: '#' }
    ],
    partnerLinks: [
      { label: 'Login', href: '/auth/login' },
      { label: 'Registrar', href: '/auth/register' },
      { label: 'Suporte', href: '#' }
    ],
    contactInfo: {
      address: 'São Paulo, SP',
      phone: '+55 11 9999-9999',
      email: 'contato@minerstone.com'
    },
    socialLinks: [
      { label: 'Facebook', href: '#' },
      { label: 'Twitter', href: '#' },
      { label: 'LinkedIn', href: '#' }
    ]
  }
};

function HomeContent() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Usar window.location.search diretamente
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
  const getRegisterLink = (baseLink: string) => {
    if (inviteCode) {
      return `${baseLink}?invite=${inviteCode}`;
    }
    return baseLink;
  };

  // Aguardar até estar pronto para renderizar
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white overflow-hidden">
      <HeroSection
        title={landingContent.hero.title}
        subtitle={landingContent.hero.subtitle}
        ctaText={landingContent.hero.ctaText}
        ctaLink={getRegisterLink(landingContent.hero.ctaLink)}
        secondaryCtaText={landingContent.hero.secondaryCtaText}
        secondaryCtaLink={landingContent.hero.secondaryCtaLink}
        backgroundImage={landingContent.hero.backgroundImage}
        getAuthLink={getRegisterLink}
      />

      <AboutSection
        title={landingContent.about.title}
        description={landingContent.about.description}
        stats={landingContent.about.stats}
      />

      <CopperMiningSection
        title={landingContent.copperMining.title}
        subtitle={landingContent.copperMining.subtitle}
        description={landingContent.copperMining.description}
        features={landingContent.copperMining.features}
        imageUrl={landingContent.copperMining.imageUrl}
      />

      <WhyJoinSection
        title={landingContent.whyCopper.title}
        subtitle={landingContent.whyCopper.subtitle}
        features={landingContent.whyCopper.features}
      />

      <ImpactSection
        title={landingContent.partner.title}
        subtitle={landingContent.partner.subtitle}
        lifestyleCards={landingContent.partner.lifestyleCards}
        ctaText={landingContent.partner.ctaText}
        ctaLink={getRegisterLink(landingContent.partner.ctaLink)}
      />

      <FooterSection
        companyName={landingContent.footer.companyName}
        description={landingContent.footer.description}
        companyLinks={landingContent.footer.companyLinks.map(link => ({
          ...link,
          href: link.href === '/auth/register' ? getRegisterLink(link.href) : link.href
        }))}
        partnerLinks={landingContent.footer.partnerLinks.map(link => ({
          ...link,
          href: link.href === '/auth/register' ? getRegisterLink(link.href) : link.href
        }))}
        contactInfo={landingContent.footer.contactInfo}
        socialLinks={landingContent.footer.socialLinks}
      />
    </div>
  );
}

const Home: FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
};

export default Home;
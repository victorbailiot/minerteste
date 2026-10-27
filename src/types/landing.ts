import { LucideIcon } from 'lucide-react';

// Tipos para a seção Hero
export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundImage: string;
}

// Tipos para a seção About
export interface StatItem {
  value: string;
  label: string;
}

export interface AboutContent {
  title: string;
  description: string;
  stats: StatItem[];
  imageUrl?: string;
}

// Tipos para a seção de Mineração de Cobre
export interface CopperMiningFeature {
  icon: string;
  title: string;
  description: string;
}

export interface CopperMiningContent {
  title: string;
  subtitle: string;
  description: string;
  features: CopperMiningFeature[];
  imageUrl: string;
}

// Tipos para a seção Why Copper/Why Join
export interface FeatureItem {
  icon: LucideIcon | string; // Suporta tanto LucideIcon quanto emoji string
  title: string;
  description: string;
}

export interface WhyCopperContent {
  title: string;
  subtitle: string;
  features: FeatureItem[];
}

// Tipos para a seção Partner/Impact
export interface LifestyleItem {
  emoji: string;
  title: string;
  description: string;
}

export interface PartnerContent {
  title: string;
  subtitle: string;
  lifestyleCards: LifestyleItem[];
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

// Tipos para o Footer
export interface FooterLink {
  label: string;
  href: string;
}

export interface ContactInfo {
  address: string;
  phone: string;
  email: string;
}

export interface FooterContent {
  companyName: string;
  description: string;
  companyLinks: FooterLink[];
  partnerLinks: FooterLink[];
  contactInfo: ContactInfo;
  socialLinks: FooterLink[];
}

// Tipo para todo o conteúdo da landing page
export interface LandingPageContent {
  hero: HeroContent;
  about: AboutContent;
  copperMining: CopperMiningContent;
  whyCopper: WhyCopperContent;
  partner: PartnerContent;
  footer: FooterContent;
}

// Tipos para animações
export interface AnimationProps {
  delay?: number;
  duration?: number;
  ease?: number[];
}

// Tipos para componentes UI reutilizáveis
export interface CardProps {
  className?: string;
  children: React.ReactNode;
  animationDelay?: number;
}

// Tipos para responsividade
export enum Breakpoint {
  SM = 640,
  MD = 768,
  LG = 1024,
  XL = 1280,
  XXL = 1536
}

// Tipos para temas e estilos
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

// Tipos para métricas de desempenho
export interface PerformanceMetrics {
  fps: number;
  loadTime: number;
  interactionTime: number;
}
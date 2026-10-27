'use client';

import { FC, useRef, useEffect } from 'react';
import { motion, useReducedMotion, useInView, useAnimation, Variants } from 'framer-motion';
import { 
  ANIMATION_DURATION
} from '@/lib/animations';
import { PartnerContent } from '@/types/landing';
import LifestyleCard from './ui/LifestyleCard';
import Image from 'next/image';

/**
 * PartnerSection - Seção que exibe os benefícios de parceria e estilo de vida
 * 
 * Esta seção apresenta os benefícios do estilo de vida usando lifestyle cards animados,
 * uma seção de depoimento/citação e call-to-actions proeminentes para conversão.
 */
const PartnerSection: FC<PartnerContent> = ({
  title,
  subtitle,
  lifestyleCards,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink
}) => {
  const prefersReducedMotion = useReducedMotion();
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const lifestyleGridRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  
  const backgroundControls = useAnimation();
  const titleControls = useAnimation();
  const subtitleControls = useAnimation();
  const lifestyleGridControls = useAnimation();
  const testimonialControls = useAnimation();
  const ctaControls = useAnimation();
  const patternControls = useAnimation();
  
  const isSectionInView = useInView(sectionRef, { 
    once: true, 
    margin: "-10% 0px -10% 0px",
    amount: 0.2
  });
  
  const isTitleInView = useInView(titleRef, { 
    once: true, 
    margin: "-15% 0px -15% 0px",
    amount: 0.6
  });
  
  const isSubtitleInView = useInView(subtitleRef, { 
    once: true, 
    margin: "-15% 0px -15% 0px",
    amount: 0.6
  });
  
  const isLifestyleGridInView = useInView(lifestyleGridRef, { 
    once: true, 
    margin: "-15% 0px -15% 0px",
    amount: 0.2
  });
  
  const isTestimonialInView = useInView(testimonialRef, { 
    once: true, 
    margin: "-15% 0px -15% 0px",
    amount: 0.4
  });
  
  const isCtaInView = useInView(ctaRef, { 
    once: true, 
    margin: "-15% 0px -15% 0px",
    amount: 0.4
  });
  
  const lifestyleGridVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0.05 : 0.25,
        delayChildren: 0.4
      }
    }
  };
  
  useEffect(() => {
    if (isSectionInView) {
      backgroundControls.start({ 
        opacity: 1, 
        transition: { duration: 1.5, ease: "easeOut" } 
      });
      
      patternControls.start({ 
        opacity: 1, 
        transition: { duration: 2, ease: "easeOut" } 
      });
    }
    
    if (isTitleInView) {
      titleControls.start({ 
        opacity: 1, 
        y: 0, 
        transition: { duration: 1, delay: 0.2, ease: "easeOut" } 
      });
    }
    
    if (isSubtitleInView) {
      subtitleControls.start({ 
        opacity: 1, 
        y: 0, 
        transition: { duration: 1, delay: 0.4, ease: "easeOut" } 
      });
    }
    
    if (isLifestyleGridInView) {
      lifestyleGridControls.start("animate");
    }
    
    if (isTestimonialInView) {
      testimonialControls.start({ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { duration: 1, delay: 0.3, ease: "easeOut" } 
      });
    }
    
    if (isCtaInView) {
      ctaControls.start({ 
        opacity: 1, 
        y: 0, 
        transition: { duration: 1, delay: 0.2, ease: "easeOut" } 
      });
    }
  }, [
    isSectionInView, 
    isTitleInView, 
    isSubtitleInView, 
    isLifestyleGridInView,
    isTestimonialInView,
    isCtaInView,
    backgroundControls,
    patternControls,
    titleControls,
    subtitleControls,
    lifestyleGridControls,
    testimonialControls,
    ctaControls
  ]);

  return (
    <section 
      id="partner" 
      className="relative min-h-screen py-24 md:py-32 overflow-hidden"
      ref={sectionRef}
      aria-labelledby="partner-title"
    >
      {/* Background com imagem e overlays */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={backgroundControls}
        aria-hidden="true"
      >
        {/* Imagem de fundo tecnológica */}
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/5021165/pexels-photo-5021165.jpeg"
            alt="Background tecnológico"
            fill
            sizes="100vw"
            className="object-cover"
            priority={false}
          />
        </div>
        
        {/* Overlay gradiente principal */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-slate-900/85 to-black/90" />
        
        {/* Overlay tecnológico com padrões */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
        
        {/* Efeito de scan lines sutil */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }}
          />
        </div>
      </motion.div>
      
      {/* Elementos tecnológicos flutuantes */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={patternControls}
        transition={{ duration: 2.5, ease: "easeOut" }}
        aria-hidden="true"
      >
        {/* Grid de pontos tecnológicos */}
        <div 
          className="w-full h-full opacity-[0.15]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 15%, rgba(245, 158, 11, 0.4) 1px, transparent 1px),
              radial-gradient(circle at 85% 85%, rgba(251, 191, 36, 0.3) 1px, transparent 1px),
              radial-gradient(circle at 50% 25%, rgba(245, 158, 11, 0.2) 1px, transparent 1px),
              radial-gradient(circle at 25% 75%, rgba(234, 88, 12, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '200px 200px, 150px 150px, 300px 300px, 180px 180px',
            backgroundPosition: '0 0, 100px 100px, 150px 0, 0 150px'
          }}
        />
        
        {/* Linhas de conexão dinâmicas */}
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[10%] w-64 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent rotate-12" />
          <div className="absolute top-[60%] right-[15%] w-48 h-[1px] bg-gradient-to-r from-transparent via-orange-500/25 to-transparent -rotate-6" />
          <div className="absolute bottom-[30%] left-[20%] w-56 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent rotate-45" />
        </div>
        
        {/* Elementos geométricos flutuantes */}
        <motion.div
          className="absolute top-[25%] right-[20%] w-16 h-16 border border-amber-400/20 rotate-45"
          animate={{
            rotate: [45, 90, 45],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-[40%] left-[15%] w-12 h-12 border border-orange-500/25 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </motion.div>
      
      {/* Partículas flutuantes */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <motion.div
          className="absolute top-[10%] left-[8%] w-3 h-3 bg-amber-400/30 rounded-full blur-sm"
          animate={{
            y: [0, -40, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-[70%] right-[12%] w-2 h-2 bg-orange-500/40 rounded-full blur-sm"
          animate={{
            y: [0, -30, 0],
            opacity: [0.4, 0.9, 0.4],
            scale: [1, 1.4, 1]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
        />
        <motion.div
          className="absolute bottom-[15%] left-[25%] w-1.5 h-1.5 bg-amber-500/50 rounded-full blur-sm"
          animate={{
            y: [0, -25, 0],
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.5, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>
      
      <div className="container mx-auto px-4 md:px-8 lg:px-16 relative z-10">
        {/* Cabeçalho da seção com design minimalista */}
        <div className="max-w-6xl mx-auto text-center mb-24">
          {/* Badge tecnológico */}
          <motion.div
            className="inline-flex items-center gap-4 px-8 py-4 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isTitleInView ? 1 : 0, 
              scale: isTitleInView ? 1 : 0.8 
            }}
            transition={{ 
              duration: 1, 
              ease: [0.25, 0.1, 0.25, 1]
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <div className="w-1 h-8 bg-gradient-to-t from-amber-400 to-orange-500 rounded-full" />
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <span className="text-sm font-medium text-white/80 tracking-wider uppercase">Seja Nosso Parceiro</span>
          </motion.div>
          
          {/* Título minimalista e impactante */}
          <motion.h2 
            id="partner-title"
            ref={titleRef}
            className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light mb-8 leading-tight"
            initial={{ opacity: 0, y: 60 }}
            animate={titleControls}
          >
            <span className="block text-white/90 mb-4">
              {title.split(' ').slice(0, -1).join(' ')}
            </span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-size-200 animate-gradient font-normal">
              {title.split(' ').slice(-1)[0]}
            </span>
          </motion.h2>
          
          {/* Linha divisória minimalista */}
          <motion.div
            className="flex justify-center mb-12"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ 
              opacity: isSubtitleInView ? 1 : 0,
              scaleX: isSubtitleInView ? 1 : 0
            }}
            transition={{ duration: 1.2, delay: 0.5 }}
          >
            <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          </motion.div>
          
          {/* Subtítulo elegante */}
          <motion.p 
            ref={subtitleRef}
            className="text-xl md:text-2xl lg:text-3xl text-white/60 max-w-4xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0, y: 40 }}
            animate={subtitleControls}
          >
            {subtitle}
          </motion.p>
        </div>
        
        {/* Grid de lifestyle cards com layout assimétrico */}
        <motion.div 
          ref={lifestyleGridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 mb-32"
          initial="initial"
          animate={lifestyleGridControls}
          variants={lifestyleGridVariants}
        >
          {lifestyleCards.map((card, index) => (
            <motion.div
              key={`lifestyle-${index}`}
              variants={{
                initial: { 
                  opacity: 0, 
                  y: 80, 
                  scale: 0.8,
                  rotateX: 15
                },
                animate: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  rotateX: 0,
                  transition: {
                    duration: 1,
                    ease: [0.25, 0.1, 0.25, 1]
                  }
                }
              }}
              className="group"
              style={{
                transformStyle: 'preserve-3d'
              }}
            >
              <LifestyleCard
                emoji={card.emoji}
                title={card.title}
                description={card.description}
                index={index}
                className="h-full transform transition-all duration-700 group-hover:scale-105 group-hover:-translate-y-2"
              />
            </motion.div>
          ))}
        </motion.div>
        
        {/* Seção de depoimento redesenhada */}
        <motion.div 
          ref={testimonialRef}
          className="max-w-5xl mx-auto text-center mb-24"
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={testimonialControls}
        >
          <div className="relative">
            {/* Container principal com glassmorphism */}
            <div className="relative bg-black/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-12 md:p-16 overflow-hidden">
              {/* Efeito de brilho interno */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 rounded-3xl" />
              
              {/* Aspas minimalistas */}
              <motion.div 
                className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-amber-400/40"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                aria-hidden="true"
              />
              <motion.div 
                className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-amber-400/40"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.7, duration: 0.8 }}
                aria-hidden="true"
              />
              
              <blockquote className="text-2xl md:text-3xl lg:text-4xl text-white/90 font-light leading-relaxed mb-8 relative z-10">
                Transforme sua vida financeira através da mineração inteligente. 
                <span className="block mt-4 text-amber-400/80">
                  Junte-se a milhares de parceiros que já descobriram o futuro.
                </span>
              </blockquote>
              
              <cite className="text-amber-400 font-medium text-lg tracking-wide">
                — Equipe TectonMiner
              </cite>
            </div>
          </div>
        </motion.div>
        
        {/* CTA Section redesenhada */}
        <motion.div 
          ref={ctaRef}
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 50 }}
          animate={ctaControls}
        >
          {/* Botões com design futurista */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <motion.a
              href={ctaLink}
              className="group relative inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-2xl shadow-2xl shadow-amber-500/25 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black min-w-[250px] overflow-hidden"
              whileHover={{ 
                scale: prefersReducedMotion ? 1 : 1.05,
                boxShadow: "0 25px 50px -10px rgba(245, 158, 11, 0.5)"
              }}
              whileTap={{ scale: prefersReducedMotion ? 1 : 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10 text-lg">{ctaText}</span>
            </motion.a>
            
            {secondaryCtaText && secondaryCtaLink && (
              <motion.a
                href={secondaryCtaLink}
                className="group relative inline-flex items-center justify-center px-12 py-5 border-2 border-white/20 text-white font-medium rounded-2xl hover:border-amber-400/60 hover:bg-white/5 backdrop-blur-sm transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black min-w-[250px] overflow-hidden"
                whileHover={{ 
                  scale: prefersReducedMotion ? 1 : 1.05,
                  borderColor: "rgba(245, 158, 11, 0.8)"
                }}
                whileTap={{ scale: prefersReducedMotion ? 1 : 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10 text-lg">{secondaryCtaText}</span>
              </motion.a>
            )}
          </div>
          
          {/* Indicadores de confiança minimalistas */}
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-8 text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <div className="flex items-center gap-3 group">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse group-hover:scale-110 transition-transform" />
              <span className="text-sm font-light tracking-wide">Seguro & Confiável</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse group-hover:scale-110 transition-transform" style={{ animationDelay: '0.3s' }} />
              <span className="text-sm font-light tracking-wide">Suporte 24/7</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse group-hover:scale-110 transition-transform" style={{ animationDelay: '0.6s' }} />
              <span className="text-sm font-light tracking-wide">Retornos Garantidos</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Indicador de scroll futurista */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 1 }}
      >
        <a 
          href="#footer" 
          aria-label="Rolar para o rodapé"
          className="focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black rounded-full block group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-lg group-hover:bg-amber-500/30 transition-all duration-500" />
            <div className="relative w-10 h-14 border-2 border-white/20 rounded-full flex justify-center cursor-pointer hover:border-amber-400 transition-all duration-500 bg-black/30 backdrop-blur-sm">
              <motion.div 
                className="w-2 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full mt-3"
                animate={{
                  y: [0, 10, 0],
                  opacity: [1, 0.3, 1]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </div>
        </a>
      </motion.div>
    </section>
  );
};

export default PartnerSection;
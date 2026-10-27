'use client';

import { FC, useRef, useEffect } from 'react';
import { motion, useReducedMotion, useInView, useAnimation, Variants } from 'framer-motion';
import { 
  ANIMATION_DURATION
} from '@/lib/animations';
import { WhyCopperContent } from '@/types/landing';
import FeatureCard from './ui/FeatureCard';

/**
 * WhyCopperSection - Seção que exibe os benefícios do cobre/mineração
 * 
 * Esta seção apresenta os principais recursos/benefícios usando cards animados
 * com animações baseadas em scroll para melhorar a experiência do usuário.
 */
const WhyCopperSection: FC<WhyCopperContent> = ({
  title,
  subtitle,
  features
}) => {
  const prefersReducedMotion = useReducedMotion();
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);
  
  const backgroundControls = useAnimation();
  const titleControls = useAnimation();
  const subtitleControls = useAnimation();
  const featuresGridControls = useAnimation();
  
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
  
  const isFeaturesGridInView = useInView(featuresGridRef, { 
    once: true, 
    margin: "-15% 0px -15% 0px",
    amount: 0.2
  });
  
  const patternControls = useAnimation();
  const decorationControls = useAnimation();
  const scrollIndicatorControls = useAnimation();
  
  const decorationRef = useRef<HTMLDivElement>(null);
  
  const isDecorationInView = useInView(decorationRef, {
    once: true,
    margin: "-10% 0px -10% 0px",
    amount: 0.5
  });
  
  const featuresGridVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0.05 : 0.2,
        delayChildren: 0.3
      }
    }
  };
  
  const decorationVariants: Variants = {
    initial: { 
      opacity: 0, 
      scaleX: 0,
      transformOrigin: "center"
    },
    animate: { 
      opacity: 1, 
      scaleX: 1,
      transition: {
        duration: ANIMATION_DURATION * 1.5,
        ease: "easeOut",
        delay: 0.6
      }
    }
  };
  
  useEffect(() => {
    if (isSectionInView) {
      backgroundControls.start({ 
        opacity: 1, 
        transition: { duration: 1.2, ease: "easeOut" } 
      });
      
      patternControls.start({ 
        opacity: 1, 
        transition: { duration: 1.5, ease: "easeOut" } 
      });
      
      scrollIndicatorControls.start({ 
        opacity: 1, 
        y: 0, 
        transition: { duration: 1, delay: 1.2, ease: "easeOut" } 
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
    
    if (isFeaturesGridInView) {
      featuresGridControls.start("animate");
    }
    
    if (isDecorationInView) {
      decorationControls.start("animate");
    }
  }, [
    isSectionInView, 
    isTitleInView, 
    isSubtitleInView, 
    isFeaturesGridInView,
    isDecorationInView,
    backgroundControls,
    patternControls,
    titleControls,
    subtitleControls,
    featuresGridControls,
    decorationControls,
    scrollIndicatorControls
  ]);

  return (
    <section 
      id="why-copper" 
      className="relative min-h-screen py-24 md:py-32 bg-black overflow-hidden"
      ref={sectionRef}
      aria-labelledby="why-copper-title"
    >
      {/* Background complexo com múltiplas camadas */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={backgroundControls}
        aria-hidden="true"
      >
        {/* Gradiente base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-800" />
        
        {/* Imagem abstrata de tecnologia usando CSS */}
        <div className="absolute inset-0 opacity-[0.15]">
          {/* Circuitos abstratos */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[10%] left-[10%] w-32 h-32 border border-amber-500/20 rounded-full" />
            <div className="absolute top-[15%] left-[15%] w-24 h-24 border border-orange-500/15 rounded-full" />
            <div className="absolute top-[60%] right-[20%] w-40 h-40 border border-amber-400/10 rounded-full" />
            <div className="absolute bottom-[20%] left-[30%] w-28 h-28 border border-orange-400/15 rounded-full" />
          </div>
          
          {/* Linhas de conexão */}
          <div className="absolute inset-0">
            <div className="absolute top-[25%] left-[25%] w-48 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent rotate-45" />
            <div className="absolute top-[45%] right-[25%] w-64 h-[1px] bg-gradient-to-r from-transparent via-orange-500/15 to-transparent -rotate-12" />
            <div className="absolute bottom-[35%] left-[15%] w-56 h-[1px] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent rotate-12" />
          </div>
          
          {/* Pontos de dados */}
          <div className="absolute inset-0">
            <div className="absolute top-[20%] left-[40%] w-2 h-2 bg-amber-500/30 rounded-full animate-pulse" />
            <div className="absolute top-[70%] right-[30%] w-1.5 h-1.5 bg-orange-500/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-[40%] left-[60%] w-1 h-1 bg-amber-400/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>
        
        {/* Overlay com gradiente para melhor legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
      </motion.div>
      
      {/* Padrão hexagonal animado */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={patternControls}
        transition={{ duration: 2, ease: "easeOut" }}
        aria-hidden="true"
      >
        <div 
          className="w-full h-full opacity-[0.08]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.3) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, rgba(251, 191, 36, 0.2) 1px, transparent 1px),
              radial-gradient(circle at 40% 60%, rgba(245, 158, 11, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '120px 120px, 80px 80px, 160px 160px',
            backgroundPosition: '0 0, 40px 40px, 80px 80px'
          }}
        />
      </motion.div>
      
      {/* Elementos flutuantes animados */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <motion.div
          className="absolute top-[15%] left-[5%] w-4 h-4 bg-amber-500/20 rounded-full blur-sm"
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-[70%] right-[10%] w-3 h-3 bg-orange-500/25 rounded-full blur-sm"
          animate={{
            y: [0, -25, 0],
            opacity: [0.25, 0.7, 0.25],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className="absolute bottom-[20%] left-[15%] w-2 h-2 bg-amber-400/30 rounded-full blur-sm"
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.4, 1]
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
        <div className="max-w-5xl mx-auto text-center mb-20">
          {/* Badge superior */}
          <motion.div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 backdrop-blur-md mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isTitleInView ? 1 : 0, 
              scale: isTitleInView ? 1 : 0.8 
            }}
            transition={{ 
              duration: 0.8, 
              ease: [0.25, 0.1, 0.25, 1]
            }}
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-sm font-medium text-amber-400 tracking-wide">Por que escolher nossa tecnologia</span>
          </motion.div>
          
          {/* Título com efeito mais dramático */}
          <motion.h2 
            id="why-copper-title"
            ref={titleRef}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={titleControls}
          >
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-100 to-white mb-2">
              {title.split(' ').slice(0, -2).join(' ')}
            </span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-size-200 animate-gradient">
              {title.split(' ').slice(-2).join(' ')}
            </span>
          </motion.h2>
          
          {/* Linha decorativa animada */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: isSubtitleInView ? 1 : 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-amber-500" />
              <div className="w-3 h-3 border-2 border-amber-500 rounded-full bg-amber-500/20" />
              <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-amber-500" />
            </div>
          </motion.div>
          
          {/* Subtítulo melhorado */}
          <motion.p 
            ref={subtitleRef}
            className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0, y: 30 }}
            animate={subtitleControls}
          >
            {subtitle}
          </motion.p>
        </div>
        
        {/* Grid de features com layout mais criativo */}
        <motion.div 
          ref={featuresGridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 mt-16"
          initial="initial"
          animate={featuresGridControls}
          variants={featuresGridVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={`feature-${index}`}
              variants={{
                initial: { 
                  opacity: 0, 
                  y: 60, 
                  scale: 0.9,
                  rotateX: 10
                },
                animate: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  rotateX: 0,
                  transition: {
                    duration: 0.8,
                    ease: [0.25, 0.1, 0.25, 1]
                  }
                }
              }}
              className="group"
            >
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                index={index}
                className="h-full transform transition-all duration-500 group-hover:scale-105"
              />
            </motion.div>
          ))}
        </motion.div>
        
        {/* Elementos decorativos sutis abaixo dos cards */}
        <div 
          className="hidden lg:block relative mt-12"
          ref={decorationRef}
        >
          {/* Pontos decorativos conectores */}
          <motion.div
            className="absolute top-8 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30"
            initial={{ opacity: 0, scale: 0 }}
            animate={decorationControls}
            variants={{
              initial: { opacity: 0, scale: 0 },
              animate: { 
                opacity: 1, 
                scale: 1,
                transition: { duration: 0.8, delay: 1.0 }
              }
            }}
            aria-hidden="true"
          />
          
          {/* Linhas sutis conectando ao centro */}
          <motion.div 
            className="absolute top-8 left-1/4 w-1/4 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent"
            initial="initial"
            animate={decorationControls}
            variants={{
              initial: { opacity: 0, scaleX: 0 },
              animate: { 
                opacity: 1, 
                scaleX: 1,
                transition: { duration: 1.2, ease: "easeOut", delay: 1.2 }
              }
            }}
            aria-hidden="true"
          />
          <motion.div 
            className="absolute top-8 right-1/4 w-1/4 h-[1px] bg-gradient-to-l from-amber-500/20 to-transparent"
            initial="initial"
            animate={decorationControls}
            variants={{
              initial: { opacity: 0, scaleX: 0 },
              animate: { 
                opacity: 1, 
                scaleX: 1,
                transition: { duration: 1.2, ease: "easeOut", delay: 1.4 }
              }
            }}
            aria-hidden="true"
          />
        </div>
      </div>
      
      {/* Indicador de scroll redesenhado */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 30 }}
        animate={scrollIndicatorControls}
      >
        <a 
          href="#partner" 
          aria-label="Rolar para a próxima seção"
          className="focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black rounded-full block group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md group-hover:bg-amber-500/30 transition-all duration-300" />
            <div className="relative w-8 h-12 border-2 border-white/20 rounded-full flex justify-center cursor-pointer hover:border-amber-400 transition-all duration-300 bg-black/20 backdrop-blur-sm">
              <motion.div 
                className="w-1.5 h-4 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full mt-2"
                animate={{
                  y: [0, 8, 0],
                  opacity: [1, 0.3, 1]
                }}
                transition={{
                  duration: 2,
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

export default WhyCopperSection;
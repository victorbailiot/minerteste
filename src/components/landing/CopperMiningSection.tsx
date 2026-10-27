'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { fadeInUp, staggerContainer, fadeIn, getReducedMotionVariants } from '@/lib/animations';
import { CopperMiningContent } from '@/types/landing';
import Image from 'next/image';
import { Zap, Leaf, Smartphone, Car } from 'lucide-react';

const CopperMiningSection: FC<CopperMiningContent> = ({
  title,
  subtitle,
  description,
  features,
  imageUrl
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isLoaded, setIsLoaded] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const isSectionInView = useInView(sectionRef, { once: true, margin: "-10% 0px -10% 0px" });
  const isTitleInView = useInView(titleRef, { once: true, margin: "-15% 0px -15% 0px" });
  const isSubtitleInView = useInView(subtitleRef, { once: true, margin: "-15% 0px -15% 0px" });
  const isDescriptionInView = useInView(descriptionRef, { once: true, margin: "-15% 0px -15% 0px" });
  const isImageInView = useInView(imageRef, { once: true, margin: "-15% 0px -15% 0px" });
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-15% 0px -15% 0px" });

  const animations = prefersReducedMotion ? getReducedMotionVariants() : {
    fadeInUp,
    staggerContainer,
    fadeIn
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Mapeamento de ícones
  const iconMap = {
    '⚡': Zap,
    '🌱': Leaf,
    '📱': Smartphone,
    '🚗': Car
  };

  return (
    <section
      id="copper-mining"
      className="relative min-h-screen py-20 md:py-32 bg-gradient-to-br from-black via-slate-900 to-black overflow-hidden"
      ref={sectionRef}
    >
      {/* Background dinâmico com gradientes e efeitos */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isSectionInView ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Gradiente base dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-black" />
        
        {/* Efeito de luz superior com cores vibrantes */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/5 via-orange-500/3 to-transparent" />
        
        {/* Efeito de luz inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/4 via-amber-500/2 to-transparent" />
        
        {/* Overlay de brilho metálico dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/2 via-transparent to-orange-500/2 mix-blend-soft-light pointer-events-none" />
        
        {/* Mesh gradient dinâmico */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/6 via-transparent to-orange-600/6" />
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-500/4 via-transparent to-amber-400/4" />
        </div>
        
        {/* Partículas metálicas animadas */}
        <div className="absolute inset-0 opacity-25">
          {[
            { left: '10%', top: '30%', size: 6, delay: 0, color: 'from-amber-400 to-orange-500' },
            { left: '85%', top: '25%', size: 8, delay: 1, color: 'from-orange-500 to-amber-400' },
            { left: '25%', top: '75%', size: 5, delay: 2, color: 'from-amber-400 to-orange-600' },
            { left: '75%', top: '85%', size: 7, delay: 3, color: 'from-orange-600 to-amber-500' },
            { left: '50%', top: '50%', size: 9, delay: 4, color: 'from-amber-500 to-orange-400' },
            { left: '20%', top: '70%', size: 6, delay: 5, color: 'from-orange-400 to-amber-600' },
            { left: '80%', top: '60%', size: 8, delay: 6, color: 'from-amber-600 to-orange-500' },
            { left: '35%', top: '95%', size: 5, delay: 7, color: 'from-orange-500 to-amber-400' }
          ].map((particle, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full bg-gradient-to-br ${particle.color} backdrop-blur-sm`}
              style={{
                left: particle.left,
                top: particle.top,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                filter: 'blur(0.5px)',
                opacity: 0.5 + (i % 2) * 0.2
              }}
              animate={{
                y: [0, -25 - (i % 2) * 10, 0],
                opacity: [0.5, 0.8, 0.5],
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 12 + (i % 2) * 4,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Padrão geométrico refinado */}
        <div className="absolute inset-0 opacity-[0.025]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_#fbbf24_1px,_transparent_1px)] bg-[length:80px_80px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_#f59e0b_1px,_transparent_1px)] bg-[length:100px_100px]" />
        </div>
        
        {/* Efeito de profundidade dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-transparent" />
        
        {/* Linhas de energia sutis */}
        <div className="absolute inset-0 opacity-12">
          <motion.div
            className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
            animate={{
              opacity: [0.1, 0.5, 0.1],
              scaleX: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
            animate={{
              opacity: [0.1, 0.5, 0.1],
              scaleX: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: 3,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>

      <div className="container mx-auto px-4 md:px-8 lg:px-16 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header da seção */}
          <div className="text-center mb-16">
            {/* Badge decorativo */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 backdrop-blur-sm mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isTitleInView ? 1 : 0,
                scale: isTitleInView ? 1 : 0.8
              }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.1, 0.25, 1]
              }}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Mineração Sustentável</span>
            </motion.div>

            {/* Título */}
            <motion.h2
              ref={titleRef}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-4"
              initial={{ opacity: 0, y: 50 }}
              animate={{
                opacity: isTitleInView ? 1 : 0,
                y: isTitleInView ? 0 : 50
              }}
              transition={{
                duration: 1,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.1
              }}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-100 to-white">
                {title}
              </span>
            </motion.h2>

            {/* Subtítulo */}
            <motion.h3
              ref={subtitleRef}
              className="text-xl md:text-2xl lg:text-3xl text-amber-400 font-medium mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{
                opacity: isSubtitleInView ? 1 : 0,
                y: isSubtitleInView ? 0 : 30
              }}
              transition={{
                duration: 0.8,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.2
              }}
            >
              {subtitle}
            </motion.h3>

            {/* Linha decorativa */}
            <motion.div
              className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full mx-auto mb-12"
              initial={{ width: 0 }}
              animate={{ width: isDescriptionInView ? 96 : 0 }}
              transition={{
                duration: 0.8,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.3
              }}
            />
          </div>

          {/* Conteúdo principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Coluna da imagem */}
            <motion.div
              ref={imageRef}
              className="relative"
              initial={{ opacity: 0, x: -50 }}
              animate={{
                opacity: isImageInView ? 1 : 0,
                x: isImageInView ? 0 : -50
              }}
              transition={{
                duration: 1,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.4
              }}
            >
              <div className="relative rounded-2xl overflow-hidden">
                {/* Efeito de brilho */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-600/20 opacity-0 hover:opacity-100 transition-opacity duration-500 z-10" />
                
                {/* Imagem */}
                <Image
                  src={imageUrl}
                  alt="Mineração de Cobre"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover rounded-2xl"
                />
                
                {/* Overlay gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-2xl" />
              </div>
            </motion.div>

            {/* Coluna do conteúdo */}
            <div className="space-y-8">
              {/* Descrição */}
              <motion.p
                ref={descriptionRef}
                className="text-lg md:text-xl text-white/70 leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{
                  opacity: isDescriptionInView ? 1 : 0,
                  y: isDescriptionInView ? 0 : 30
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.25, 0.1, 0.25, 1],
                  delay: 0.5
                }}
              >
                {description}
              </motion.p>

              {/* Grid de features */}
              <motion.div
                ref={featuresRef}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                initial="initial"
                animate={isFeaturesInView ? "animate" : "initial"}
                variants={{
                  initial: {},
                  animate: {
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.6
                    }
                  }
                }}
              >
                {features.map((feature, index) => {
                  const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || Zap;
                  
                  return (
                    <motion.div
                      key={`feature-${index}`}
                      variants={{
                        initial: { opacity: 0, y: 20, scale: 0.95 },
                        animate: { opacity: 1, y: 0, scale: 1 }
                      }}
                      transition={{
                        duration: 0.6,
                        ease: [0.25, 0.1, 0.25, 1]
                      }}
                      className="group"
                    >
                      <div className="relative p-6 rounded-xl bg-gradient-to-br from-white/8 to-white/12 backdrop-blur-md border border-white/15 overflow-hidden hover:border-amber-500/30 transition-all duration-300">
                        {/* Efeito de brilho no hover */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.8 }}
                        />

                        <div className="relative z-10">
                          {/* Ícone */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                              <IconComponent className="w-6 h-6 text-amber-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-white">
                              {feature.title}
                            </h4>
                          </div>
                          
                          {/* Descrição */}
                          <p className="text-white/70 text-sm leading-relaxed">
                            {feature.description}
                          </p>
                        </div>

                        {/* Linha decorativa */}
                        <motion.div
                          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"
                          initial={{ width: 0 }}
                          whileHover={{ width: '100%' }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de scroll redesenhado */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{
          opacity: isSectionInView ? 1 : 0,
          y: isSectionInView ? 0 : 30
        }}
        transition={{
          duration: 1,
          delay: 1,
          ease: [0.25, 0.1, 0.25, 1]
        }}
      >
        <a
          href="#why-join"
          aria-label="Rolar para a próxima seção"
          className="focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black rounded-full block group"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-all duration-300" />

            {/* Scroll indicator */}
            <div className="relative w-10 h-16 border-2 border-white/30 rounded-full flex justify-center cursor-pointer hover:border-amber-400 transition-all duration-300 bg-black/40 backdrop-blur-md">
              <motion.div
                className="w-2 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full mt-3"
                animate={{
                  y: [0, 12, 0],
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

export default CopperMiningSection; 
'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { fadeInUp, staggerContainer, fadeIn, gradientTextAnimation, getReducedMotionVariants } from '@/lib/animations';
import { AboutContent } from '@/types/landing';
import StatCard from './ui/StatCard';
import { useInViewAnimation } from '@/lib/hooks/useInViewAnimation';
import { Sparkles, TrendingUp, Users, Shield } from 'lucide-react';

const AboutSection: FC<AboutContent> = ({
  title,
  description,
  stats
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isLoaded, setIsLoaded] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const statsGridRef = useRef<HTMLDivElement>(null);

  const isSectionInView = useInView(sectionRef, { once: true, margin: "-10% 0px -10% 0px" });
  const isTitleInView = useInView(titleRef, { once: true, margin: "-15% 0px -15% 0px" });
  const isDescriptionInView = useInView(descriptionRef, { once: true, margin: "-15% 0px -15% 0px" });
  const isStatsGridInView = useInView(statsGridRef, { once: true, margin: "-15% 0px -15% 0px" });

  const animations = prefersReducedMotion ? getReducedMotionVariants() : {
    fadeInUp,
    staggerContainer,
    fadeIn,
    gradientTextAnimation
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="about"
      className="relative min-h-screen py-20 md:py-32 bg-gradient-to-br from-slate-900 via-black to-slate-800 overflow-hidden"
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
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-black to-slate-800" />
        
        {/* Efeito de luz superior com cores vibrantes */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/6 via-orange-500/3 to-transparent" />
        
        {/* Efeito de luz inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/5 via-amber-500/2 to-transparent" />
        
        {/* Overlay de brilho metálico dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/2 via-transparent to-orange-500/2 mix-blend-soft-light pointer-events-none" />
        
        {/* Mesh gradient dinâmico */}
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/8 via-transparent to-orange-600/8" />
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-500/6 via-transparent to-amber-400/6" />
        </div>
        
        {/* Partículas metálicas animadas */}
        <div className="absolute inset-0 opacity-30">
          {[
            { left: '15%', top: '25%', size: 5, delay: 0, color: 'from-amber-400 to-orange-500' },
            { left: '80%', top: '20%', size: 7, delay: 1, color: 'from-orange-500 to-amber-400' },
            { left: '30%', top: '70%', size: 4, delay: 2, color: 'from-amber-400 to-orange-600' },
            { left: '70%', top: '80%', size: 6, delay: 3, color: 'from-orange-600 to-amber-500' },
            { left: '50%', top: '40%', size: 8, delay: 4, color: 'from-amber-500 to-orange-400' },
            { left: '20%', top: '60%', size: 5, delay: 5, color: 'from-orange-400 to-amber-600' },
            { left: '85%', top: '50%', size: 7, delay: 6, color: 'from-amber-600 to-orange-500' },
            { left: '40%', top: '90%', size: 6, delay: 7, color: 'from-orange-500 to-amber-400' }
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
                opacity: 0.6 + (i % 2) * 0.2
              }}
              animate={{
                y: [0, -20 - (i % 2) * 8, 0],
                opacity: [0.6, 0.9, 0.6],
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 10 + (i % 2) * 3,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Padrão geométrico refinado */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_#fbbf24_1px,_transparent_1px)] bg-[length:80px_80px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_#f59e0b_1px,_transparent_1px)] bg-[length:100px_100px]" />
        </div>
        
        {/* Efeito de profundidade dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent" />
        
        {/* Linhas de energia sutis */}
        <div className="absolute inset-0 opacity-15">
          <motion.div
            className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
            animate={{
              opacity: [0.1, 0.6, 0.1],
              scaleX: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
            animate={{
              opacity: [0.1, 0.6, 0.1],
              scaleX: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay: 2.5,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>

      <div className="container mx-auto px-4 md:px-8 lg:px-16 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
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
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Sobre Nós</span>
          </motion.div>

          {/* Título com efeito mais dramático */}
          <motion.h2
            ref={titleRef}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-8"
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
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-100 to-white">
              {title.split(' ').slice(0, -1).join(' ')}
            </span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-size-200 animate-gradient">
              {title.split(' ').slice(-1)[0]}
            </span>
          </motion.h2>

          {/* Linha decorativa */}
          <motion.div
            className="w-32 h-1 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full mx-auto mb-12"
            initial={{ width: 0 }}
            animate={{ width: isDescriptionInView ? 128 : 0 }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.3
            }}
          />

          {/* Descrição com tipografia melhorada */}
          <motion.p
            ref={descriptionRef}
            className="text-xl md:text-2xl lg:text-3xl text-white/70 leading-relaxed max-w-4xl mx-auto font-light mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: isDescriptionInView ? 1 : 0,
              y: isDescriptionInView ? 0 : 30
            }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.4
            }}
          >
            {description}
          </motion.p>

          {/* Grid de estatísticas com layout criativo */}
          <motion.div
            ref={statsGridRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="initial"
            animate={isStatsGridInView ? "animate" : "initial"}
            variants={{
              initial: {},
              animate: {
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.5
                }
              }
            }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={`stat-${index}`}
                variants={{
                  initial: { opacity: 0, y: 30, scale: 0.9 },
                  animate: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{
                  duration: 0.6,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                className="group"
              >
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/8 to-white/12 backdrop-blur-md border border-white/15 overflow-hidden hover:border-amber-500/30 transition-all duration-300">
                  {/* Efeito de brilho no hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.8 }}
                  />

                  {/* Ícone decorativo */}
                  <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                    {index === 0 && <TrendingUp className="w-8 h-8 text-amber-400" />}
                    {index === 1 && <Users className="w-8 h-8 text-orange-500" />}
                    {index === 2 && <Shield className="w-8 h-8 text-amber-600" />}
                  </div>

                  <div className="relative z-10 text-center">
                    <div className="text-5xl md:text-6xl mb-4">
                      {stat.label}
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                      {stat.value}
                    </h3>
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
            ))}
          </motion.div>
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
          href="#copper-mining"
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

export default AboutSection;
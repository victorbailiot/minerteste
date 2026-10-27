'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FC } from 'react';
import { fadeInUp, staggerContainer, getReducedMotionVariants } from '@/lib/animations';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { Sparkles, Rocket, Leaf, Users } from 'lucide-react';

export interface ImpactSectionProps {
  title: string;
  subtitle: string;
  lifestyleCards: Array<{
    emoji: string;
    title: string;
    description: string;
  }>;
  ctaText: string;
  ctaLink: string;
}

const ImpactSection: FC<ImpactSectionProps> = ({ 
  title, 
  subtitle, 
  lifestyleCards, 
  ctaText, 
  ctaLink 
}) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const animations = prefersReducedMotion ? getReducedMotionVariants() : {
    fadeInUp,
    staggerContainer
  };

  // Mapeamento de ícones
  const iconMap = {
    '🚀': Rocket,
    '🌱': Leaf,
    '🤝': Users
  };

  return (
    <section id="impact" className="relative py-20 md:py-32 bg-gradient-to-br from-black via-slate-900 to-black overflow-hidden">
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 1.5 }}
      >
        {/* Gradiente base dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-black" />
        
        {/* Efeito de luz superior com cores vibrantes */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/5 via-orange-500/2 to-transparent" />
        
        {/* Efeito de luz inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/4 via-amber-500/1 to-transparent" />
        
        {/* Overlay de brilho metálico dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/1 via-transparent to-orange-500/1 mix-blend-soft-light pointer-events-none" />
        
        {/* Mesh gradient dinâmico */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/4 via-transparent to-orange-600/4" />
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-500/3 via-transparent to-amber-400/3" />
        </div>
        
        {/* Efeito de rede pulsante refinado */}
        <motion.div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 98%, #f59e0b 100%),
              linear-gradient(0deg, transparent 98%, #f59e0b 100%)
            `,
            backgroundSize: '50px 50px'
          }}
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.03, 0.06, 0.03]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Partículas metálicas animadas */}
        <div className="absolute inset-0 opacity-20">
          {[
            { left: '25%', top: '35%', size: 3, delay: 0, color: 'from-amber-400 to-orange-500' },
            { left: '70%', top: '30%', size: 5, delay: 2, color: 'from-orange-500 to-amber-400' },
            { left: '40%', top: '80%', size: 4, delay: 4, color: 'from-amber-400 to-orange-600' },
            { left: '60%', top: '90%', size: 6, delay: 6, color: 'from-orange-600 to-amber-500' },
            { left: '15%', top: '50%', size: 4, delay: 8, color: 'from-amber-500 to-orange-400' },
            { left: '85%', top: '70%', size: 5, delay: 10, color: 'from-orange-400 to-amber-600' }
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
                opacity: 0.4 + (i % 2) * 0.2
              }}
              animate={{
                y: [0, -15 - (i % 2) * 5, 0],
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.15, 1],
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
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_#fbbf24_1px,_transparent_1px)] bg-[length:80px_80px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_#f59e0b_1px,_transparent_1px)] bg-[length:100px_100px]" />
        </div>
        
        {/* Efeito de profundidade dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
        
        {/* Linhas de energia sutis */}
        <div className="absolute inset-0 opacity-10">
          <motion.div
            className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scaleX: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scaleX: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              delay: 3.5,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          className="text-center mb-16"
          variants={animations.staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
        >
          {/* Badge decorativo */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 backdrop-blur-sm mb-8"
            variants={animations.fadeInUp}
            custom={0}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Impacto e Futuro</span>
          </motion.div>

          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6"
            variants={animations.fadeInUp}
            custom={1}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-100 to-white">
              {title}
            </span>
          </motion.h2>
          
          <motion.p
            className="text-xl md:text-2xl lg:text-3xl text-white/70 max-w-4xl mx-auto leading-relaxed mb-12"
            variants={animations.fadeInUp}
            custom={2}
          >
            {subtitle}
          </motion.p>

          {/* Linha decorativa */}
          <motion.div
            className="w-32 h-1 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full mx-auto mb-16"
            variants={animations.fadeInUp}
            custom={3}
            initial={{ width: 0 }}
            animate={{ width: isInView ? 128 : 0 }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.3
            }}
          />

          {/* Cards de estilo de vida */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
            variants={animations.staggerContainer}
            initial="initial"
            animate={isInView ? "animate" : "initial"}
          >
            {lifestyleCards.map((card, index) => {
              const IconComponent = iconMap[card.emoji as keyof typeof iconMap] || Sparkles;
              
              return (
                <motion.div
                  key={index}
                  className="group relative"
                  variants={animations.fadeInUp}
                  custom={index + 4}
                >
                  <div className="relative p-8 bg-gradient-to-br from-white/8 to-white/12 backdrop-blur-md border border-white/15 rounded-2xl hover:border-amber-500/30 transition-all duration-300 overflow-hidden">
                    {/* Efeito de brilho no hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.8 }}
                    />

                    <div className="relative z-10">
                      {/* Ícone */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                          <IconComponent className="w-8 h-8 text-amber-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                          {card.title}
                        </h3>
                      </div>
                      
                      {/* Descrição */}
                      <p className="text-white/70 leading-relaxed">
                        {card.description}
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

          {/* CTA Button */}
          <motion.div
            variants={animations.fadeInUp}
            custom={7}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href={ctaLink}
              className="inline-block px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xl rounded-2xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-2xl shadow-amber-500/30 backdrop-blur-sm relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {ctaText}
                <Sparkles className="w-5 h-5" />
              </span>
              <motion.span
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%', opacity: 0 }}
                whileHover={{ x: '100%', opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <motion.span
                className="absolute bottom-0 left-0 w-full h-1 bg-white/40"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ImpactSection; 
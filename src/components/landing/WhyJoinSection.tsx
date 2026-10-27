'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FC } from 'react';
import { fadeInUp, staggerContainer, getReducedMotionVariants } from '@/lib/animations';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { LucideIcon, Sparkles, Zap, DollarSign, Globe, Shield } from 'lucide-react';

export interface WhyJoinSectionProps {
  title: string;
  subtitle: string;
  features: Array<{
    icon: string | LucideIcon;
    title: string;
    description: string;
  }>;
}

const WhyJoinSection: FC<WhyJoinSectionProps> = ({ title, subtitle, features }) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const animations = prefersReducedMotion ? getReducedMotionVariants() : {
    fadeInUp,
    staggerContainer
  };

  // Mapeamento de ícones
  const iconMap = {
    '🔗': Zap,
    '💰': DollarSign,
    '🌐': Globe,
    '🔒': Shield
  };

  return (
    <section id="why-join" className="relative py-20 md:py-32 bg-gradient-to-br from-black via-slate-900 to-black overflow-hidden">
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 1.2 }}
      >
        {/* Gradiente base dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-black" />
        
        {/* Efeito de luz superior com cores vibrantes */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/6 via-orange-500/3 to-transparent" />
        
        {/* Efeito de luz inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/5 via-amber-500/2 to-transparent" />
        
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
            { left: '20%', top: '30%', size: 4, delay: 0, color: 'from-amber-400 to-orange-500' },
            { left: '75%', top: '25%', size: 6, delay: 1.5, color: 'from-orange-500 to-amber-400' },
            { left: '35%', top: '75%', size: 3, delay: 3, color: 'from-amber-400 to-orange-600' },
            { left: '65%', top: '85%', size: 5, delay: 4.5, color: 'from-orange-600 to-amber-500' },
            { left: '45%', top: '50%', size: 7, delay: 6, color: 'from-amber-500 to-orange-400' },
            { left: '25%', top: '70%', size: 4, delay: 7.5, color: 'from-orange-400 to-amber-600' },
            { left: '80%', top: '40%', size: 5, delay: 9, color: 'from-amber-600 to-orange-500' },
            { left: '15%', top: '60%', size: 6, delay: 10.5, color: 'from-orange-500 to-amber-400' }
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
                y: [0, -20 - (i % 2) * 8, 0],
                opacity: [0.5, 0.8, 0.5],
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
        <div className="absolute inset-0 opacity-[0.025]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_#fbbf24_1px,_transparent_1px)] bg-[length:80px_80px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_#f59e0b_1px,_transparent_1px)] bg-[length:100px_100px]" />
        </div>
        
        {/* Efeito de profundidade dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-transparent" />
        
        {/* Linhas de energia sutis */}
        <div className="absolute inset-0 opacity-12">
          <motion.div
            className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
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
            className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
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
            <span className="text-sm font-medium text-amber-400">Por que Participar</span>
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
            className="text-xl md:text-2xl lg:text-3xl text-white/70 max-w-4xl mx-auto leading-relaxed"
            variants={animations.fadeInUp}
            custom={2}
          >
            {subtitle}
          </motion.p>

          {/* Linha decorativa */}
          <motion.div
            className="w-32 h-1 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full mx-auto mt-8"
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
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={animations.staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
        >
          {features.map((feature, index) => {
            const IconComponent = typeof feature.icon === 'string' 
              ? iconMap[feature.icon as keyof typeof iconMap] || Zap
              : feature.icon;
            
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
                        {typeof feature.icon === 'string' ? (
                          <IconComponent className="w-8 h-8 text-amber-400" />
                        ) : (
                          <feature.icon className="w-8 h-8 text-amber-400" />
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                        {feature.title}
                      </h3>
                    </div>
                    
                    {/* Descrição */}
                    <p className="text-white/70 leading-relaxed">
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

      {/* Scroll indicator redesenhado */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{
          opacity: isInView ? 1 : 0,
          y: isInView ? 0 : 30
        }}
        transition={{
          duration: 1,
          delay: 1,
          ease: [0.25, 0.1, 0.25, 1]
        }}
      >
        <a
          href="#impact"
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

export default WhyJoinSection; 
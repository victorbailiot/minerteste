'use client';

import { FC, useEffect } from 'react';
import { motion, Variants, useReducedMotion, useAnimation } from 'framer-motion';
import { FeatureItem } from '@/types/landing';
import { ANIMATION_DURATION } from '@/lib/animations';
import { useInViewAnimation } from '@/lib/hooks/useInViewAnimation';

interface FeatureCardProps extends FeatureItem {
  index?: number;
  className?: string;
}

/**
 * Componente FeatureCard - Card de recurso reutilizável com ícone, título e descrição
 * 
 * Este componente é usado na seção WhyCopperSection para exibir os recursos/benefícios
 * com animações de entrada baseadas em scroll e efeitos de hover para feedback interativo.
 */
const FeatureCard: FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  index = 0,
  className = ''
}) => {
  // Verificar preferência de movimento reduzido
  const prefersReducedMotion = useReducedMotion();
  
  // Usar o hook personalizado para animações baseadas em scroll
  const { ref: cardRef, controls: cardControls, isInView: isCardInView } = useInViewAnimation<HTMLDivElement>({
    threshold: 0.3,
    margin: "-10% 0px -10% 0px",
    delay: 0.1 + (index * 0.1),
    duration: ANIMATION_DURATION * 0.75
  });
  
  // Controles de animação para elementos internos
  const iconControls = useAnimation();
  const titleControls = useAnimation();
  const descriptionControls = useAnimation();
  
  // Variantes de animação para o card
  const cardVariants: Variants = {
    initial: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : 40,
      scale: prefersReducedMotion ? 1 : 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: ANIMATION_DURATION * 0.75,
        ease: "easeOut",
        delay: 0.1 + (index * 0.1)
      }
    },
    hover: {
      y: prefersReducedMotion ? 0 : -5,
      scale: prefersReducedMotion ? 1 : 1.02,
      boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.15)",
      borderColor: "rgba(245, 158, 11, 0.3)",
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // Variantes de animação para o ícone
  const iconVariants: Variants = {
    initial: { 
      opacity: 0, 
      scale: prefersReducedMotion ? 1 : 0.8,
      rotate: prefersReducedMotion ? 0 : -10
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      rotate: 0,
      transition: {
        duration: ANIMATION_DURATION * 0.6,
        delay: 0.2 + (index * 0.1),
        ease: "easeOut"
      }
    },
    hover: {
      scale: prefersReducedMotion ? 1 : 1.1,
      rotate: prefersReducedMotion ? 0 : 5,
      color: "#f59e0b", // Amber-500
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // Variantes de animação para o título
  const titleVariants: Variants = {
    initial: { 
      opacity: 0,
      y: prefersReducedMotion ? 0 : 10
    },
    animate: { 
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATION * 0.6,
        delay: 0.3 + (index * 0.1),
        ease: "easeOut"
      }
    },
    hover: {
      color: "#f59e0b", // Amber-500
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // Variantes de animação para a descrição
  const descriptionVariants: Variants = {
    initial: { 
      opacity: 0,
      y: prefersReducedMotion ? 0 : 10
    },
    animate: { 
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATION * 0.6,
        delay: 0.4 + (index * 0.1),
        ease: "easeOut"
      }
    }
  };
  
  // Efeito para acionar animações quando o card entra na viewport
  useEffect(() => {
    if (isCardInView) {
      // Inicia a animação do card com um pequeno atraso baseado no índice
      // para criar um efeito escalonado
      const delay = index * 0.1;
      
      // Anima o ícone com um pequeno atraso adicional
      iconControls.start({
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
          duration: ANIMATION_DURATION * 0.6,
          delay: delay + 0.1,
          ease: "easeOut"
        }
      });
      
      // Anima o título com um pequeno atraso adicional
      titleControls.start({
        opacity: 1,
        y: 0,
        transition: {
          duration: ANIMATION_DURATION * 0.6,
          delay: delay + 0.2,
          ease: "easeOut"
        }
      });
      
      // Anima a descrição com um pequeno atraso adicional
      descriptionControls.start({
        opacity: 1,
        y: 0,
        transition: {
          duration: ANIMATION_DURATION * 0.6,
          delay: delay + 0.3,
          ease: "easeOut"
        }
      });
    }
  }, [isCardInView, index, iconControls, titleControls, descriptionControls]);

  return (
    <motion.div
      ref={cardRef}
      className={`relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 transition-all duration-300 
        hover:border-amber-500/30 hover:bg-white/10 hover:shadow-lg hover:shadow-amber-500/5 
        focus-within:border-amber-500/30 focus-within:ring-2 focus-within:ring-amber-500/20
        ${className}`}
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 40, scale: prefersReducedMotion ? 1 : 0.95 }}
      animate={cardControls}
      whileHover="hover"
      variants={cardVariants}
      tabIndex={0} // Torna o card focável para acessibilidade
      aria-labelledby={`feature-title-${index}`}
    >
      {/* Ícone com animação */}
      <motion.div 
        className="mb-4 text-amber-500"
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.8, rotate: prefersReducedMotion ? 0 : -10 }}
        animate={iconControls}
        variants={iconVariants}
        whileHover="hover"
      >
        <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
      </motion.div>
      
      {/* Título com animação */}
      <motion.h3 
        id={`feature-title-${index}`}
        className="text-xl font-semibold text-white mb-3"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
        animate={titleControls}
        variants={titleVariants}
        whileHover="hover"
      >
        {title}
      </motion.h3>
      
      {/* Descrição com animação */}
      <motion.p 
        className="text-white/70"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
        animate={descriptionControls}
        variants={descriptionVariants}
      >
        {description}
      </motion.p>
      
      {/* Efeito de brilho no hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-orange-600/5 rounded-lg opacity-0"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />
      
      {/* Indicador de foco para acessibilidade */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        initial={{ opacity: 0 }}
        whileFocus={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />
    </motion.div>
  );
};

export default FeatureCard;
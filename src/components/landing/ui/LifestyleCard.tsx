'use client';

import { FC, useEffect } from 'react';
import { motion, Variants, useReducedMotion, useAnimation } from 'framer-motion';
import { LifestyleItem } from '@/types/landing';
import { ANIMATION_DURATION } from '@/lib/animations';
import { useInViewAnimation } from '@/lib/hooks/useInViewAnimation';

interface LifestyleCardProps extends LifestyleItem {
  index?: number;
  className?: string;
}

/**
 * Componente LifestyleCard - Card de estilo de vida reutilizável com emoji, título e descrição
 * 
 * Este componente é usado na seção PartnerSection para exibir os benefícios do estilo de vida
 * com animações de entrada baseadas em scroll e efeitos de hover para feedback interativo.
 */
const LifestyleCard: FC<LifestyleCardProps> = ({
  emoji,
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
  const emojiControls = useAnimation();
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
      y: prefersReducedMotion ? 0 : -8,
      scale: prefersReducedMotion ? 1 : 1.03,
      boxShadow: "0 20px 40px -10px rgba(245, 158, 11, 0.2)",
      borderColor: "rgba(245, 158, 11, 0.4)",
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // Variantes de animação para o emoji
  const emojiVariants: Variants = {
    initial: { 
      opacity: 0, 
      scale: prefersReducedMotion ? 1 : 0.7,
      rotate: prefersReducedMotion ? 0 : -15
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
      scale: prefersReducedMotion ? 1 : 1.2,
      rotate: prefersReducedMotion ? 0 : 10,
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
      y: prefersReducedMotion ? 0 : 15
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
      y: prefersReducedMotion ? 0 : 15
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
      
      // Anima o emoji com um pequeno atraso adicional
      emojiControls.start({
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
  }, [isCardInView, index, emojiControls, titleControls, descriptionControls]);

  return (
    <motion.div
      ref={cardRef}
      className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/15 rounded-xl p-8 transition-all duration-300 
        hover:border-amber-500/40 hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 hover:shadow-xl hover:shadow-amber-500/10 
        focus-within:border-amber-500/40 focus-within:ring-2 focus-within:ring-amber-500/20
        ${className}`}
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 40, scale: prefersReducedMotion ? 1 : 0.95 }}
      animate={cardControls}
      whileHover="hover"
      variants={cardVariants}
      tabIndex={0} // Torna o card focável para acessibilidade
      aria-labelledby={`lifestyle-title-${index}`}
    >
      {/* Emoji com animação */}
      <motion.div 
        className="mb-6 text-center"
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.7, rotate: prefersReducedMotion ? 0 : -15 }}
        animate={emojiControls}
        variants={emojiVariants}
        whileHover="hover"
      >
        <span 
          className="text-5xl md:text-6xl block leading-none"
          role="img" 
          aria-hidden="true"
        >
          {emoji}
        </span>
      </motion.div>
      
      {/* Título com animação */}
      <motion.h3 
        id={`lifestyle-title-${index}`}
        className="text-xl md:text-2xl font-bold text-white mb-4 text-center"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 15 }}
        animate={titleControls}
        variants={titleVariants}
        whileHover="hover"
      >
        {title}
      </motion.h3>
      
      {/* Descrição com animação */}
      <motion.p 
        className="text-white/80 text-center leading-relaxed"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 15 }}
        animate={descriptionControls}
        variants={descriptionVariants}
      >
        {description}
      </motion.p>
      
      {/* Efeito de brilho no hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-orange-600/10 rounded-xl opacity-0"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />
      
      {/* Indicador de foco para acessibilidade */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none border-2 border-amber-500/50 opacity-0"
        initial={{ opacity: 0 }}
        whileFocus={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />
      
      {/* Decoração adicional - pontos brilhantes */}
      <motion.div
        className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-500/30"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 + (index * 0.1), duration: 0.5 }}
        whileHover={{ scale: 1.5, opacity: 0.8 }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-orange-500/20"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 + (index * 0.1), duration: 0.5 }}
        whileHover={{ scale: 1.5, opacity: 0.6 }}
        aria-hidden="true"
      />
    </motion.div>
  );
};

export default LifestyleCard;
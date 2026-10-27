import { Variants, Easing } from 'framer-motion';

// Constantes de animação
export const ANIMATION_DURATION = 0.8;
export const STAGGER_DELAY = 0.2;
export const ANIMATION_EASE = "easeOut"; // Curva de easing suave

// Variantes de animação para fade in de baixo para cima
export const fadeInUp: Variants = {
  initial: { 
    opacity: 0, 
    y: 60 
  },
  animate: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION,
      ease: ANIMATION_EASE,
      delay: delay * STAGGER_DELAY
    }
  }),
  exit: { 
    opacity: 0, 
    y: 20,
    transition: {
      duration: ANIMATION_DURATION / 2
    }
  }
};

// Variantes para animação de cards
export const cardAnimation: Variants = {
  initial: { 
    opacity: 0, 
    y: 40,
    scale: 0.95
  },
  animate: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATION,
      ease: ANIMATION_EASE,
      delay: delay * STAGGER_DELAY
    }
  }),
  hover: {
    y: -5,
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: ANIMATION_EASE
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: ANIMATION_DURATION / 2
    }
  }
};

// Container para animações escalonadas
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: STAGGER_DELAY
    }
  }
};

// Animação de fade in simples
export const fadeIn: Variants = {
  initial: { 
    opacity: 0 
  },
  animate: (delay: number = 0) => ({
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION,
      ease: ANIMATION_EASE,
      delay: delay * STAGGER_DELAY
    }
  }),
  exit: { 
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION / 2
    }
  }
};

// Animação para texto com gradiente
export const gradientTextAnimation: Variants = {
  initial: { 
    opacity: 0,
    backgroundPosition: '0% 50%'
  },
  animate: (delay: number = 0) => ({
    opacity: 1,
    backgroundPosition: '100% 50%',
    transition: {
      opacity: {
        duration: ANIMATION_DURATION,
        ease: ANIMATION_EASE,
        delay: delay * STAGGER_DELAY
      },
      backgroundPosition: {
        duration: 5,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'reverse'
      }
    }
  })
};

// Utilitário para detectar preferência de movimento reduzido
export const shouldReduceMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Animações alternativas para preferência de movimento reduzido
export const getReducedMotionVariants = (): {
  fadeInUp: Variants;
  cardAnimation: Variants;
  staggerContainer: Variants;
  fadeIn: Variants;
  gradientTextAnimation: Variants;
} => {
  return {
    fadeInUp: {
      initial: { opacity: 0 },
      animate: (delay: number = 0) => ({
        opacity: 1,
        transition: { delay: delay * STAGGER_DELAY / 2, duration: ANIMATION_DURATION / 2 }
      }),
      exit: { opacity: 0 }
    },
    cardAnimation: {
      initial: { opacity: 0 },
      animate: (delay: number = 0) => ({
        opacity: 1,
        transition: { delay: delay * STAGGER_DELAY / 2, duration: ANIMATION_DURATION / 2 }
      }),
      hover: {},
      exit: { opacity: 0 }
    },
    staggerContainer: {
      initial: {},
      animate: {
        transition: {
          staggerChildren: STAGGER_DELAY / 2
        }
      }
    },
    fadeIn: {
      initial: { opacity: 0 },
      animate: (delay: number = 0) => ({
        opacity: 1,
        transition: { delay: delay * STAGGER_DELAY / 2, duration: ANIMATION_DURATION / 2 }
      }),
      exit: { opacity: 0 }
    },
    gradientTextAnimation: {
      initial: { opacity: 0 },
      animate: (delay: number = 0) => ({
        opacity: 1,
        transition: { delay: delay * STAGGER_DELAY / 2, duration: ANIMATION_DURATION / 2 }
      }),
      exit: { opacity: 0 }
    }
  };
};
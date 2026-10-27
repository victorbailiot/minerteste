import { useRef, useEffect, MutableRefObject } from 'react';
import { useInView, useAnimation } from 'framer-motion';

interface UseInViewAnimationOptions {
  threshold?: number;
  margin?: string;
  once?: boolean;
  delay?: number;
  duration?: number;
}

/**
 * Hook personalizado para animar elementos quando entram na viewport
 * 
 * @param options Opções de configuração para a animação
 * @returns Um objeto com a referência do elemento e os controles de animação
 */
export function useInViewAnimation<T extends HTMLElement = HTMLDivElement>(options: UseInViewAnimationOptions = {}) {
  const {
    threshold = 0.2,
    margin = "-10% 0px -10% 0px",
    once = true,
    delay = 0,
    duration = 0.8
  } = options;
  
  const ref = useRef<T>(null);
  const controls = useAnimation();
  
  const isInView = useInView(ref, {
    once,
    margin: margin as any,
    amount: threshold
  });
  
  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration,
          delay,
          ease: "easeOut"
        }
      });
    }
  }, [isInView, controls, delay, duration]);
  
  return { ref, controls, isInView };
}

/**
 * Hook personalizado para animar elementos em sequência quando entram na viewport
 * 
 * @param count Número de elementos a serem animados
 * @param options Opções de configuração para a animação
 * @returns Um objeto com referência do container e controles de animação
 */
export function useStaggeredInViewAnimation<T extends HTMLElement = HTMLDivElement>(
  count: number,
  options: UseInViewAnimationOptions & { staggerDelay?: number } = {}
): { containerRef: MutableRefObject<T | null>, containerControls: ReturnType<typeof useAnimation>, isInView: boolean } {
  const {
    threshold = 0.2,
    margin = "-10% 0px -10% 0px",
    once = true,
    delay = 0,
    staggerDelay = 0.1
  } = options;
  
  const containerRef = useRef<T>(null);
  const containerControls = useAnimation();
  
  const isInView = useInView(containerRef, {
    once,
    margin: margin as any,
    amount: threshold
  });
  
  useEffect(() => {
    if (isInView) {
      containerControls.start("animate");
    }
  }, [isInView, containerControls]);
  
  return { containerRef, containerControls, isInView };
}
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface ParallaxBackgroundProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  imageUrl?: string;
  overlay?: ReactNode;
}

const ParallaxBackground = ({
  children,
  className = '',
  speed = 0.5,
  imageUrl,
  overlay,
}: ParallaxBackgroundProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Mantém a imagem sempre cobrindo o container (evita "faixas brancas" ao rolar)
  // Movimento centrado: começa negativo e termina positivo.
  const range = Math.max(0, Math.min(40, speed * 30)); // clamp para evitar exageros
  const y = useTransform(scrollYProgress, [0, 1], [`${-range}%`, `${range}%`]);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-slate-950 ${className}`}>
      {imageUrl && (
        <motion.div
          style={{ y }}
          className="absolute inset-0 z-0 pointer-events-none will-change-transform"
        >
          <div
            className="absolute -top-[20%] left-0 h-[140%] w-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        </motion.div>
      )}
      {overlay && (
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <div className="h-full w-full">{overlay}</div>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default ParallaxBackground;
